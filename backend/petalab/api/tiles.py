import json
from typing import Any

from fastapi import APIRouter, Query, Response
from shapely.geometry import box

from petalab.core.io_raster import load_raster_dataset, render_raster_tile_png, tile_xyz_to_lonlat_bbox
from petalab.core.io_vector import load_working_layer
from petalab.db.repo import repo

router = APIRouter()


@router.get("/tiles/raster/{lid}/{z}/{x}/{y}.png")
def api_get_raster_tile(
    lid: str,
    z: int,
    x: int,
    y: int,
    cmap: str = Query("terrain"),
    vmin: float | None = Query(None),
    vmax: float | None = Query(None),
    band: int = Query(1),
    project_id: str | None = Query(None),
) -> Response:
    pid, meta = (project_id, repo.get_layer(project_id, lid)) if project_id else repo.find_layer_across_projects(lid)
    pdir = repo.get_project_dir(pid)
    ds = load_raster_dataset(pdir / meta["path"])

    style = meta.get("style", {})
    use_cmap = "hillshade" if style.get("hillshade") else (cmap or style.get("cmap", "terrain"))
    use_vmin = vmin if vmin is not None else style.get("vmin")
    use_vmax = vmax if vmax is not None else style.get("vmax")
    use_band = band or int(style.get("band", 1))

    png_bytes = render_raster_tile_png(
        ds,
        z=z,
        x=x,
        y=y,
        cmap_name=use_cmap,
        vmin=use_vmin,
        vmax=use_vmax,
        band=use_band,
    )
    return Response(content=png_bytes, media_type="image/png", headers={"Cache-Control": "no-cache"})


@router.get("/tiles/{lid}/{z}/{x}/{y}.json")
def api_get_vector_tile_json(
    lid: str,
    z: int,
    x: int,
    y: int,
    project_id: str | None = Query(None),
) -> dict[str, Any]:
    """Clips and simplifies vector features for a given XYZ tile bounding box."""
    pid, meta = (project_id, repo.get_layer(project_id, lid)) if project_id else repo.find_layer_across_projects(lid)
    pdir = repo.get_project_dir(pid)
    gdf = load_working_layer(pdir / meta["path"])
    wgs = gdf.to_crs("EPSG:4326") if gdf.crs else gdf

    tbbox = tile_xyz_to_lonlat_bbox(z, x, y)
    tile_poly = box(*tbbox)
    sub = wgs[wgs.geometry.intersects(tile_poly)].copy()
    if z < 13 and not sub.empty:
        tol = 0.001 / max(1, (z - 5))
        sub["geometry"] = sub.geometry.simplify(tol, preserve_topology=True)
    return json.loads(sub.to_json())
