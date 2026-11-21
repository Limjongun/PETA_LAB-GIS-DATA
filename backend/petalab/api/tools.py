import json
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from petalab.jobs.context import JobContext
from petalab.jobs.manager import job_manager
from petalab.tools._base import get_tool, load_all_tools

router = APIRouter()


class RunToolReq(BaseModel):
    project_id: str = "banjir-surabaya"
    params: dict[str, Any]
    selected_fids_by_layer: dict[str, list[int]] | None = None


@router.get("/api/tools")
def api_list_tools() -> list[dict[str, Any]]:
    registry = load_all_tools()
    return [tool.to_schema_dict() for tool in registry.values()]


@router.post("/api/tools/{tool_id}/python")
def api_tool_to_python(tool_id: str, req: RunToolReq) -> dict[str, str]:
    tool = get_tool(tool_id)
    parsed = tool.Params.model_validate(req.params)
    return {"code": tool.to_python(parsed)}


@router.post("/api/tools/{tool_id}/preview")
def api_preview_tool(tool_id: str, req: RunToolReq) -> dict[str, Any]:
    tool = get_tool(tool_id)
    parsed = tool.Params.model_validate(req.params)
    ctx = JobContext(
        job_id="preview",
        project_id=req.project_id,
        tool_id=tool.id,
        tool_name=tool.name,
        params=req.params,
        selected_fids_by_layer=req.selected_fids_by_layer,
        preview_mode=True,
        preview_limit=250,
    )
    res = tool.run(parsed, ctx)
    preview_geojson = None
    if ctx.preview_gdf is not None and not ctx.preview_gdf.empty:
        wgs = ctx.preview_gdf.to_crs("EPSG:4326") if ctx.preview_gdf.crs else ctx.preview_gdf
        preview_geojson = json.loads(wgs.head(250).to_json())
    return {
        "preview": res,
        "geojson": preview_geojson,
        "python_code": tool.to_python(parsed),
    }


@router.post("/api/tools/{tool_id}/run")
def api_run_tool(tool_id: str, req: RunToolReq) -> dict[str, Any]:
    tool = get_tool(tool_id)
    parsed = tool.Params.model_validate(req.params)

    def _runner(ctx: JobContext) -> Any:
        return tool.run(parsed, ctx)

    job = job_manager.submit_job(
        project_id=req.project_id,
        tool_id=tool.id,
        tool_name=tool.name,
        params=req.params,
        runner_fn=_runner,
        selected_fids_by_layer=req.selected_fids_by_layer,
    )
    return {"job_id": job["id"], "job": job, "python_code": tool.to_python(parsed)}
