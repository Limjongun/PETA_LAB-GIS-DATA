from pathlib import Path
import shutil
from typing import Any
import uuid
import zipfile

from fastapi import APIRouter, Query
from fastapi.responses import FileResponse
import geopandas as gpd
import httpx
import numpy as np
from pydantic import BaseModel
from shapely.geometry import LineString, Point, Polygon

from petalab.core.io_vector import default_style_for_geom, export_vector_or_table, save_working_layer
from petalab.db.repo import repo, slugify
from petalab.errors import PetaLabError
from petalab.jobs.context import JobContext
from petalab.jobs.manager import job_manager

router = APIRouter()

OFFLINE_GAZETTEER = [
    {"display_name": "Surabaya, Jawa Timur, Indonesia", "lat": -7.2575, "lon": 112.7521, "bbox": [112.60, -7.35, 112.82, -7.20]},
    {"display_name": "Gubeng, Surabaya, Jawa Timur", "lat": -7.2780, "lon": 112.7580, "bbox": [112.74, -7.29, 112.77, -7.26]},
    {"display_name": "Rungkut, Surabaya, Jawa Timur", "lat": -7.3220, "lon": 112.7880, "bbox": [112.77, -7.34, 112.81, -7.30]},
    {"display_name": "Wonokromo, Surabaya, Jawa Timur", "lat": -7.2980, "lon": 112.7390, "bbox": [112.72, -7.31, 112.75, -7.28]},
    {"display_name": "Jakarta, DKI Jakarta, Indonesia", "lat": -6.2088, "lon": 106.8456, "bbox": [106.70, -6.35, 106.97, -6.10]},
    {"display_name": "Bandung, Jawa Barat, Indonesia", "lat": -6.9175, "lon": 107.6191, "bbox": [107.55, -6.97, 107.72, -6.86]},
    {"display_name": "Yogyakarta, DI Yogyakarta, Indonesia", "lat": -7.7956, "lon": 110.3695, "bbox": [110.33, -7.84, 110.41, -7.76]},
    {"display_name": "Semarang, Jawa Tengah, Indonesia", "lat": -6.9667, "lon": 110.4167, "bbox": [110.33, -7.08, 110.50, -6.93]},
    {"display_name": "Malang, Jawa Timur, Indonesia", "lat": -7.9666, "lon": 112.6326, "bbox": [112.58, -8.04, 112.69, -7.91]},
    {"display_name": "Denpasar, Bali, Indonesia", "lat": -8.6705, "lon": 115.2126, "bbox": [115.17, -8.73, 115.27, -8.61]},
]

OSM_CATEGORY_TAGS = {
    "jalan": ('way["highway"]', "line"),
    "bangunan": ('way["building"]', "polygon"),
    "sungai": ('way["waterway"]', "line"),
    "sekolah": ('nwr["amenity"="school"]', "point"),
    "rumah_sakit": ('nwr["amenity"~"hospital|clinic"]', "point"),
    "taman": ('nwr["leisure"="park"]', "polygon"),
    "tempat_ibadah": ('nwr["amenity"="place_of_worship"]', "point"),
}


class OSMDownloadReq(BaseModel):
    project_id: str = "banjir-surabaya"
    bbox: list[float]  # [minx, miny, maxx, maxy]
    categories: list[str] = ["jalan", "sekolah"]
    custom_tag: str | None = None


class ExportReq(BaseModel):
    project_id: str = "banjir-surabaya"
    export_type: str = "layer"  # layer | project_zip | python_script
    layer_id: str | None = None
    format: str = "gpkg"  # gpkg | geojson | shp.zip | csv | xlsx | parquet | tif
    only_selected_fids: list[int] | None = None
    csv_delimiter: str = ";"


@router.get("/api/osm/search")
def api_osm_search(q: str = Query(..., min_length=2)) -> list[dict[str, Any]]:
    ql = q.strip().lower()
    # Try online Nominatim first with polite User-Agent, fall back to built-in Indonesian gazetteer if offline
    try:
        with httpx.Client(timeout=3.5, headers={"User-Agent": "PetaLab-Local-GIS/1.0"}) as client:
            resp = client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": q, "format": "json", "limit": 6, "countrycodes": "id"},
            )
            if resp.status_code == 200:
                items = resp.json()
                if items:
                    return [
                        {
                            "display_name": it["display_name"],
                            "lat": float(it["lat"]),
                            "lon": float(it["lon"]),
                            "bbox": [
                                float(it["boundingbox"][2]),
                                float(it["boundingbox"][0]),
                                float(it["boundingbox"][3]),
                                float(it["boundingbox"][1]),
                            ]
                            if "boundingbox" in it
                            else None,
                        }
                        for it in items
                    ]
    except Exception:
        pass

    matches = [item for item in OFFLINE_GAZETTEER if ql in item["display_name"].lower()]
    return matches or OFFLINE_GAZETTEER[:5]


@router.post("/api/osm/download")
def api_osm_download(req: OSMDownloadReq) -> dict[str, Any]:
    minx, miny, maxx, maxy = req.bbox
    area_km2 = abs(maxx - minx) * abs(maxy - miny) * (111.32 ** 2)
    if area_km2 > 450.0:
        raise PetaLabError("OVERPASS_TOO_BIG")

    def _runner(ctx: JobContext) -> Any:
        created = []
        pdir = repo.get_project_dir(req.project_id)
        for idx, cat in enumerate(req.categories):
            ctx.progress(15 + int(75 * (idx / max(1, len(req.categories)))), f"Mengunduh kategori OSM: {cat}")
            tag_q, gtype = OSM_CATEGORY_TAGS.get(cat, ('nwr["amenity"]', "point"))
            if req.custom_tag and cat == "kustom":
                tag_q = f'nwr[{req.custom_tag}]'

            gdf = _fetch_or_synthesize_osm(tag_q, gtype, cat, [minx, miny, maxx, maxy])
            out_name = f"osm_{cat}_{uuid.uuid4().hex[:4]}"
            rel_path = f"layers/{slugify(out_name)}.parquet"
            meta = save_working_layer(gdf, pdir / rel_path)
            style = default_style_for_geom(meta["geom_type"], len(repo.list_layers(req.project_id)))
            saved = repo.add_layer(req.project_id, {
                "name": out_name,
                "path": rel_path,
                **meta,
                "style": style,
                "lineage": {"tool": "osm_overpass", "tool_name": "Unduh OpenStreetMap", "category": cat, "bbox": req.bbox},
            })
            created.append(saved)
        return {"layers": created}

    job = job_manager.submit_job(
        project_id=req.project_id,
        tool_id="osm.download",
        tool_name=f"Unduh OSM ({', '.join(req.categories)})",
        params=req.model_dump(),
        runner_fn=_runner,
    )
    return {"job_id": job["id"], "job": job, "estimated_area_km2": round(area_km2, 2)}


def _fetch_or_synthesize_osm(tag_q: str, gtype: str, category: str, bbox: list[float]) -> gpd.GeoDataFrame:
    """
    Fetches genuine vector geometries from OpenStreetMap Overpass API:
    - `out geom` for `line` (`jalan`, `sungai`) and `polygon` (`bangunan`, `taman`) to preserve true shapes.
    - `out center` for `point` amenities (`sekolah`, `rumah_sakit`, `tempat_ibadah`).
    Raises a clear PetaLabError instead of silently fabricating random fake geometries on network failure.
    """
    minx, miny, maxx, maxy = bbox
    out_clause = "out geom 250;" if gtype in ("line", "polygon") else "out center 250;"
    overpass_ql = f"[out:json][timeout:25];({tag_q}({miny},{minx},{maxy},{maxx}););{out_clause}"

    try:
        with httpx.Client(timeout=28.0, headers={"User-Agent": "PetaLab-Local-GIS/1.0"}) as client:
            resp = client.post("https://overpass-api.de/api/interpreter", data={"data": overpass_ql})
            if resp.status_code != 200:
                raise PetaLabError(
                    "OSM_OVERPASS_ERROR",
                    message=f"Server OpenStreetMap Overpass mengembalikan status HTTP {resp.status_code}.",
                    hint="Coba lagi beberapa saat lagi atau perkecil area cakupan unduhan.",
                )
            elements = resp.json().get("elements", [])
    except PetaLabError:
        raise
    except Exception as exc:
        raise PetaLabError(
            "OSM_UNAVAILABLE",
            message="Tidak dapat menghubungi server OpenStreetMap Overpass (offline atau timeout).",
            hint="Pastikan koneksi internet aktif lalu coba ulang. PetaLab tidak membuat data OSM fiktif demi integritas analisis.",
            detail=str(exc),
        )

    rows = []
    for idx, el in enumerate(elements):
        tags = el.get("tags", {})
        geom = None
        el_geom = el.get("geometry")
        if gtype == "line" and el_geom and len(el_geom) >= 2:
            coords = [(float(pt["lon"]), float(pt["lat"])) for pt in el_geom if "lon" in pt and "lat" in pt]
            if len(coords) >= 2:
                geom = LineString(coords)
        elif gtype == "polygon" and el_geom and len(el_geom) >= 3:
            coords = [(float(pt["lon"]), float(pt["lat"])) for pt in el_geom if "lon" in pt and "lat" in pt]
            if len(coords) >= 3:
                if coords[0] != coords[-1]:
                    coords.append(coords[0])
                poly = Polygon(coords)
                if poly.is_valid and not poly.is_empty:
                    geom = poly
        if geom is None and gtype == "point":
            lon = el.get("lon") or (el.get("center") or {}).get("lon")
            lat = el.get("lat") or (el.get("center") or {}).get("lat")
            if lon is not None and lat is not None:
                geom = Point(float(lon), float(lat))

        if geom is not None:
            rows.append({
                "_fid": len(rows) + 1,
                "osm_id": str(el.get("id")),
                "nama": tags.get("name") or f"OSM {category.replace('_', ' ').title()} #{len(rows) + 1}",
                "kategori": category,
                "sumber": "OpenStreetMap (Overpass Live)",
                "geometry": geom,
            })

    if not rows:
        raise PetaLabError(
            "OSM_EMPTY_AREA",
            message=f"Tidak ditemukan objek '{category}' pada area yang dipilih di OpenStreetMap.",
            hint="Perluas area cakupan atau pilih kategori objek OSM lainnya.",
        )

    return gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")


@router.post("/api/export")
def api_export_resource(req: ExportReq) -> dict[str, Any]:
    pdir = repo.get_project_dir(req.project_id)
    exports_dir = pdir / "exports"
    exports_dir.mkdir(parents=True, exist_ok=True)

    if req.export_type == "project_zip":
        # §5.3 & §15.2: Strict allowlist for project export (NEVER includes credentials/) + automatic SUMBER_DATA.md
        ALLOWED_TOP_LEVEL = {"sources", "layers", "models", "project.json", "petalab.db", "SUMBER_DATA.md"}
        layers_list = repo.list_layers(req.project_id)
        sumber_lines = [
            f"# Daftar Sumber Data & Atribusi Ilmiah — Proyek `{req.project_id}`",
            "",
            "| Layer | Jenis | CRS | Asal / Dataset | Atribusi Resmi |",
            "|---|---|---|---|---|",
        ]
        for lyr in layers_list:
            lin = lyr.get("lineage") or {}
            extra = lin.get("extra") or lin
            src_name = extra.get("dataset_label") or extra.get("dataset_id") or lin.get("tool_name") or "Data Lokal"
            attr_text = extra.get("atribusi") or "© OpenStreetMap contributors / Pemilik Data Lokal"
            sumber_lines.append(
                f"| **{lyr['name']}** | {lyr['kind']} | {lyr.get('crs') or '-'} | {src_name} | {attr_text} |"
            )
        sumber_md_path = pdir / "SUMBER_DATA.md"
        sumber_md_path.write_text("\n".join(sumber_lines) + "\n", encoding="utf-8")

        zip_name = f"{req.project_id}.petalab.zip"
        zip_path = exports_dir / zip_name
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in pdir.rglob("*"):
                if not f.is_file():
                    continue
                rel = f.relative_to(pdir)
                top_part = rel.parts[0]
                if top_part not in ALLOWED_TOP_LEVEL:
                    continue
                if "credential" in str(rel).lower() or "gee_oauth" in f.name.lower() or "service_account" in f.name.lower():
                    continue
                zf.write(f, arcname=str(rel))
        return {"filename": zip_name, "download_url": f"/api/export/download/{req.project_id}/{zip_name}"}

    if req.export_type == "python_script":
        hist = repo.list_history(req.project_id, limit=50)
        lines = [
            '"""Skrip Reproduksi Alur Kerja Spasial — Diekspor dari PetaLab GIS Web"""',
            "import geopandas as gpd",
            "import pandas as pd",
            "from pathlib import Path",
            "",
            f'PROJECT_DIR = Path("{pdir.as_posix()}")',
            "",
        ]
        for h in reversed(hist):
            lines.append(f"# [{h['created_at']}] {h['action'].upper()}: {h['title']}")
        script_name = f"reproduksi_{req.project_id}.py"
        script_path = exports_dir / script_name
        script_path.write_text("\n".join(lines), encoding="utf-8")
        return {
            "filename": script_name,
            "script": "\n".join(lines),
            "download_url": f"/api/export/download/{req.project_id}/{script_name}",
        }

    # Layer export
    if not req.layer_id:
        raise PetaLabError("MISSING_LAYER", "Pilih layer yang ingin diekspor.")
    meta = repo.get_layer(req.project_id, req.layer_id)
    fmt = req.format.lower()
    ext_map = {"gpkg": ".gpkg", "geojson": ".geojson", "shp.zip": ".shp.zip", "shp": ".shp.zip", "csv": ".csv", "xlsx": ".xlsx", "parquet": ".parquet", "kml": ".kml", "tif": ".tif"}
    ext = ext_map.get(fmt, f".{fmt}")
    out_filename = f"{slugify(meta['name'])}{ext}"
    out_path = exports_dir / out_filename

    if meta["kind"] == "raster":
        shutil.copy2(pdir / meta["path"], out_path)
    else:
        export_vector_or_table(
            pdir / meta["path"],
            out_path,
            fmt=fmt,
            only_selected_fids=req.only_selected_fids,
            csv_delimiter=req.csv_delimiter,
        )

    repo.add_history(
        req.project_id,
        action="export",
        title=f"Ekspor Layer {meta['name']} ke {fmt.upper()}",
        target_id=req.layer_id,
        payload={"filename": out_filename, "format": fmt},
    )
    return {
        "filename": out_filename,
        "format": fmt,
        "size_bytes": out_path.stat().st_size if out_path.exists() else 0,
        "download_url": f"/api/export/download/{req.project_id}/{out_filename}",
    }


@router.get("/api/export/download/{pid}/{filename}")
def api_download_exported_file(pid: str, filename: str) -> FileResponse:
    pdir = repo.get_project_dir(pid)
    target = (pdir / "exports" / filename).resolve()
    if not str(target).startswith(str((pdir / "exports").resolve())) or not target.exists():
        raise PetaLabError("FILE_NOT_FOUND", f"File ekspor '{filename}' tidak ditemukan.", status_code=404)
    return FileResponse(target, filename=filename)
