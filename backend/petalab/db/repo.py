from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import sqlite3
import uuid
from typing import Any

from petalab.config import config

SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", text.strip().lower()).strip("-")
    return slug or f"proyek-{uuid.uuid4().hex[:6]}"


class ProjectRepository:
    """Manages projects and per-project SQLite database (`petalab.db` in WAL mode)."""

    def __init__(self, workspace_dir: Path | None = None):
        self.workspace_dir = workspace_dir or config.workspace_dir
        self.projects_root = self.workspace_dir / "projects"
        self.projects_root.mkdir(parents=True, exist_ok=True)

    def get_project_dir(self, project_id: str) -> Path:
        pdir = config.safe_resolve(project_id, self.projects_root)
        if not pdir.exists():
            raise FileNotFoundError(f"Proyek '{project_id}' tidak ditemukan.")
        return pdir

    def _connect(self, project_id: str) -> sqlite3.Connection:
        pdir = self.get_project_dir(project_id)
        db_path = pdir / "petalab.db"
        conn = sqlite3.connect(str(db_path), timeout=30.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        return conn

    def _init_db(self, project_id: str) -> None:
        schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
        with self._connect(project_id) as conn:
            conn.executescript(schema_sql)
            conn.commit()

    def list_projects(self) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        if not self.projects_root.exists():
            return results
        for pdir in sorted(self.projects_root.iterdir()):
            if not pdir.is_dir():
                continue
            pjson = pdir / "project.json"
            if not pjson.exists():
                continue
            try:
                meta = json.loads(pjson.read_text(encoding="utf-8"))
                # Calculate size & layer count
                total_bytes = sum(f.stat().st_size for f in pdir.rglob("*") if f.is_file())
                layer_count = 0
                model_count = 0
                db_file = pdir / "petalab.db"
                if db_file.exists():
                    with self._connect(pdir.name) as conn:
                        row = conn.execute("SELECT COUNT(*) AS c FROM layers WHERE deleted_at IS NULL").fetchone()
                        layer_count = row["c"] if row else 0
                        mrow = conn.execute("SELECT COUNT(*) AS c FROM models").fetchone()
                        model_count = mrow["c"] if mrow else 0
                meta["id"] = pdir.name
                meta["size_bytes"] = total_bytes
                meta["layer_count"] = layer_count
                meta["model_count"] = model_count
                results.append(meta)
            except Exception:
                continue
        results.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return results

    def create_project(
        self,
        name: str,
        description: str = "",
        basemap: str = "osm_standard",
        center: list[float] | None = None,
        zoom: float = 12.0,
        project_id: str | None = None,
    ) -> dict[str, Any]:
        pid = project_id or slugify(name)
        pdir = self.projects_root / pid
        if pdir.exists() and project_id is None:
            pid = f"{pid}-{uuid.uuid4().hex[:4]}"
            pdir = self.projects_root / pid

        for sub in ["sources", "layers", "models", "exports", ".autosave"]:
            (pdir / sub).mkdir(parents=True, exist_ok=True)

        now = utc_now_iso()
        meta = {
            "id": pid,
            "name": name,
            "description": description,
            "basemap": basemap,
            "view": {"center": center or [112.7521, -7.2575], "zoom": zoom},
            "layer_order": [],
            "created_at": now,
            "updated_at": now,
        }
        pjson = pdir / "project.json"
        pjson.write_text(json.dumps(meta, indent=2), encoding="utf-8")
        self._init_db(pid)
        meta["size_bytes"] = 0
        meta["layer_count"] = 0
        meta["model_count"] = 0
        return meta

    def get_project(self, project_id: str) -> dict[str, Any]:
        pdir = self.get_project_dir(project_id)
        pjson = pdir / "project.json"
        meta = json.loads(pjson.read_text(encoding="utf-8"))
        meta["id"] = project_id
        meta["layers"] = self.list_layers(project_id)
        return meta

    def update_project(self, project_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        pdir = self.get_project_dir(project_id)
        pjson = pdir / "project.json"
        meta = json.loads(pjson.read_text(encoding="utf-8"))
        for k in ["name", "description", "basemap", "view", "layer_order", "dashboard_widgets"]:
            if k in updates:
                meta[k] = updates[k]
        meta["updated_at"] = utc_now_iso()
        tmp = pjson.with_suffix(".tmp")
        tmp.write_text(json.dumps(meta, indent=2), encoding="utf-8")
        os.replace(tmp, pjson)
        # Also write autosave snapshot
        autosave_file = pdir / ".autosave" / "latest_state.json"
        autosave_file.write_text(json.dumps(meta, indent=2), encoding="utf-8")
        return meta

    def delete_project(self, project_id: str) -> None:
        pdir = self.get_project_dir(project_id)
        shutil.rmtree(pdir, ignore_errors=True)

    # --- LAYERS ---
    def add_layer(self, project_id: str, layer_data: dict[str, Any]) -> dict[str, Any]:
        lid = layer_data.get("id") or f"lyr_{uuid.uuid4().hex[:10]}"
        now = utc_now_iso()
        record = {
            "id": lid,
            "name": layer_data["name"],
            "kind": layer_data["kind"],
            "geom_type": layer_data.get("geom_type"),
            "crs": layer_data.get("crs", "EPSG:4326"),
            "path": layer_data["path"],
            "source_path": layer_data.get("source_path", ""),
            "feature_count": int(layer_data.get("feature_count", 0)),
            "bbox": json.dumps(layer_data.get("bbox")),
            "schema_json": json.dumps(layer_data.get("schema", [])),
            "style_json": json.dumps(layer_data.get("style", {})),
            "lineage_json": json.dumps(layer_data.get("lineage", {})),
            "created_at": now,
            "updated_at": now,
            "deleted_at": None,
        }
        with self._connect(project_id) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO layers
                (id, name, kind, geom_type, crs, path, source_path, feature_count,
                 bbox, schema_json, style_json, lineage_json, created_at, updated_at, deleted_at)
                VALUES (:id, :name, :kind, :geom_type, :crs, :path, :source_path, :feature_count,
                        :bbox, :schema_json, :style_json, :lineage_json, :created_at, :updated_at, :deleted_at)
                """,
                record,
            )
            conn.commit()

        # Update layer order in project.json
        pdir = self.get_project_dir(project_id)
        pjson = pdir / "project.json"
        if pjson.exists():
            meta = json.loads(pjson.read_text(encoding="utf-8"))
            order = meta.get("layer_order", [])
            if lid not in order:
                order.insert(0, lid)
            meta["layer_order"] = order
            meta["updated_at"] = now
            pjson.write_text(json.dumps(meta, indent=2), encoding="utf-8")

        return self.get_layer(project_id, lid)

    def _row_to_layer(self, row: sqlite3.Row, project_id: str) -> dict[str, Any]:
        d = dict(row)
        d["project_id"] = project_id
        d["bbox"] = json.loads(d["bbox"]) if d.get("bbox") else None
        d["schema"] = json.loads(d.pop("schema_json", "[]") or "[]")
        d["style"] = json.loads(d.pop("style_json", "{}") or "{}")
        d["lineage"] = json.loads(d.pop("lineage_json", "{}") or "{}")
        pdir = self.get_project_dir(project_id)
        fpath = pdir / d["path"]
        d["size_bytes"] = fpath.stat().st_size if fpath.exists() else 0
        return d

    def list_layers(self, project_id: str, include_deleted: bool = False) -> list[dict[str, Any]]:
        with self._connect(project_id) as conn:
            if include_deleted:
                rows = conn.execute("SELECT * FROM layers ORDER BY created_at DESC").fetchall()
            else:
                rows = conn.execute("SELECT * FROM layers WHERE deleted_at IS NULL ORDER BY created_at DESC").fetchall()
        return [self._row_to_layer(r, project_id) for r in rows]

    def get_layer(self, project_id: str, layer_id: str) -> dict[str, Any]:
        with self._connect(project_id) as conn:
            row = conn.execute("SELECT * FROM layers WHERE id = ?", (layer_id,)).fetchone()
        if not row:
            raise FileNotFoundError(f"Layer '{layer_id}' tidak ditemukan.")
        return self._row_to_layer(row, project_id)

    def find_layer_across_projects(self, layer_id: str) -> tuple[str, dict[str, Any]]:
        for p in self.list_projects():
            pid = p["id"]
            try:
                lyr = self.get_layer(pid, layer_id)
                return pid, lyr
            except FileNotFoundError:
                continue
        raise FileNotFoundError(f"Layer '{layer_id}' tidak ditemukan di proyek mana pun.")

    def update_layer(self, project_id: str, layer_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        current = self.get_layer(project_id, layer_id)
        now = utc_now_iso()
        name = updates.get("name", current["name"])
        crs = updates.get("crs", current["crs"])
        feature_count = updates.get("feature_count", current["feature_count"])
        bbox = json.dumps(updates.get("bbox", current["bbox"]))
        schema_json = json.dumps(updates.get("schema", current["schema"]))
        style_json = json.dumps(updates.get("style", current["style"]))
        lineage_json = json.dumps(updates.get("lineage", current["lineage"]))
        deleted_at = updates.get("deleted_at", current.get("deleted_at"))

        with self._connect(project_id) as conn:
            conn.execute(
                """
                UPDATE layers
                SET name=?, crs=?, feature_count=?, bbox=?, schema_json=?, style_json=?,
                    lineage_json=?, updated_at=?, deleted_at=?
                WHERE id=?
                """,
                (name, crs, feature_count, bbox, schema_json, style_json, lineage_json, now, deleted_at, layer_id),
            )
            conn.commit()
        return self.get_layer(project_id, layer_id)

    def soft_delete_layer(self, project_id: str, layer_id: str) -> dict[str, Any]:
        return self.update_layer(project_id, layer_id, {"deleted_at": utc_now_iso()})

    def restore_layer(self, project_id: str, layer_id: str) -> dict[str, Any]:
        return self.update_layer(project_id, layer_id, {"deleted_at": None})

    # --- SELECTIONS ---
    def save_selection(
        self, project_id: str, layer_id: str, name: str, fids: list[int], rule: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        sid = f"sel_{uuid.uuid4().hex[:8]}"
        now = utc_now_iso()
        with self._connect(project_id) as conn:
            conn.execute(
                "INSERT INTO selections (id, layer_id, name, fids_json, rule_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (sid, layer_id, name, json.dumps(fids), json.dumps(rule or {}), now),
            )
            conn.commit()
        return {"id": sid, "layer_id": layer_id, "name": name, "fids": fids, "count": len(fids), "rule": rule or {}, "created_at": now}

    def list_selections(self, project_id: str, layer_id: str | None = None) -> list[dict[str, Any]]:
        with self._connect(project_id) as conn:
            if layer_id:
                rows = conn.execute("SELECT * FROM selections WHERE layer_id=? ORDER BY created_at DESC", (layer_id,)).fetchall()
            else:
                rows = conn.execute("SELECT * FROM selections ORDER BY created_at DESC").fetchall()
        out = []
        for r in rows:
            fids = json.loads(r["fids_json"] or "[]")
            out.append({
                "id": r["id"],
                "layer_id": r["layer_id"],
                "name": r["name"],
                "fids": fids,
                "count": len(fids),
                "rule": json.loads(r["rule_json"] or "{}"),
                "created_at": r["created_at"],
            })
        return out

    # --- HISTORY & UNDO ---
    def add_history(
        self,
        project_id: str,
        action: str,
        title: str,
        target_id: str = "",
        payload: dict[str, Any] | None = None,
        undo: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        now = utc_now_iso()
        with self._connect(project_id) as conn:
            cur = conn.execute(
                "INSERT INTO history (action, title, target_id, payload_json, undo_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (action, title, target_id, json.dumps(payload or {}), json.dumps(undo or {}), now),
            )
            hid = cur.lastrowid
            conn.commit()
        return {
            "id": hid,
            "action": action,
            "title": title,
            "target_id": target_id,
            "payload": payload or {},
            "undo": undo or {},
            "created_at": now,
        }

    def list_history(self, project_id: str, limit: int = 100) -> list[dict[str, Any]]:
        with self._connect(project_id) as conn:
            rows = conn.execute("SELECT * FROM history ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [
            {
                "id": r["id"],
                "action": r["action"],
                "title": r["title"],
                "target_id": r["target_id"],
                "payload": json.loads(r["payload_json"] or "{}"),
                "undo": json.loads(r["undo_json"] or "{}"),
                "created_at": r["created_at"],
            }
            for r in rows
        ]

    def undo_history(self, project_id: str, history_id: int) -> dict[str, Any]:
        with self._connect(project_id) as conn:
            row = conn.execute("SELECT * FROM history WHERE id = ?", (history_id,)).fetchone()
        if not row:
            raise FileNotFoundError(f"Riwayat #{history_id} tidak ditemukan.")
        undo_data = json.loads(row["undo_json"] or "{}")
        undo_type = undo_data.get("type")
        if undo_type == "delete_layer" and undo_data.get("layer_id"):
            self.soft_delete_layer(project_id, undo_data["layer_id"])
        elif undo_type == "restore_layer" and undo_data.get("layer_id"):
            self.restore_layer(project_id, undo_data["layer_id"])
        elif undo_type == "restore_style" and undo_data.get("layer_id"):
            self.update_layer(project_id, undo_data["layer_id"], {"style": undo_data.get("previous_style", {})})
        return {"undone_id": history_id, "undo_type": undo_type, "target_id": row["target_id"]}

    # --- JOBS ---
    def save_job(self, project_id: str, job_data: dict[str, Any]) -> None:
        with self._connect(project_id) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO jobs
                (id, project_id, tool_id, params_json, status, progress, message,
                 outputs_json, logs_json, error_user, error_detail, started_at, finished_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job_data["id"],
                    project_id,
                    job_data["tool_id"],
                    json.dumps(job_data.get("params", {})),
                    job_data["status"],
                    float(job_data.get("progress", 0.0)),
                    job_data.get("message", ""),
                    json.dumps(job_data.get("outputs", {})),
                    json.dumps(job_data.get("logs", [])),
                    job_data.get("error_user"),
                    job_data.get("error_detail"),
                    job_data.get("started_at"),
                    job_data.get("finished_at"),
                ),
            )
            conn.commit()

    def list_jobs(self, project_id: str, limit: int = 50) -> list[dict[str, Any]]:
        with self._connect(project_id) as conn:
            rows = conn.execute("SELECT * FROM jobs ORDER BY started_at DESC LIMIT ?", (limit,)).fetchall()
        return [
            {
                "id": r["id"],
                "project_id": r["project_id"],
                "tool_id": r["tool_id"],
                "params": json.loads(r["params_json"] or "{}"),
                "status": r["status"],
                "progress": r["progress"],
                "message": r["message"],
                "outputs": json.loads(r["outputs_json"] or "{}"),
                "logs": json.loads(r["logs_json"] or "[]"),
                "error_user": r["error_user"],
                "error_detail": r["error_detail"],
                "started_at": r["started_at"],
                "finished_at": r["finished_at"],
            }
            for r in rows
        ]

    # --- MODELS ---
    def save_model(self, project_id: str, model_data: dict[str, Any]) -> dict[str, Any]:
        mid = model_data.get("id") or f"mdl_{uuid.uuid4().hex[:8]}"
        now = utc_now_iso()
        with self._connect(project_id) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO models
                (id, name, task, algorithm, path, card_json, metrics_json, train_layer_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    mid,
                    model_data["name"],
                    model_data["task"],
                    model_data["algorithm"],
                    model_data["path"],
                    json.dumps(model_data.get("card", {})),
                    json.dumps(model_data.get("metrics", {})),
                    model_data.get("train_layer_id"),
                    now,
                ),
            )
            conn.commit()
        return self.get_model(project_id, mid)

    def list_models(self, project_id: str) -> list[dict[str, Any]]:
        with self._connect(project_id) as conn:
            rows = conn.execute("SELECT * FROM models ORDER BY created_at DESC").fetchall()
        return [
            {
                "id": r["id"],
                "project_id": project_id,
                "name": r["name"],
                "task": r["task"],
                "algorithm": r["algorithm"],
                "path": r["path"],
                "card": json.loads(r["card_json"] or "{}"),
                "metrics": json.loads(r["metrics_json"] or "{}"),
                "train_layer_id": r["train_layer_id"],
                "created_at": r["created_at"],
            }
            for r in rows
        ]

    def get_model(self, project_id: str, model_id: str) -> dict[str, Any]:
        with self._connect(project_id) as conn:
            r = conn.execute("SELECT * FROM models WHERE id = ?", (model_id,)).fetchone()
        if not r:
            raise FileNotFoundError(f"Model '{model_id}' tidak ditemukan.")
        return {
            "id": r["id"],
            "project_id": project_id,
            "name": r["name"],
            "task": r["task"],
            "algorithm": r["algorithm"],
            "path": r["path"],
            "card": json.loads(r["card_json"] or "{}"),
            "metrics": json.loads(r["metrics_json"] or "{}"),
            "train_layer_id": r["train_layer_id"],
            "created_at": r["created_at"],
        }


repo = ProjectRepository()
