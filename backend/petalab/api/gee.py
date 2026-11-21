"""
REST API Endpoints for PetaLab × Google Earth Engine ("Katalog Bumi", §4 & §6).
Endpoints:
- GET  /api/gee/status
- POST /api/gee/auth
- POST /api/gee/test
- POST /api/gee/disconnect
- POST /api/gee/cache/clear
- GET  /api/gee/catalog
- POST /api/gee/estimate
- POST /api/gee/preview
- GET  /api/gee/tiles/{preset_id}/{z}/{x}/{y}.png
- POST /api/gee/fetch
"""

from typing import Any

from fastapi import APIRouter, Query, Response
from pydantic import BaseModel

from petalab.core.gee import auth, catalog, errors, estimate, fetch
from petalab.db.repo import repo
from petalab.errors import PetaLabError
from petalab.jobs.context import JobContext
from petalab.jobs.manager import job_manager

router = APIRouter()


class GeeAuthReq(BaseModel):
    project_id: str
    auth_mode: str = "oauth"  # oauth | service_account
    email: str | None = None
    service_account_json: dict[str, Any] | str | None = None


class GeeTestReq(BaseModel):
    project_id: str | None = None


class GeeEstimateReq(BaseModel):
    project_id: str = "banjir-surabaya"
    preset_id: str = "gee.ndvi"
    layer_id: str | None = None
    bbox: list[float] | None = None
    scale: int | None = None
    cmap: str | None = None
    tanggal_mulai: str = "2026-06-01"
    tanggal_akhir: str = "2026-08-31"
    buang_awan: bool = True
    batas_awan: int = 40


class GeeFetchReq(BaseModel):
    project_id: str = "banjir-surabaya"
    preset_id: str = "gee.ndvi"
    layer_id: str | None = None
    bbox: list[float] | None = None
    scale: int | None = None
    tanggal_mulai: str = "2026-06-01"
    tanggal_akhir: str = "2026-08-31"
    buang_awan: bool = True
    batas_awan: int = 40
    output_name: str | None = None
    custom_dataset_id: str | None = None
    custom_expr: str | None = None


def _resolve_request_bbox(project_id: str, layer_id: str | None, bbox: list[float] | None) -> list[float]:
    if bbox and len(bbox) == 4:
        return [float(x) for x in bbox]
    if layer_id:
        try:
            lmeta = repo.get_layer(project_id, layer_id)
            if lmeta.get("bbox"):
                return [float(x) for x in lmeta["bbox"]]
        except Exception:
            pass
    try:
        layers = repo.list_layers(project_id)
        for lyr in layers:
            if lyr.get("bbox"):
                return [float(x) for x in lyr["bbox"]]
    except Exception:
        pass
    return [112.595, -7.355, 112.818, -7.202]


@router.get("/api/gee/status")
def api_gee_status() -> dict[str, Any]:
    return auth.get_status()


@router.post("/api/gee/auth")
def api_gee_auth(req: GeeAuthReq) -> dict[str, Any]:
    return auth.connect_account(
        project_id=req.project_id,
        auth_mode=req.auth_mode,
        email=req.email,
        service_account_json=req.service_account_json,
    )


@router.post("/api/gee/test")
def api_gee_test(req: GeeTestReq) -> dict[str, Any]:
    return auth.test_connection(project_id=req.project_id)


@router.post("/api/gee/disconnect")
def api_gee_disconnect() -> dict[str, Any]:
    return auth.disconnect_account()


@router.post("/api/gee/cache/clear")
def api_gee_clear_cache() -> dict[str, Any]:
    return auth.clear_gee_cache()


@router.get("/api/gee/catalog")
def api_gee_catalog(
    q: str | None = Query(None),
    include_advanced: bool = Query(True),
) -> list[dict[str, Any]]:
    return catalog.list_catalog_presets(search_query=q, include_advanced=include_advanced)


@router.post("/api/gee/estimate")
def api_gee_estimate(req: GeeEstimateReq) -> dict[str, Any]:
    preset = catalog.get_preset(req.preset_id)
    bbox = _resolve_request_bbox(req.project_id, req.layer_id, req.bbox)
    scale = req.scale or preset["native_scale_m"]

    plan = estimate.plan_download(
        bbox=bbox,
        scale=scale,
        n_bands=preset["n_bands"],
        dtype=preset["dtype"],
        native_scale=preset["native_scale_m"],
        strict_scale=False,
    )
    scene_info = fetch.estimate_scene_count(
        req.preset_id,
        tanggal_mulai=req.tanggal_mulai,
        tanggal_akhir=req.tanggal_akhir,
        batas_awan=req.batas_awan,
    )
    return {
        "preset": preset,
        "bbox": bbox,
        "plan": plan.to_dict(),
        "scenes": scene_info,
    }


@router.post("/api/gee/preview")
def api_gee_preview(req: GeeEstimateReq) -> dict[str, Any]:
    preset = catalog.get_preset(req.preset_id)
    bbox = _resolve_request_bbox(req.project_id, req.layer_id, req.bbox)
    scale = req.scale or preset["native_scale_m"]
    plan = estimate.plan_download(
        bbox=bbox,
        scale=scale,
        n_bands=preset["n_bands"],
        dtype=preset["dtype"],
        native_scale=preset["native_scale_m"],
        strict_scale=False,
    )
    scene_info = fetch.estimate_scene_count(
        req.preset_id,
        tanggal_mulai=req.tanggal_mulai,
        tanggal_akhir=req.tanggal_akhir,
        batas_awan=req.batas_awan,
    )
    use_cmap = req.cmap or preset["default_cmap"]
    bbox_str = ",".join(f"{x:.5f}" for x in bbox)
    tile_url = (
        f"/api/gee/tiles/{req.preset_id}/{{z}}/{{x}}/{{y}}.png"
        f"?bbox={bbox_str}&cmap={use_cmap}&d0={req.tanggal_mulai}&d1={req.tanggal_akhir}"
    )
    live_mode = False
    live_ready, _ = auth.has_live_ee_ready()
    if live_ready:
        try:
            from petalab.core.gee import builder
            live_url, live_scenes = builder.get_live_ee_map_tile_url(
                preset_id=req.preset_id,
                bbox=bbox,
                cmap=use_cmap,
                tanggal_mulai=req.tanggal_mulai,
                tanggal_akhir=req.tanggal_akhir,
                buang_awan=req.buang_awan,
                batas_awan=req.batas_awan,
            )
            tile_url = live_url
            scene_info["n_scenes"] = live_scenes
            scene_info["summary"] = f"Live Google Earth Engine: ditemukan {live_scenes} citra dalam rentang ini."
            live_mode = True
        except Exception:
            pass

    return {
        "preset": preset,
        "bbox": bbox,
        "tile_url": tile_url,
        "live_ee": live_mode,
        "plan": plan.to_dict(),
        "scenes": scene_info,
    }


@router.get("/api/gee/tiles/{preset_id}/{z}/{x}/{y}.png")
def api_gee_preview_tile(
    preset_id: str,
    z: int,
    x: int,
    y: int,
    bbox: str | None = Query(None),
    cmap: str | None = Query(None),
    vmin: float | None = Query(None),
    vmax: float | None = Query(None),
    d0: str | None = Query(None),
    d1: str | None = Query(None),
) -> Response:
    parsed_bbox = None
    if bbox:
        try:
            parts = [float(v) for v in bbox.split(",")]
            if len(parts) == 4:
                parsed_bbox = parts
        except Exception:
            parsed_bbox = None

    png_bytes = fetch.render_preview_tile(
        preset_id=preset_id,
        z=z,
        x=x,
        y=y,
        bbox=parsed_bbox,
        cmap=cmap,
        vmin=vmin,
        vmax=vmax,
        tanggal_mulai=d0,
        tanggal_akhir=d1,
    )
    return Response(content=png_bytes, media_type="image/png")


@router.post("/api/gee/fetch")
def api_gee_fetch(req: GeeFetchReq) -> dict[str, Any]:
    auth.ensure_initialized()
    preset = catalog.get_preset(req.preset_id)
    bbox = _resolve_request_bbox(req.project_id, req.layer_id, req.bbox)
    scale = req.scale or preset["native_scale_m"]

    if scale < preset["native_scale_m"]:
        raise PetaLabError(
            "GEE_SCALE_TOO_FINE",
            message=f"Data ini aslinya {preset['native_scale_m']} meter. Meminta {scale} meter tidak menambah detail, hanya memperbesar ukuran file.",
            actions=[{"label": f"Pakai {preset['native_scale_m']} meter", "action": "use_native_scale", "value": preset["native_scale_m"]}],
        )

    def _runner(ctx: JobContext) -> Any:
        return fetch.fetch_gee_preset_to_layer(
            preset_id=req.preset_id,
            bbox=bbox,
            scale=scale,
            ctx=ctx,
            tanggal_mulai=req.tanggal_mulai,
            tanggal_akhir=req.tanggal_akhir,
            buang_awan=req.buang_awan,
            batas_awan=req.batas_awan,
            output_name=req.output_name,
            custom_dataset_id=req.custom_dataset_id,
            custom_expr=req.custom_expr,
        )

    job = job_manager.submit_job(
        project_id=req.project_id,
        tool_id=req.preset_id,
        tool_name=f"Katalog Bumi: {preset['name']}",
        params=req.model_dump(),
        runner_fn=_runner,
    )
    return {"job_id": job["id"], "job": job}
