from io import StringIO
import sys
from typing import Any
import uuid

from fastapi import APIRouter, Header, Query
import geopandas as gpd
import numpy as np
import pandas as pd
from pydantic import BaseModel

from petalab.config import config
from petalab.core.io_vector import default_style_for_geom, load_working_layer, save_working_layer
from petalab.db.repo import repo, slugify
from petalab.errors import PetaLabError
from petalab.jobs.context import JobContext
from petalab.jobs.manager import job_manager
from petalab.ml.cv import assign_spatial_blocks
from petalab.ml.features import audit_features_and_target, build_spatial_features
from petalab.ml.predict import export_model_notebook, predict_with_model
from petalab.ml.trainers import train_spatial_model

router = APIRouter()


class FeatureBuildReq(BaseModel):
    project_id: str = "banjir-surabaya"
    layer_id: str
    specs: list[dict[str, Any]]


class FeatureAuditReq(BaseModel):
    project_id: str = "banjir-surabaya"
    layer_id: str
    target_column: str | None = None
    feature_columns: list[str]
    task: str = "regression"


class CVPreviewReq(BaseModel):
    project_id: str = "banjir-surabaya"
    layer_id: str
    block_size_m: float = 2500.0
    n_splits: int = 5


class TrainModelReq(BaseModel):
    project_id: str = "banjir-surabaya"
    params: dict[str, Any]


class PredictModelReq(BaseModel):
    project_id: str = "banjir-surabaya"
    target_layer_id: str
    output_name: str | None = None


class PythonConsoleReq(BaseModel):
    project_id: str = "banjir-surabaya"
    code: str


@router.post("/api/models/features/build")
def api_build_spatial_features(req: FeatureBuildReq) -> dict[str, Any]:
    return build_spatial_features(req.project_id, req.layer_id, req.specs, save_to_layer=True)


@router.post("/api/models/features/audit")
def api_audit_features(req: FeatureAuditReq) -> dict[str, Any]:
    pdir = repo.get_project_dir(req.project_id)
    meta = repo.get_layer(req.project_id, req.layer_id)
    df = load_working_layer(pdir / meta["path"])
    return audit_features_and_target(df, req.target_column, req.feature_columns, task=req.task)


@router.post("/api/models/cv_preview")
def api_preview_spatial_cv(req: CVPreviewReq) -> dict[str, Any]:
    pdir = repo.get_project_dir(req.project_id)
    meta = repo.get_layer(req.project_id, req.layer_id)
    gdf = load_working_layer(pdir / meta["path"])
    _, fold_ids, preview_geojson = assign_spatial_blocks(
        gdf, block_size_m=req.block_size_m, n_splits=req.n_splits
    )
    unique_folds, counts = np.unique(fold_ids + 1, return_counts=True)
    fold_summary = [{"fold": int(f), "count": int(c)} for f, c in zip(unique_folds, counts)]
    return {"geojson": preview_geojson, "fold_summary": fold_summary}


@router.post("/api/models/train")
def api_train_model(req: TrainModelReq) -> dict[str, Any]:
    model_name = req.params.get("model_name") or f"Model_{req.params.get('task', 'regression')}"

    def _runner(ctx: JobContext) -> Any:
        return train_spatial_model(req.params, ctx)

    job = job_manager.submit_job(
        project_id=req.project_id,
        tool_id="ml.train",
        tool_name=f"Training Model ({model_name})",
        params=req.params,
        runner_fn=_runner,
    )
    return {"job_id": job["id"], "job": job}


@router.get("/api/models")
def api_list_models(project_id: str = Query("banjir-surabaya")) -> list[dict[str, Any]]:
    return repo.list_models(project_id)


@router.get("/api/models/{mid}")
def api_get_model(mid: str, project_id: str = Query("banjir-surabaya")) -> dict[str, Any]:
    return repo.get_model(project_id, mid)


@router.post("/api/models/{mid}/predict")
def api_predict_model(mid: str, req: PredictModelReq) -> dict[str, Any]:
    model_info = repo.get_model(req.project_id, mid)

    def _runner(ctx: JobContext) -> Any:
        return predict_with_model(mid, req.target_layer_id, req.output_name, ctx)

    job = job_manager.submit_job(
        project_id=req.project_id,
        tool_id="ml.predict",
        tool_name=f"Prediksi dengan {model_info['name']}",
        params={"model_id": mid, "target_layer_id": req.target_layer_id},
        runner_fn=_runner,
    )
    return {"job_id": job["id"], "job": job}


@router.get("/api/models/{mid}/notebook")
def api_export_notebook(mid: str, project_id: str = Query("banjir-surabaya")) -> dict[str, Any]:
    return export_model_notebook(project_id, mid)


@router.post("/api/python/console")
def api_run_python_console(
    req: PythonConsoleReq,
    x_petalab_token: str | None = Header(default=None, alias="X-PetaLab-Token"),
) -> dict[str, Any]:
    """
    Advanced Mode Python Console bridge (guarded by local session token):
    Pre-populates `layers` dict (mapping layer name -> GeoDataFrame/DataFrame),
    `gpd`, `pd`, `np`, and `save_layer(gdf, "nama_layer")`.
    """
    if not x_petalab_token or x_petalab_token != config.session_token:
        raise PetaLabError(
            "UNAUTHORIZED_CONSOLE",
            message="Akses Konsol Python ditolak karena token sesi lokal tidak cocok.",
            hint="Buka PetaLab langsung dari browser lokal (http://127.0.0.1:8765) lalu muat ulang halaman (F5).",
            status_code=403,
        )
    pdir = repo.get_project_dir(req.project_id)
    layers_dict: dict[str, Any] = {}
    for lmeta in repo.list_layers(req.project_id):
        if lmeta["kind"] in ("vector", "table"):
            try:
                layers_dict[lmeta["name"]] = load_working_layer(pdir / lmeta["path"])
            except Exception:
                pass

    created_layers: list[dict[str, Any]] = []

    def save_layer(gdf: gpd.GeoDataFrame, name: str) -> dict[str, Any]:
        rel_path = f"layers/{slugify(name)}_{uuid.uuid4().hex[:5]}.parquet"
        meta = save_working_layer(gdf, pdir / rel_path)
        style = default_style_for_geom(meta["geom_type"], len(repo.list_layers(req.project_id)))
        saved = repo.add_layer(req.project_id, {
            "name": name,
            "path": rel_path,
            **meta,
            "style": style,
            "lineage": {"tool": "python_console", "tool_name": "Konsol Python (Mode Lanjut)"},
        })
        created_layers.append(saved)
        return saved

    stdout_buf = StringIO()
    old_stdout = sys.stdout
    env = {
        "layers": layers_dict,
        "save_layer": save_layer,
        "gpd": gpd,
        "pd": pd,
        "np": np,
    }
    try:
        sys.stdout = stdout_buf
        exec(req.code, env)
        output = stdout_buf.getvalue()
        return {"ok": True, "output": output or "Eksekusi selesai tanpa output teks.", "created_layers": created_layers}
    except Exception as e:
        return {"ok": False, "output": stdout_buf.getvalue(), "error": str(e), "created_layers": created_layers}
    finally:
        sys.stdout = old_stdout
