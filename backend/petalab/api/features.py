from typing import Any
import uuid

from fastapi import APIRouter, Query
import pandas as pd
from pydantic import BaseModel

from petalab.core.duck import (
    calculate_field,
    group_by_layer,
    preview_or_apply_join,
    query_table_page,
    suggest_join_columns,
)
from petalab.core.io_vector import default_style_for_geom, load_working_layer, save_working_layer
from petalab.core.stats import compute_layer_dashboard_stats
from petalab.db.repo import repo, slugify

router = APIRouter()


class FieldCalcReq(BaseModel):
    target_column: str
    mode: str = "template"  # template | sql
    template: str | None = "area_km2"
    param_col_a: str | None = None
    param_col_b: str | None = None
    sql_expr: str | None = None
    preview_only: bool = False
    save_as_new_layer: bool = False
    output_name: str | None = None


class CellEditReq(BaseModel):
    fid: int
    column: str
    value: Any


class JoinSuggestReq(BaseModel):
    project_id: str = "banjir-surabaya"
    left_layer_id: str
    right_layer_id: str


class JoinReq(BaseModel):
    project_id: str = "banjir-surabaya"
    left_layer_id: str
    right_layer_id: str
    left_key: str
    right_key: str
    normalize_text: bool = True
    manual_mapping: dict[str, str] | None = None
    preview_only: bool = True
    output_name: str | None = None


class GroupByReq(BaseModel):
    group_column: str
    agg_column: str
    agg_func: str = "sum"
    dissolve_geometry: bool = True
    output_name: str | None = None


@router.get("/api/layers/{lid}/features")
def api_get_layer_features(
    lid: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=2000),
    sort: str | None = Query(None),
    desc: bool = Query(False),
    filter: str | None = Query(None),
    fids: str | None = Query(None),
    project_id: str | None = Query(None),
) -> dict[str, Any]:
    pid, meta = (project_id, repo.get_layer(project_id, lid)) if project_id else repo.find_layer_across_projects(lid)
    if meta["kind"] == "raster":
        return {"total": len(meta.get("schema", [])), "filtered": len(meta.get("schema", [])), "offset": 0, "limit": limit, "rows": meta.get("schema", [])}

    pdir = repo.get_project_dir(pid)
    only_fids = [int(x) for x in fids.split(",") if x.strip().isdigit()] if fids else None
    return query_table_page(
        pdir / meta["path"],
        offset=offset,
        limit=limit,
        sort_col=sort,
        sort_desc=desc,
        search=filter,
        only_fids=only_fids,
    )


@router.get("/api/layers/{lid}/stats")
def api_get_layer_stats(
    lid: str,
    fids: str | None = Query(None),
    column: str | None = Query(None),
    cat_col: str | None = Query(None),
    scatter_x: str | None = Query(None),
    scatter_y: str | None = Query(None),
    label_col: str | None = Query(None),
    project_id: str | None = Query(None),
) -> dict[str, Any]:
    pid, meta = (project_id, repo.get_layer(project_id, lid)) if project_id else repo.find_layer_across_projects(lid)
    if meta["kind"] == "raster":
        return {
            "kpi": {
                "feature_count": meta.get("feature_count", 1),
                "selected_count": 0,
                "area_km2": 0,
                "length_km": 0,
                "column_count": len(meta.get("schema", [])),
                "missing_pct": 0,
                "invalid_geom_count": 0,
            },
            "raster_meta": meta.get("raster_meta", {}),
            "numeric_columns": [],
            "string_columns": [],
            "histogram": {"column": None, "bins": [], "counts_all": [], "counts_selected": [], "stats": {}},
            "top_n": [],
            "pie": {"column": None, "data": []},
            "scatter": {"x_col": None, "y_col": None, "points": [], "r": 0, "trendline": []},
            "quality": {"columns": [], "invalid_geometries": 0, "duplicate_rows": 0},
            "top_rows": [],
        }

    pdir = repo.get_project_dir(pid)
    sel_fids = [int(x) for x in fids.split(",") if x.strip().isdigit()] if fids else None
    return compute_layer_dashboard_stats(
        pdir / meta["path"],
        selected_fids=sel_fids,
        num_col=column,
        cat_col=cat_col,
        scatter_x=scatter_x,
        scatter_y=scatter_y,
        top_n_label_col=label_col,
    )


@router.post("/api/layers/{lid}/calculate")
def api_calculate_field(lid: str, req: FieldCalcReq, project_id: str | None = Query(None)) -> dict[str, Any]:
    pid, meta = (project_id, repo.get_layer(project_id, lid)) if project_id else repo.find_layer_across_projects(lid)
    pdir = repo.get_project_dir(pid)
    fpath = pdir / meta["path"]

    res = calculate_field(
        fpath,
        target_column=req.target_column,
        mode=req.mode,
        template=req.template,
        param_col_a=req.param_col_a,
        param_col_b=req.param_col_b,
        sql_expr=req.sql_expr,
        preview_only=req.preview_only,
    )
    if req.preview_only:
        return {"preview_rows": res["preview_rows"], "target_column": req.target_column}

    gdf = res["result_gdf"]
    if req.save_as_new_layer:
        out_name = req.output_name or f"{meta['name']}_{req.target_column}"
        rel_path = f"layers/{slugify(out_name)}_{uuid.uuid4().hex[:5]}.parquet"
        new_meta = save_working_layer(gdf, pdir / rel_path)
        saved = repo.add_layer(pid, {
            "name": out_name,
            "path": rel_path,
            **new_meta,
            "style": meta.get("style", {}),
            "lineage": {"tool": "field_calculator", "tool_name": "Kalkulator Kolom", "column": req.target_column},
        })
        return {"layer": saved, "preview_rows": res["preview_rows"]}

    updated_meta = save_working_layer(gdf, fpath)
    updated_layer = repo.update_layer(pid, lid, {"schema": updated_meta["schema"]})
    repo.add_history(
        pid,
        action="calculate",
        title=f"Kalkulator Kolom: +{req.target_column} di {meta['name']}",
        target_id=lid,
        payload={"column": req.target_column, "mode": req.mode},
    )
    return {"layer": updated_layer, "preview_rows": res["preview_rows"]}


@router.post("/api/layers/{lid}/edit_cell")
def api_edit_cell(lid: str, req: CellEditReq, project_id: str | None = Query(None)) -> dict[str, Any]:
    pid, meta = (project_id, repo.get_layer(project_id, lid)) if project_id else repo.find_layer_across_projects(lid)
    pdir = repo.get_project_dir(pid)
    fpath = pdir / meta["path"]
    df = load_working_layer(fpath)
    mask = df["_fid"] == req.fid
    if mask.any() and req.column in df.columns:
        val = req.value
        if pd.api.types.is_numeric_dtype(df[req.column]):
            val = float(val) if "." in str(val) else int(val)
        df.loc[mask, req.column] = val
        save_working_layer(df, fpath)
    return {"ok": True, "fid": req.fid, "column": req.column, "value": req.value}


@router.post("/api/join/suggest")
def api_suggest_join(req: JoinSuggestReq) -> dict[str, Any]:
    pdir = repo.get_project_dir(req.project_id)
    l_meta = repo.get_layer(req.project_id, req.left_layer_id)
    r_meta = repo.get_layer(req.project_id, req.right_layer_id)
    l_df = load_working_layer(pdir / l_meta["path"])
    r_df = load_working_layer(pdir / r_meta["path"])
    return suggest_join_columns(l_df, r_df)


@router.post("/api/join")
def api_run_join(req: JoinReq) -> dict[str, Any]:
    pdir = repo.get_project_dir(req.project_id)
    l_meta = repo.get_layer(req.project_id, req.left_layer_id)
    r_meta = repo.get_layer(req.project_id, req.right_layer_id)

    res = preview_or_apply_join(
        pdir / l_meta["path"],
        pdir / r_meta["path"],
        left_key=req.left_key,
        right_key=req.right_key,
        normalize_text=req.normalize_text,
        manual_mapping=req.manual_mapping,
        preview_only=req.preview_only,
    )
    if req.preview_only:
        return res

    merged_gdf = res.pop("merged_gdf")
    out_name = req.output_name or f"{l_meta['name']}_join_{r_meta['name']}"
    rel_path = f"layers/{slugify(out_name)}_{uuid.uuid4().hex[:5]}.parquet"
    new_meta = save_working_layer(merged_gdf, pdir / rel_path)
    style = default_style_for_geom(new_meta["geom_type"], len(repo.list_layers(req.project_id)))

    saved = repo.add_layer(req.project_id, {
        "name": out_name,
        "path": rel_path,
        **new_meta,
        "style": style,
        "lineage": {
            "tool": "table_join",
            "tool_name": "Join Tabel",
            "inputs": [l_meta["name"], r_meta["name"]],
            "left_key": req.left_key,
            "right_key": req.right_key,
            "matched": f"{res['matched_count']}/{res['total_left']}",
        },
    })
    repo.add_history(
        req.project_id,
        action="join",
        title=f"Join Tabel: {l_meta['name']} + {r_meta['name']} → {out_name}",
        target_id=saved["id"],
        undo={"type": "delete_layer", "layer_id": saved["id"]},
    )
    res["layer"] = saved
    return res


@router.post("/api/layers/{lid}/groupby")
def api_group_by_layer(lid: str, req: GroupByReq, project_id: str | None = Query(None)) -> dict[str, Any]:
    pid, meta = (project_id, repo.get_layer(project_id, lid)) if project_id else repo.find_layer_across_projects(lid)
    pdir = repo.get_project_dir(pid)
    grouped = group_by_layer(
        pdir / meta["path"],
        group_col=req.group_column,
        agg_col=req.agg_column,
        agg_func=req.agg_func,
        dissolve_geometry=req.dissolve_geometry,
    )
    out_name = req.output_name or f"{meta['name']}_ringkas_{req.group_column}"
    rel_path = f"layers/{slugify(out_name)}_{uuid.uuid4().hex[:5]}.parquet"
    new_meta = save_working_layer(grouped, pdir / rel_path)
    style = default_style_for_geom(new_meta["geom_type"], len(repo.list_layers(pid))) if new_meta["kind"] == "vector" else {}

    saved = repo.add_layer(pid, {
        "name": out_name,
        "path": rel_path,
        **new_meta,
        "style": style,
        "lineage": {
            "tool": "group_by",
            "tool_name": "Ringkas per Kelompok (Group By)",
            "group_column": req.group_column,
            "agg_column": req.agg_column,
            "agg_func": req.agg_func,
        },
    })
    return saved
