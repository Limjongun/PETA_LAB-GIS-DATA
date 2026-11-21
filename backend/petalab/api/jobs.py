import asyncio
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from petalab.db.repo import repo
from petalab.jobs.manager import job_manager

router = APIRouter()


@router.get("/api/jobs")
def api_list_jobs(project_id: str = Query("banjir-surabaya")) -> list[dict[str, Any]]:
    db_jobs = repo.list_jobs(project_id)
    by_id = {j["id"]: j for j in db_jobs}
    for jid, active in job_manager.active_jobs.items():
        if active.get("project_id") == project_id:
            by_id[jid] = active
    return sorted(by_id.values(), key=lambda x: x.get("started_at") or "", reverse=True)


@router.get("/api/jobs/{jid}")
def api_get_job(jid: str, project_id: str | None = Query(None)) -> dict[str, Any]:
    return job_manager.get_job(jid, project_id=project_id)


@router.post("/api/jobs/{jid}/cancel")
def api_cancel_job(jid: str) -> dict[str, Any]:
    return job_manager.cancel_job(jid)


@router.websocket("/ws/jobs")
async def ws_jobs_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    job_manager.set_event_loop(asyncio.get_running_loop())
    queue = job_manager.subscribe_ws()
    try:
        while True:
            event = await queue.get()
            await websocket.send_json(event)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        job_manager.unsubscribe_ws(queue)
