import asyncio
from concurrent.futures import ThreadPoolExecutor
import traceback
from typing import Any, Callable
import uuid

from petalab.config import config
from petalab.db.repo import repo, utc_now_iso
from petalab.errors import PetaLabError
from petalab.jobs.context import JobCancelledError, JobContext


class JobManager:
    """
    Manages asynchronous background jobs with SQLite persistence, worker pool isolation,
    cancellation tokens, and real-time WebSocket progress streaming.
    """

    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=config.max_workers, thread_name_prefix="petalab_worker")
        self.active_jobs: dict[str, dict[str, Any]] = {}
        self.active_contexts: dict[str, JobContext] = {}
        self.ws_subscribers: set[asyncio.Queue] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    def set_event_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def subscribe_ws(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self.ws_subscribers.add(q)
        return q

    def unsubscribe_ws(self, q: asyncio.Queue) -> None:
        self.ws_subscribers.discard(q)

    def _broadcast(self, event: dict[str, Any]) -> None:
        if not self.ws_subscribers:
            return
        for q in list(self.ws_subscribers):
            try:
                if self._loop and self._loop.is_running():
                    self._loop.call_soon_threadsafe(q.put_nowait, event)
                else:
                    q.put_nowait(event)
            except Exception:
                pass

    def submit_job(
        self,
        project_id: str,
        tool_id: str,
        tool_name: str,
        params: dict[str, Any],
        runner_fn: Callable[[JobContext], Any],
        selected_fids_by_layer: dict[str, list[int]] | None = None,
    ) -> dict[str, Any]:
        job_id = f"job_{uuid.uuid4().hex[:10]}"
        now = utc_now_iso()
        job_record: dict[str, Any] = {
            "id": job_id,
            "project_id": project_id,
            "tool_id": tool_id,
            "tool_name": tool_name,
            "params": params,
            "status": "queued",
            "progress": 0.0,
            "message": "Dalam antrean...",
            "outputs": {},
            "logs": [],
            "error_user": None,
            "error_detail": None,
            "started_at": now,
            "finished_at": None,
        }
        self.active_jobs[job_id] = job_record
        repo.save_job(project_id, job_record)
        self._broadcast(job_record)

        def on_ctx_update(update: dict[str, Any]) -> None:
            job_record["status"] = update.get("status", job_record["status"])
            if "progress" in update:
                job_record["progress"] = update["progress"]
            if "message" in update and update["message"]:
                job_record["message"] = update["message"]
            if "logs" in update:
                job_record["logs"] = update["logs"]
            self._broadcast(dict(job_record))

        ctx = JobContext(
            job_id=job_id,
            project_id=project_id,
            tool_id=tool_id,
            tool_name=tool_name,
            params=params,
            selected_fids_by_layer=selected_fids_by_layer,
            on_update=on_ctx_update,
        )
        self.active_contexts[job_id] = ctx

        def _worker() -> None:
            try:
                ctx.progress(5, f"Memulai {tool_name}...")
                result = runner_fn(ctx)
                job_record["status"] = "succeeded"
                job_record["progress"] = 100.0
                job_record["message"] = f"{tool_name} selesai."
                job_record["outputs"] = result if isinstance(result, dict) else {"result": result}
                job_record["logs"] = ctx.logs
                job_record["finished_at"] = utc_now_iso()
            except JobCancelledError as ce:
                job_record["status"] = "cancelled"
                job_record["message"] = str(ce)
                job_record["finished_at"] = utc_now_iso()
            except PetaLabError as pe:
                job_record["status"] = "failed"
                job_record["message"] = pe.message
                job_record["error_user"] = pe.message
                job_record["error_detail"] = pe.detail or traceback.format_exc()
                job_record["finished_at"] = utc_now_iso()
            except Exception as e:
                job_record["status"] = "failed"
                job_record["message"] = f"Proses belum berhasil: {e}"
                job_record["error_user"] = f"Prosesnya belum berhasil dijalankan. Penyebab: {e}"
                job_record["error_detail"] = traceback.format_exc()
                job_record["finished_at"] = utc_now_iso()
            finally:
                try:
                    repo.save_job(project_id, job_record)
                except Exception:
                    pass
                self._broadcast(dict(job_record))
                self.active_contexts.pop(job_id, None)

        self.executor.submit(_worker)
        return job_record

    def get_job(self, job_id: str, project_id: str | None = None) -> dict[str, Any]:
        if job_id in self.active_jobs:
            return self.active_jobs[job_id]
        if project_id:
            for j in repo.list_jobs(project_id):
                if j["id"] == job_id:
                    return j
        for p in repo.list_projects():
            for j in repo.list_jobs(p["id"]):
                if j["id"] == job_id:
                    return j
        raise FileNotFoundError(f"Job '{job_id}' tidak ditemukan.")

    def cancel_job(self, job_id: str) -> dict[str, Any]:
        ctx = self.active_contexts.get(job_id)
        if ctx:
            ctx.cancel()
        if job_id in self.active_jobs:
            self.active_jobs[job_id]["status"] = "cancelled"
            self.active_jobs[job_id]["message"] = "Job dibatalkan oleh pengguna."
            self.active_jobs[job_id]["finished_at"] = utc_now_iso()
            self._broadcast(dict(self.active_jobs[job_id]))
            return self.active_jobs[job_id]
        return {"id": job_id, "status": "cancelled"}


job_manager = JobManager()
