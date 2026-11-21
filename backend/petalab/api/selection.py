from typing import Any
import uuid

from fastapi import APIRouter, Query
import geopandas as gpd
from pydantic import BaseModel
import shapely.geometry

from petalab.core.crs import to_metric_crs
from petalab.core.duck import evaluate_attribute_selection
from petalab.core.io_vector import default_style_for_geom, load_working_layer, save_working_layer
from petalab.db.repo import repo, slugify
from petalab.errors import PetaLabError

router = APIRouter()


class SelectReq(BaseModel):
    mode: str = "attribute"  # geometry | attribute | location | all | invert
    # For mode == 'geometry'
    geometry: dict[str, Any] | None = None
    radius_m: float | None = None
    # For mode == 'attribute'
    rules: list[dict[str, Any]] | None = None
    logic: str = "AND"
    sql_where: str | None = None
    # For mode == 'location'
    reference_layer_id: str | None = None
    reference_fids: list[int] | None = None
    relation: str = "intersects"  # within | intersects | touches | within_distance | disjoint
    distance_m: float = 500.0
    # For mode == 'invert'
    current_fids: list[int] | None = None


class SaveSelectionLayerReq(BaseModel):
    fids: list[int]
    output_name: str


class NamedSelectionReq(BaseModel):
    layer_id: str
    name: str
    fids: list[int]
    rule: dict[str, Any] | None = None


@router.post("/api/layers/{lid}/select")
def api_select_features(lid: str, req: SelectReq, project_id: str | None = Query(None)) -> dict[str, Any]:
    pid, meta = (project_id, repo.get_layer(project_id, lid)) if project_id else repo.find_layer_across_projects(lid)
    pdir = repo.get_project_dir(pid)
    fpath = pdir / meta["path"]

    if req.mode == "attribute":
        fids = evaluate_attribute_selection(fpath, rules=req.rules, logic=req.logic, sql_where=req.sql_where)
        return {"fids": fids, "count": len(fids), "mode": req.mode}

    df = load_working_layer(fpath)
    all_fids = [int(x) for x in df["_fid"].tolist()]

    if req.mode == "all":
        return {"fids": all_fids, "count": len(all_fids), "mode": "all"}

    if req.mode == "invert":
        curr = set(int(x) for x in (req.current_fids or []))
        inv = [f for f in all_fids if f not in curr]
        return {"fids": inv, "count": len(inv), "mode": "invert"}

    if not isinstance(df, gpd.GeoDataFrame):
        raise PetaLabError("NOT_SPATIAL", "Seleksi geometri/lokasi hanya dapat dilakukan pada layer peta vektor.")

    wgs = df.to_crs("EPSG:4326") if df.crs else df

    if req.mode == "geometry" and req.geometry:
        query_geom = shapely.geometry.shape(req.geometry)
        if req.radius_m and req.radius_m > 0:
            gdf_m, _ = to_metric_crs(wgs)
            q_gdf = gpd.GeoDataFrame({"geometry": [query_geom]}, crs="EPSG:4326").to_crs(gdf_m.crs)
            buffered = q_gdf.geometry.iloc[0].buffer(req.radius_m)
            mask = gdf_m.geometry.intersects(buffered)
        else:
            mask = wgs.geometry.intersects(query_geom)
        fids = [int(x) for x in wgs.loc[mask, "_fid"].tolist()]
        return {"fids": fids, "count": len(fids), "mode": "geometry"}

    if req.mode == "location" and req.reference_layer_id:
        ref_meta = repo.get_layer(pid, req.reference_layer_id)
        ref_gdf = load_working_layer(pdir / ref_meta["path"], only_selected_fids=req.reference_fids or None)
        if not isinstance(ref_gdf, gpd.GeoDataFrame) or ref_gdf.empty:
            return {"fids": [], "count": 0, "mode": "location"}

        gdf_m, _ = to_metric_crs(wgs)
        ref_m = ref_gdf.to_crs(gdf_m.crs)
        ref_union = ref_m.geometry.union_all()

        rel = req.relation.lower()
        if rel in ("within", "di_dalam"):
            mask = gdf_m.geometry.within(ref_union)
        elif rel in ("touches", "menyentuh"):
            mask = gdf_m.geometry.touches(ref_union)
        elif rel in ("within_distance", "dalam_jarak"):
            buf = ref_union.buffer(float(req.distance_m))
            mask = gdf_m.geometry.intersects(buf)
        elif rel in ("disjoint", "tidak_bersinggungan"):
            mask = ~gdf_m.geometry.intersects(ref_union)
        else:  # intersects / bersinggungan
            mask = gdf_m.geometry.intersects(ref_union)

        fids = [int(x) for x in gdf_m.loc[mask, "_fid"].tolist()]
        return {"fids": fids, "count": len(fids), "mode": "location"}

    return {"fids": [], "count": 0, "mode": req.mode}


@router.post("/api/layers/{lid}/selection/save_layer")
def api_save_selection_as_layer(
    lid: str, req: SaveSelectionLayerReq, project_id: str | None = Query(None)
) -> dict[str, Any]:
    pid, meta = (project_id, repo.get_layer(project_id, lid)) if project_id else repo.find_layer_across_projects(lid)
    if not req.fids:
        raise PetaLabError("EMPTY_SELECTION", "Pilih minimal 1 fitur sebelum menyimpan sebagai layer baru.")

    pdir = repo.get_project_dir(pid)
    sub = load_working_layer(pdir / meta["path"], only_selected_fids=req.fids)
    rel_path = f"layers/{slugify(req.output_name)}_{uuid.uuid4().hex[:5]}.parquet"
    new_meta = save_working_layer(sub, pdir / rel_path)
    style = default_style_for_geom(new_meta["geom_type"], len(repo.list_layers(pid)))

    saved = repo.add_layer(pid, {
        "name": req.output_name,
        "path": rel_path,
        **new_meta,
        "style": style,
        "lineage": {
            "tool": "save_selection",
            "tool_name": "Simpan Seleksi sebagai Layer Baru",
            "from_layer": meta["name"],
            "feature_count": len(sub),
        },
    })
    repo.add_history(
        pid,
        action="process",
        title=f"Simpan {len(sub)} fitur terpilih → {req.output_name}",
        target_id=saved["id"],
        undo={"type": "delete_layer", "layer_id": saved["id"]},
    )
    return saved


@router.get("/api/projects/{pid}/selections")
def api_list_named_selections(pid: str, layer_id: str | None = Query(None)) -> list[dict[str, Any]]:
    return repo.list_selections(pid, layer_id=layer_id)


@router.post("/api/projects/{pid}/selections")
def api_create_named_selection(pid: str, req: NamedSelectionReq) -> dict[str, Any]:
    return repo.save_selection(pid, req.layer_id, req.name, req.fids, rule=req.rule)
