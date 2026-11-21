from typing import Any
from fastapi import APIRouter, Query
from pydantic import BaseModel

from petalab.config import config
from petalab.core.health import get_system_health
from petalab.core.sample_data import seed_sample_project
from petalab.db.repo import repo

router = APIRouter()


class CreateProjectReq(BaseModel):
    name: str
    description: str = ""
    basemap: str = "osm_standard"
    center: list[float] | None = None
    zoom: float = 12.0


@router.get("/api/health")
def api_health() -> dict[str, Any]:
    return get_system_health()


@router.get("/api/settings")
def api_get_settings() -> dict[str, Any]:
    return config.get_settings()


@router.patch("/api/settings")
def api_update_settings(updates: dict[str, Any]) -> dict[str, Any]:
    return config.update_settings(updates)


@router.get("/api/projects")
def api_list_projects() -> list[dict[str, Any]]:
    projects = repo.list_projects()
    if not projects:
        # Automatically seed the built-in Surabaya sample project on first launch
        seed_sample_project("banjir-surabaya")
        projects = repo.list_projects()
    return projects


@router.post("/api/projects")
def api_create_project(req: CreateProjectReq) -> dict[str, Any]:
    return repo.create_project(
        name=req.name,
        description=req.description,
        basemap=req.basemap,
        center=req.center,
        zoom=req.zoom,
    )


@router.post("/api/projects/sample")
def api_seed_sample_project() -> dict[str, Any]:
    return seed_sample_project("banjir-surabaya")


@router.get("/api/projects/{pid}")
def api_get_project(pid: str) -> dict[str, Any]:
    return repo.get_project(pid)


@router.patch("/api/projects/{pid}")
def api_update_project(pid: str, updates: dict[str, Any]) -> dict[str, Any]:
    return repo.update_project(pid, updates)


@router.delete("/api/projects/{pid}")
def api_delete_project(pid: str) -> dict[str, Any]:
    repo.delete_project(pid)
    return {"deleted": pid}


@router.get("/api/history")
def api_list_history(project_id: str = Query("banjir-surabaya")) -> list[dict[str, Any]]:
    return repo.list_history(project_id)


@router.post("/api/history/{hid}/undo")
def api_undo_history(hid: int, project_id: str = Query("banjir-surabaya")) -> dict[str, Any]:
    return repo.undo_history(project_id, hid)
