import json
import shutil
from typing import Any
import uuid

from fastapi import APIRouter, File, Form, Query, UploadFile
import geopandas as gpd
from pydantic import BaseModel
import shapely.geometry

from petalab.core.io_raster import default_style_for_raster, load_raster_dataset, save_raster_dataset
from petalab.core.io_vector import (
    default_style_for_geom,
    load_working_layer,
    read_any_vector_or_table,
    save_working_layer,
)
from petalab.core.stats import compute_class_breaks
from petalab.db.repo import repo, slugify, utc_now_iso
from petalab.errors import PetaLabError

router = APIRouter()


class DrawLayerReq(BaseModel):
    project_id: str = "banjir-surabaya"
    name: str
    geojson: dict[str, Any]


class CreateCsvDatasetReq(BaseModel):
    project_id: str = "banjir-surabaya"
    dataset_name: str
    points: list[dict[str, Any]]
    join_table_layer_id: str | None = None
    csv_delimiter: str = ","
    pair_mode: bool = False


class SegmentLonLatReq(BaseModel):
    project_id: str | None = None
    lon_column: str
    lat_column: str
    swap_xy: bool = False
    auto_fix_indonesia: bool = True
    segment_mode: str = "quadrant"  # none | quadrant | grid | kmeans | attribute
    grid_nx: int = 2
    grid_ny: int = 2
    n_segments: int = 4
    value_column: str | None = None
    create_zone_layer: bool = True
    view_as_heatmap: bool = False
    heat_weight_col: str | None = None
    output_name: str | None = None


@router.get("/api/projects/{pid}/layers")
def api_list_layers(pid: str, include_deleted: bool = Query(False)) -> list[dict[str, Any]]:
    return repo.list_layers(pid, include_deleted=include_deleted)


@router.post("/api/projects/{pid}/layers/upload")
async def api_upload_layer(
    pid: str,
    file: UploadFile = File(...),
    lat_col: str | None = Form(None),
    lon_col: str | None = Form(None),
    wkt_col: str | None = Form(None),
    crs_override: str | None = Form(None),
    swap_latlon: bool = Form(False),
) -> dict[str, Any]:
    pdir = repo.get_project_dir(pid)
    raw_name = file.filename or f"upload_{uuid.uuid4().hex[:6]}.geojson"
    safe_filename = f"{slugify(raw_name.rsplit('.', 1)[0])}_{uuid.uuid4().hex[:4]}.{raw_name.rsplit('.', 1)[-1].lower()}"
    src_path = pdir / "sources" / safe_filename
    src_path.parent.mkdir(parents=True, exist_ok=True)

    content = await file.read()
    src_path.write_bytes(content)

    suffix = src_path.suffix.lower()
    layer_title = raw_name.rsplit(".", 1)[0]

    # Raster formats
    if suffix in (".tif", ".tiff", ".asc"):
        ds = load_raster_dataset(src_path)
        rel_work = f"layers/{slugify(layer_title)}_{uuid.uuid4().hex[:5]}.tif"
        rmeta = save_raster_dataset(ds, pdir / rel_work)
        rstyle = default_style_for_raster(rmeta["raster_meta"])
        report = {
            "layer_name": layer_title,
            "summary": f"Raster {ds.width}×{ds.height} piksel · {ds.count} band · CRS: {ds.crs}",
            "feature_count": ds.count,
            "column_count": ds.count,
            "geom_type": "raster",
            "geom_label": "band raster",
            "crs": ds.crs,
            "warnings": [],
            "fixes_applied": ["Konversi ke format kerja internal + statistik persentil 2–98% selesai."],
            "tips": ["Gunakan menu Gaya Layer untuk mengganti palet warna (Terrain, Viridis, NDVI, Hillshade)."],
        }
        saved = repo.add_layer(pid, {
            "name": layer_title,
            "path": rel_work,
            "source_path": f"sources/{safe_filename}",
            **rmeta,
            "style": rstyle,
            "lineage": {"tool": "import", "tool_name": "Impor File Raster", "source": raw_name, "report": report},
        })
        repo.add_history(
            pid,
            action="import",
            title=f"Impor Raster: {layer_title}",
            target_id=saved["id"],
            payload={"filename": raw_name},
            undo={"type": "delete_layer", "layer_id": saved["id"]},
        )
        return {"layer": saved, "report": report}

    # Vector or Tabular formats
    gdf_or_df, kind, report = read_any_vector_or_table(
        src_path,
        lat_col=lat_col,
        lon_col=lon_col,
        wkt_col=wkt_col,
        crs_override=crs_override,
        swap_latlon=swap_latlon,
    )
    rel_work = f"layers/{slugify(layer_title)}_{uuid.uuid4().hex[:5]}.parquet"
    meta = save_working_layer(gdf_or_df, pdir / rel_work)
    existing_count = len(repo.list_layers(pid))
    style = default_style_for_geom(meta["geom_type"], existing_count) if kind == "vector" else {}

    saved = repo.add_layer(pid, {
        "name": layer_title,
        "path": rel_work,
        "source_path": f"sources/{safe_filename}",
        **meta,
        "style": style,
        "lineage": {"tool": "import", "tool_name": "Impor File", "source": raw_name, "report": report},
    })
    repo.add_history(
        pid,
        action="import",
        title=f"Impor Data: {layer_title}",
        target_id=saved["id"],
        payload={"filename": raw_name, "summary": report.get("summary")},
        undo={"type": "delete_layer", "layer_id": saved["id"]},
    )
    return {"layer": saved, "report": report}


@router.post("/api/layers/draw")
def api_create_drawn_layer(req: DrawLayerReq) -> dict[str, Any]:
    features = req.geojson.get("features", [])
    if not features:
        raise PetaLabError("EMPTY_DRAW", "Gambar minimal 1 objek (titik, garis, atau poligon) di peta terlebih dahulu.")

    from petalab.core.crs import to_metric_crs

    rows = []
    for idx, feat in enumerate(features):
        geom = shapely.geometry.shape(feat["geometry"])
        props = dict(feat.get("properties") or {})
        props["_fid"] = idx + 1
        props.setdefault("nama", f"Objek {idx + 1}")
        props.setdefault("kelas", props.get("category", "Kelas A"))

        # Automatically capture Lat/Lon coordinates and start/end pairs for drawn geometries
        c = geom.centroid
        props.setdefault("lintang", round(float(c.y), 6))
        props.setdefault("bujur", round(float(c.x), 6))
        props.setdefault("koordinat_lat_lon", f"{c.y:.6f}, {c.x:.6f}")

        if geom.geom_type == "LineString" and len(geom.coords) >= 2:
            p0 = geom.coords[0]
            p1 = geom.coords[-1]
            props.setdefault("asal_lintang", round(float(p0[1]), 6))
            props.setdefault("asal_bujur", round(float(p0[0]), 6))
            props.setdefault("tujuan_lintang", round(float(p1[1]), 6))
            props.setdefault("tujuan_bujur", round(float(p1[0]), 6))
            props.setdefault("pasangan_koordinat", f"({p0[1]:.6f}, {p0[0]:.6f}) -> ({p1[1]:.6f}, {p1[0]:.6f})")

        props["geometry"] = geom
        rows.append(props)

    gdf = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    try:
        gdf_m, _ = to_metric_crs(gdf)
        cm = gdf_m.geometry.centroid
        gdf["utm_x_m"] = cm.x.round(2)
        gdf["utm_y_m"] = cm.y.round(2)
        if any(g.geom_type == "LineString" for g in gdf.geometry):
            gdf["jarak_m"] = gdf_m.geometry.length.round(2)
    except Exception:
        pass
    pdir = repo.get_project_dir(req.project_id)
    rel_work = f"layers/{slugify(req.name)}_{uuid.uuid4().hex[:5]}.parquet"
    meta = save_working_layer(gdf, pdir / rel_work)
    style = default_style_for_geom(meta["geom_type"], len(repo.list_layers(req.project_id)))

    saved = repo.add_layer(req.project_id, {
        "name": req.name,
        "path": rel_work,
        **meta,
        "style": style,
        "lineage": {"tool": "draw", "tool_name": "Gambar Manual di Peta", "created_at": utc_now_iso()},
    })
    repo.add_history(
        req.project_id,
        action="import",
        title=f"Gambar Layer Baru: {req.name}",
        target_id=saved["id"],
        undo={"type": "delete_layer", "layer_id": saved["id"]},
    )
    return saved


@router.post("/api/datasets/create_csv")
def api_create_csv_dataset(req: CreateCsvDatasetReq) -> dict[str, Any]:
    """
    Creates a new CSV dataset from captured map points (with explicit `long` and `lat` columns),
    optionally joining the captured `long` and `lat` coordinates onto an existing table/CSV layer,
    writes the physical `.csv` file to `sources/` and `exports/`, and registers it as a new live spatial layer.
    """
    import pandas as pd
    from shapely.geometry import Point
    from petalab.core.crs import to_metric_crs

    if not req.points:
        raise PetaLabError("EMPTY_POINTS", "Letakkan minimal 1 titik di peta terlebih dahulu sebelum membuat dataset CSV.")

    pdir = repo.get_project_dir(req.project_id)
    clean_name = req.dataset_name.strip().removesuffix(".csv") or f"dataset_titik_{uuid.uuid4().hex[:4]}"
    file_slug = slugify(clean_name)

    has_catatan = any(str(pt.get("catatan") or "").strip() for pt in req.points)
    has_pairs = bool(req.pair_mode) or any(
        str(pt.get("pasangan_grup") or "") not in ("", "Tunggal") for pt in req.points
    )

    pts_rows = []
    for idx, pt in enumerate(req.points):
        lat_val = round(float(pt.get("lat", 0.0)), 6)
        lon_val = round(float(pt.get("long", pt.get("lon", 0.0))), 6)
        row: dict[str, Any] = {
            "id": idx + 1,
            "nama": str(pt.get("nama") or pt.get("label") or f"Titik {idx + 1}"),
            "kategori": str(pt.get("kategori") or "Titik Survei"),
        }
        if has_catatan:
            row["catatan"] = str(pt.get("catatan") or "")
        if has_pairs:
            row["pasangan_grup"] = str(pt.get("pasangan_grup") or "Tunggal")
            row["peran"] = str(pt.get("peran") or "Titik")
        row["long"] = lon_val
        row["lat"] = lat_val
        if has_pairs:
            row["jarak_pasangan_m"] = pt.get("jarak_m")
        pts_rows.append(row)

    pts_df = pd.DataFrame(pts_rows)

    # Optional: Join captured `long` and `lat` onto rows of an existing CSV/table layer in the project
    if req.join_table_layer_id:
        base_meta = repo.get_layer(req.project_id, req.join_table_layer_id)
        base_df = load_working_layer(pdir / base_meta["path"])
        if isinstance(base_df, gpd.GeoDataFrame) and "geometry" in base_df.columns:
            base_df = pd.DataFrame(base_df.drop(columns=["geometry"]))
        else:
            base_df = pd.DataFrame(base_df)
        base_df = base_df.drop(columns=["_fid"], errors="ignore").reset_index(drop=True)

        # Attach captured long & lat to matching rows (1..N); if more points than rows, expand rows
        n_rows = max(len(base_df), len(pts_df))
        base_reindexed = base_df.reindex(range(n_rows))
        attach_cols = ["long", "lat"] + (["pasangan_grup", "peran", "jarak_pasangan_m"] if has_pairs else [])
        for col in attach_cols:
            if col in pts_df.columns:
                base_reindexed[col] = pts_df[col].reindex(range(n_rows))
        if "nama" not in base_reindexed.columns:
            base_reindexed["nama"] = pts_df["nama"].reindex(range(n_rows))
        merged_df = base_reindexed.dropna(subset=["long", "lat"]).reset_index(drop=True)
    else:
        merged_df = pts_df

    geoms = [Point(float(lon), float(lat)) for lon, lat in zip(merged_df["long"], merged_df["lat"])]
    gdf = gpd.GeoDataFrame(merged_df, geometry=geoms, crs="EPSG:4326")
    try:
        gdf_m, _ = to_metric_crs(gdf)
        gdf["utm_x_m"] = gdf_m.geometry.x.round(2)
        gdf["utm_y_m"] = gdf_m.geometry.y.round(2)
    except Exception:
        pass

    # Write physical CSV (chosen delimiter) + formatted Excel (.xlsx) to exports/
    sep = ";" if req.csv_delimiter == ";" else ","
    csv_filename = f"{file_slug}.csv"
    xlsx_filename = f"{file_slug}.xlsx"
    src_csv = pdir / "sources" / csv_filename
    exp_csv = pdir / "exports" / csv_filename
    exp_xlsx = pdir / "exports" / xlsx_filename
    src_csv.parent.mkdir(parents=True, exist_ok=True)
    exp_csv.parent.mkdir(parents=True, exist_ok=True)
    plain_export_df = pd.DataFrame(gdf.drop(columns=["geometry"]))
    # Internal source CSV stays standard comma-delimited for reliable GIS/Python interoperability
    plain_export_df.to_csv(src_csv, index=False, encoding="utf-8-sig", sep=",")
    # Exported CSV uses user-selected delimiter (';' opens cleanly per column in Indonesian Excel)
    plain_export_df.to_csv(exp_csv, index=False, encoding="utf-8-sig", sep=sep)

    # Also write formatted native Excel (.xlsx) with auto-fitted column widths
    xlsx_url: str | None = None
    try:
        from openpyxl.styles import Alignment, Font, PatternFill

        with pd.ExcelWriter(exp_xlsx, engine="openpyxl") as writer:
            plain_export_df.to_excel(writer, index=False, sheet_name="Dataset_Titik")
            ws = writer.sheets["Dataset_Titik"]
            header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
            header_font = Font(bold=True, color="FFFFFF", name="Calibri", size=11)
            for col_idx, col_name in enumerate(plain_export_df.columns, start=1):
                cell = ws.cell(row=1, column=col_idx)
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal="center", vertical="center")
                max_len = max(
                    len(str(col_name)),
                    *(len(str(v)) for v in plain_export_df[col_name].fillna("").tolist()),
                )
                ws.column_dimensions[cell.column_letter].width = min(max_len + 4, 38)
            ws.freeze_panes = "A2"
        xlsx_url = f"/api/export/download/{req.project_id}/{xlsx_filename}"
    except Exception:
        xlsx_filename = ""
        xlsx_url = None

    # Save working GeoParquet & register as a live spatial layer
    rel_work = f"layers/{file_slug}_{uuid.uuid4().hex[:5]}.parquet"
    meta = save_working_layer(gdf, pdir / rel_work)
    style = default_style_for_geom("point", len(repo.list_layers(req.project_id)))
    style.update({"labelColumn": "nama", "pointRadius": 7})

    saved = repo.add_layer(req.project_id, {
        "name": clean_name,
        "path": rel_work,
        "source_path": f"sources/{csv_filename}",
        **meta,
        "style": style,
        "lineage": {
            "tool": "create_csv_dataset",
            "tool_name": "Buat Dataset CSV Baru (Tangkap Titik)",
            "csv_file": csv_filename,
            "xlsx_file": xlsx_filename or None,
            "joined_from_layer": req.join_table_layer_id,
            "created_at": utc_now_iso(),
        },
    })
    repo.add_history(
        req.project_id,
        action="import",
        title=f"Buat Dataset CSV Baru: {csv_filename} ({len(gdf)} titik long/lat)",
        target_id=saved["id"],
        undo={"type": "delete_layer", "layer_id": saved["id"]},
    )
    return {
        "layer": saved,
        "csv_filename": csv_filename,
        "csv_download_url": f"/api/export/download/{req.project_id}/{csv_filename}",
        "xlsx_filename": xlsx_filename,
        "xlsx_download_url": xlsx_url,
        "row_count": len(gdf),
    }


def _parse_single_coord(val: Any) -> float | None:
    import math
    import re

    if val is None:
        return None
    if isinstance(val, (int, float)):
        f = float(val)
        return f if math.isfinite(f) else None
    s = str(val).strip()
    if not s or s.lower() in ("nan", "none", "null", "-", "—"):
        return None
    # Handle DMS like 7°15'27.5"S or 106°49'12"E
    dms_m = re.match(
        r"^\s*(-?\d+(?:[.,]\d+)?)\s*[°d]\s*(\d+(?:[.,]\d+)?)?\s*['′m]?\s*(\d+(?:[.,]\d+)?)?\s*[\"″s]?\s*([NSEW])?\s*$",
        s,
        re.I,
    )
    if dms_m and ("°" in s or "'" in s or "′" in s or (dms_m.group(4) is not None)):
        deg = float(dms_m.group(1).replace(",", "."))
        mins = float((dms_m.group(2) or "0").replace(",", "."))
        secs = float((dms_m.group(3) or "0").replace(",", "."))
        hemi = (dms_m.group(4) or "").upper()
        sign = -1.0 if (deg < 0 or hemi in ("S", "W")) else 1.0
        return sign * (abs(deg) + mins / 60.0 + secs / 3600.0)

    # Clean thousands/decimal separators (e.g. "-6,2154" -> "-6.2154")
    s_clean = s.replace(" ", "")
    if "," in s_clean and "." not in s_clean:
        s_clean = s_clean.replace(",", ".")
    elif "," in s_clean and "." in s_clean:
        # Assume last separator is decimal
        if s_clean.rfind(",") > s_clean.rfind("."):
            s_clean = s_clean.replace(".", "").replace(",", ".")
        else:
            s_clean = s_clean.replace(",", "")
    try:
        f = float(s_clean)
        return f if math.isfinite(f) else None
    except ValueError:
        return None


def _detect_region_hint(cx: float, cy: float) -> str:
    if 94.5 <= cx <= 141.5 and -11.5 <= cy <= 6.5:
        if 106.0 <= cx <= 108.8 and -7.8 <= cy <= -5.8:
            return "Indonesia · Jabodetabek & Jawa Barat"
        if 108.8 < cx <= 111.2 and -8.3 <= cy <= -6.4:
            return "Indonesia · Jawa Tengah & DIY"
        if 111.2 < cx <= 114.6 and -8.8 <= cy <= -6.6:
            return "Indonesia · Jawa Timur"
        if 114.6 < cx <= 125.5 and -11.0 <= cy <= -7.5:
            return "Indonesia · Bali & Nusa Tenggara"
        if 95.0 <= cx <= 106.0 and -6.0 <= cy <= 6.2:
            return "Indonesia · Sumatera"
        if 108.5 <= cx <= 119.5 and -4.5 <= cy <= 4.5:
            return "Indonesia · Kalimantan"
        if 118.5 <= cx <= 125.5 and -6.0 <= cy <= 2.5:
            return "Indonesia · Sulawesi"
        if 125.5 < cx <= 141.5:
            return "Indonesia · Maluku & Papua"
        return "Wilayah Indonesia (WGS 84)"
    return f"WGS 84 Global ({cy:.3f}°, {cx:.3f}°)"


@router.post("/api/layers/{lid}/segment_lonlat")
def api_segment_lonlat_layer(lid: str, req: SegmentLonLatReq) -> dict[str, Any]:
    """
    Maps 2 user-selected columns (`lon_column`, `lat_column`) into geodetically accurate WGS 84 (EPSG:4326)
    map coordinates + local UTM metric projection, detects/fixes swapped coordinates, optionally segments
    the map into Quadrants / NxN Grid / UTM K-Means Spatial Clusters / Attribute Quantiles (with zone
    polygons), and returns exact bounding box + accuracy report for instant map alignment.
    """
    import math
    import numpy as np
    import pandas as pd
    from shapely.geometry import MultiPoint, Point, box as shapely_box
    from petalab.core.crs import to_metric_crs

    pid, meta = (req.project_id, repo.get_layer(req.project_id, lid)) if req.project_id else repo.find_layer_across_projects(lid)
    pdir = repo.get_project_dir(pid)
    raw = load_working_layer(pdir / meta["path"])
    df = pd.DataFrame(raw.drop(columns=["geometry"])) if isinstance(raw, gpd.GeoDataFrame) and "geometry" in raw.columns else pd.DataFrame(raw)
    df = df.drop(columns=["_fid"], errors="ignore").reset_index(drop=True)

    if req.lon_column not in df.columns:
        raise PetaLabError("INVALID_COLUMN", f"Kolom Bujur (Longitude) '{req.lon_column}' tidak ditemukan di layer '{meta['name']}'.")
    if req.lat_column not in df.columns:
        raise PetaLabError("INVALID_COLUMN", f"Kolom Lintang (Latitude) '{req.lat_column}' tidak ditemukan di layer '{meta['name']}'.")

    total_rows = len(df)
    lon_vals = np.array([_parse_single_coord(v) for v in df[req.lon_column]], dtype=float)
    lat_vals = np.array([_parse_single_coord(v) for v in df[req.lat_column]], dtype=float)

    if req.swap_xy:
        lon_vals, lat_vals = lat_vals, lon_vals

    finite_mask = np.isfinite(lon_vals) & np.isfinite(lat_vals)
    if not finite_mask.any():
        raise PetaLabError(
            "NO_VALID_COORDS",
            f"Tidak ada koordinat numerik valid pada pasangan kolom '{req.lon_column}' dan '{req.lat_column}'.",
            hint="Pastikan Anda memilih kolom angka Bujur (contoh: 106.81 / 112.75) dan Lintang (contoh: -6.20 / -7.25).",
        )

    # Smart swap detection (e.g., lat > 90 or Indonesian lat/lon reversed)
    med_lon = float(np.nanmedian(lon_vals[finite_mask]))
    med_lat = float(np.nanmedian(lat_vals[finite_mask]))
    swapped_detected = False
    if (abs(med_lat) > 90.0 and abs(med_lon) <= 90.0) or (
        -11.5 <= med_lon <= 6.5 and 94.5 <= med_lat <= 141.5
    ):
        swapped_detected = True
        if req.auto_fix_indonesia:
            lon_vals, lat_vals = lat_vals, lon_vals
            med_lon, med_lat = med_lat, med_lon

    valid_mask = (
        np.isfinite(lon_vals)
        & np.isfinite(lat_vals)
        & (lon_vals >= -180.0)
        & (lon_vals <= 180.0)
        & (lat_vals >= -90.0)
        & (lat_vals <= 90.0)
        & ~((lon_vals == 0.0) & (lat_vals == 0.0))
    )
    if not valid_mask.any():
        raise PetaLabError(
            "OUT_OF_RANGE_COORDS",
            f"Seluruh nilai koordinat berada di luar batas WGS 84 (Bujur -180..180, Lintang -90..90).",
            hint="Coba klik 'Tukar Long <-> Lat' jika kolom Bujur dan Lintang tertukar.",
        )

    clean_df = df.loc[valid_mask].copy().reset_index(drop=True)
    lons = np.round(lon_vals[valid_mask], 6)
    lats = np.round(lat_vals[valid_mask], 6)
    clean_df["long_akurat"] = lons
    clean_df["lat_akurat"] = lats

    geoms = [Point(float(x), float(y)) for x, y in zip(lons, lats)]
    gdf = gpd.GeoDataFrame(clean_df, geometry=geoms, crs="EPSG:4326")

    # Compute exact local metric UTM coordinates
    gdf_m, _orig_crs = to_metric_crs(gdf)
    utm_epsg = gdf_m.crs.to_string() if gdf_m.crs else "EPSG:32749"
    gdf["utm_x_m"] = gdf_m.geometry.x.round(2)
    gdf["utm_y_m"] = gdf_m.geometry.y.round(2)

    min_lon, max_lon = float(lons.min()), float(lons.max())
    min_lat, max_lat = float(lats.min()), float(lats.max())
    cx, cy = (min_lon + max_lon) / 2.0, (min_lat + max_lat) / 2.0
    width_km = round(abs(max_lon - min_lon) * 111.32 * math.cos(math.radians(cy)), 2)
    height_km = round(abs(max_lat - min_lat) * 110.57, 2)

    # Numeric attribute column for zone aggregation summary if available
    num_cols = [
        c for c in clean_df.columns
        if c not in (req.lon_column, req.lat_column, "long_akurat", "lat_akurat", "utm_x_m", "utm_y_m", "id")
        and pd.api.types.is_numeric_dtype(clean_df[c])
    ]
    val_col = req.value_column if (req.value_column and req.value_column in clean_df.columns) else (num_cols[0] if num_cols else None)

    # --- SEGMENTATION ENGINE ---
    seg_mode = (req.segment_mode or "quadrant").lower()
    zone_rows: list[dict[str, Any]] = []
    pad_lon = max(0.002, (max_lon - min_lon) * 0.04)
    pad_lat = max(0.002, (max_lat - min_lat) * 0.04)

    if seg_mode == "quadrant":
        mid_lon = float(np.median(lons))
        mid_lat = float(np.median(lats))
        labels = []
        for x, y in zip(lons, lats):
            if y >= mid_lat and x < mid_lon:
                labels.append("Segmen 1 · Barat Laut (NW)")
            elif y >= mid_lat and x >= mid_lon:
                labels.append("Segmen 2 · Timur Laut (NE)")
            elif y < mid_lat and x < mid_lon:
                labels.append("Segmen 3 · Barat Daya (SW)")
            else:
                labels.append("Segmen 4 · Tenggara (SE)")
        gdf["segmen_zona"] = labels

        quad_boxes = [
            ("Segmen 1 · Barat Laut (NW)", shapely_box(min_lon - pad_lon, mid_lat, mid_lon, max_lat + pad_lat)),
            ("Segmen 2 · Timur Laut (NE)", shapely_box(mid_lon, mid_lat, max_lon + pad_lon, max_lat + pad_lat)),
            ("Segmen 3 · Barat Daya (SW)", shapely_box(min_lon - pad_lon, min_lat - pad_lat, mid_lon, mid_lat)),
            ("Segmen 4 · Tenggara (SE)", shapely_box(mid_lon, min_lat - pad_lat, max_lon + pad_lon, mid_lat)),
        ]
        for zname, zpoly in quad_boxes:
            sub = gdf[gdf["segmen_zona"] == zname]
            zrow = {
                "segmen_zona": zname,
                "jumlah_titik": int(len(sub)),
                "persen": round(100.0 * len(sub) / max(1, len(gdf)), 1),
                "rata_long": round(float(sub["long_akurat"].mean()), 6) if len(sub) else round(zpoly.centroid.x, 6),
                "rata_lat": round(float(sub["lat_akurat"].mean()), 6) if len(sub) else round(zpoly.centroid.y, 6),
                "geometry": zpoly,
            }
            if val_col and len(sub):
                zrow[f"rata_{val_col}"] = round(float(pd.to_numeric(sub[val_col], errors="coerce").mean()), 2)
            zone_rows.append(zrow)

    elif seg_mode == "grid":
        nx = max(2, min(6, int(req.grid_nx)))
        ny = max(2, min(6, int(req.grid_ny)))
        lon_edges = np.linspace(min_lon - 1e-6, max_lon + 1e-6, nx + 1)
        lat_edges = np.linspace(min_lat - 1e-6, max_lat + 1e-6, ny + 1)
        ix = np.clip(np.digitize(lons, lon_edges) - 1, 0, nx - 1)
        iy = np.clip(np.digitize(lats, lat_edges) - 1, 0, ny - 1)
        gdf["segmen_zona"] = [f"Grid L{c + 1}-B{r + 1}" for c, r in zip(ix, iy)]

        for r in range(ny):
            for c in range(nx):
                zname = f"Grid L{c + 1}-B{r + 1}"
                zpoly = shapely_box(float(lon_edges[c]), float(lat_edges[r]), float(lon_edges[c + 1]), float(lat_edges[r + 1]))
                sub = gdf[gdf["segmen_zona"] == zname]
                if len(sub) == 0:
                    continue
                zrow = {
                    "segmen_zona": zname,
                    "jumlah_titik": int(len(sub)),
                    "persen": round(100.0 * len(sub) / max(1, len(gdf)), 1),
                    "rata_long": round(float(sub["long_akurat"].mean()), 6),
                    "rata_lat": round(float(sub["lat_akurat"].mean()), 6),
                    "geometry": zpoly,
                }
                if val_col:
                    zrow[f"rata_{val_col}"] = round(float(pd.to_numeric(sub[val_col], errors="coerce").mean()), 2)
                zone_rows.append(zrow)

    elif seg_mode == "kmeans":
        from sklearn.cluster import KMeans

        k = max(2, min(8, int(req.n_segments), len(gdf)))
        coords_m = np.column_stack([gdf["utm_x_m"].values, gdf["utm_y_m"].values])
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        raw_labels = km.fit_predict(coords_m)
        # Sort cluster IDs West -> East by centroid X so numbering is intuitive on map
        order = np.argsort(km.cluster_centers_[:, 0])
        remap = {int(old): idx + 1 for idx, old in enumerate(order)}
        gdf["segmen_zona"] = [f"Klaster Spasial {remap[int(lbl)]}" for lbl in raw_labels]

        for idx in range(1, k + 1):
            zname = f"Klaster Spasial {idx}"
            sub_m = gdf_m.loc[gdf["segmen_zona"] == zname]
            sub = gdf[gdf["segmen_zona"] == zname]
            if len(sub) == 0:
                continue
            hull_m = MultiPoint(list(sub_m.geometry)).convex_hull.buffer(450.0)
            hull_wgs = gpd.GeoSeries([hull_m], crs=utm_epsg).to_crs("EPSG:4326").iloc[0]
            zrow = {
                "segmen_zona": zname,
                "jumlah_titik": int(len(sub)),
                "persen": round(100.0 * len(sub) / max(1, len(gdf)), 1),
                "rata_long": round(float(sub["long_akurat"].mean()), 6),
                "rata_lat": round(float(sub["lat_akurat"].mean()), 6),
                "luas_km2": round(float(hull_m.area / 1e6), 2),
                "geometry": hull_wgs,
            }
            if val_col:
                zrow[f"rata_{val_col}"] = round(float(pd.to_numeric(sub[val_col], errors="coerce").mean()), 2)
            zone_rows.append(zrow)

    elif seg_mode == "attribute":
        if not val_col:
            raise PetaLabError("NO_NUMERIC_COLUMN", "Pilih kolom angka untuk segmentasi rentang nilai atribut.")
        s_num = pd.to_numeric(gdf[val_col], errors="coerce")
        k = max(2, min(6, int(req.n_segments)))
        tier_names = {
            2: ["Rendah", "Tinggi"],
            3: ["Rendah", "Sedang", "Tinggi"],
            4: ["Rendah", "Menengah", "Tinggi", "Sangat Tinggi"],
            5: ["Sangat Rendah", "Rendah", "Sedang", "Tinggi", "Sangat Tinggi"],
            6: ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"],
        }.get(k, [f"Kelas {i + 1}" for i in range(k)])
        try:
            bins = pd.qcut(s_num.rank(method="first"), q=k, labels=tier_names)
            gdf["segmen_zona"] = [f"{val_col}: {lbl}" for lbl in bins.astype(str)]
        except Exception:
            gdf["segmen_zona"] = f"{val_col}: Semua"
    else:
        gdf["segmen_zona"] = "Terakurasi WGS 84"

    # Save Zone Polygon Layer FIRST (underneath point layer if requested)
    zone_layer_saved = None
    if req.create_zone_layer and zone_rows:
        zgdf = gpd.GeoDataFrame(zone_rows, geometry="geometry", crs="EPSG:4326")
        zgdf_m, _ = to_metric_crs(zgdf)
        if "luas_km2" not in zgdf.columns:
            zgdf["luas_km2"] = (zgdf_m.geometry.area / 1e6).round(2)
        zname_base = f"{req.output_name or meta['name']}_zona_{seg_mode}"
        z_rel = f"layers/{slugify(zname_base)}_{uuid.uuid4().hex[:5]}.parquet"
        z_meta = save_working_layer(zgdf, pdir / z_rel)
        z_style = default_style_for_geom("polygon", len(repo.list_layers(pid)))
        z_style.update({
            "mode": "category",
            "column": "segmen_zona",
            "opacity": 0.22,
            "strokeColor": "#0b1214",
            "strokeWidth": 1.6,
            "labelColumn": "segmen_zona",
        })
        zone_layer_saved = repo.add_layer(pid, {
            "name": zname_base,
            "path": z_rel,
            **z_meta,
            "style": z_style,
            "lineage": {
                "tool": "segment_lonlat",
                "tool_name": f"Batas Segmen Long/Lat ({seg_mode})",
                "source_layer": meta["name"],
                "lon_column": req.lon_column,
                "lat_column": req.lat_column,
                "created_at": utc_now_iso(),
            },
        })

    # Save Accurately Plotted & Segmented Point Layer
    out_base = req.output_name or f"{meta['name']}_{'akurat' if seg_mode == 'none' else f'segmen_{seg_mode}'}"
    p_rel = f"layers/{slugify(out_base)}_{uuid.uuid4().hex[:5]}.parquet"
    p_meta = save_working_layer(gdf, pdir / p_rel)
    p_style = default_style_for_geom("point", len(repo.list_layers(pid)))

    heat_col = req.heat_weight_col if (req.heat_weight_col and req.heat_weight_col in gdf.columns) else val_col
    if req.view_as_heatmap:
        p_style.update({
            "mode": "heatmap",
            "column": heat_col,
            "heatWeightCol": heat_col,
            "heatPalette": "thermal",
            "heatRadius": 30,
            "heatIntensity": 1.35,
            "heatShowPoints": True,
            "opacity": 0.88,
            "pointRadius": 4,
        })
    elif seg_mode != "none":
        p_style.update({
            "mode": "category",
            "column": "segmen_zona",
            "pointRadius": 7,
            "opacity": 0.92,
        })
    else:
        p_style.update({
            "mode": "single",
            "color": "#0d9488",
            "fillColor": "#0d9488",
            "pointRadius": 7,
            "opacity": 0.92,
        })

    point_layer_saved = repo.add_layer(pid, {
        "name": out_base,
        "path": p_rel,
        **p_meta,
        "style": p_style,
        "lineage": {
            "tool": "segment_lonlat",
            "tool_name": f"Segmentasi & Akurasi Long/Lat ({seg_mode})",
            "source_layer": meta["name"],
            "lon_column": req.lon_column,
            "lat_column": req.lat_column,
            "swapped_applied": bool(req.swap_xy or (swapped_detected and req.auto_fix_indonesia)),
            "utm_crs": utm_epsg,
            "created_at": utc_now_iso(),
        },
    })

    repo.add_history(
        pid,
        action="process",
        title=f"Segmentasi Long/Lat ({seg_mode}): {out_base} ({len(gdf)} titik)",
        target_id=point_layer_saved["id"],
        undo={"type": "delete_layer", "layer_id": point_layer_saved["id"]},
    )

    seg_counts = gdf["segmen_zona"].value_counts().to_dict()
    segment_summary = [
        {"segment": str(k), "count": int(v), "pct": round(100.0 * int(v) / max(1, len(gdf)), 1)}
        for k, v in seg_counts.items()
    ]

    return {
        "point_layer": point_layer_saved,
        "zone_layer": zone_layer_saved,
        "bbox": p_meta["bbox"],
        "accuracy": {
            "total_rows": total_rows,
            "valid_points": int(len(gdf)),
            "dropped_invalid": int(total_rows - len(gdf)),
            "lon_column_used": req.lon_column,
            "lat_column_used": req.lat_column,
            "swapped_detected": swapped_detected,
            "swapped_applied": bool(req.swap_xy or (swapped_detected and req.auto_fix_indonesia)),
            "lon_range": [round(min_lon, 6), round(max_lon, 6)],
            "lat_range": [round(min_lat, 6), round(max_lat, 6)],
            "center": [round(cx, 6), round(cy, 6)],
            "span_km": [width_km, height_km],
            "utm_crs": utm_epsg,
            "region_hint": _detect_region_hint(cx, cy),
        },
        "segment_summary": segment_summary,
    }


@router.get("/api/layers/{lid}")
def api_get_layer(lid: str, project_id: str | None = Query(None)) -> dict[str, Any]:
    pid = project_id or repo.find_layer_across_projects(lid)[0]
    return repo.get_layer(pid, lid)


@router.patch("/api/layers/{lid}")
def api_update_layer(lid: str, updates: dict[str, Any], project_id: str | None = Query(None)) -> dict[str, Any]:
    pid = project_id or repo.find_layer_across_projects(lid)[0]
    prev = repo.get_layer(pid, lid)
    updated = repo.update_layer(pid, lid, updates)
    if "style" in updates:
        repo.add_history(
            pid,
            action="style",
            title=f"Ubah Gaya Peta: {updated['name']}",
            target_id=lid,
            undo={"type": "restore_style", "layer_id": lid, "previous_style": prev.get("style", {})},
        )
    return updated


@router.delete("/api/layers/{lid}")
def api_delete_layer(lid: str, project_id: str | None = Query(None)) -> dict[str, Any]:
    pid = project_id or repo.find_layer_across_projects(lid)[0]
    deleted = repo.soft_delete_layer(pid, lid)
    repo.add_history(
        pid,
        action="delete",
        title=f"Pindahkan Layer ke Sampah: {deleted['name']}",
        target_id=lid,
        undo={"type": "restore_layer", "layer_id": lid},
    )
    return deleted


@router.post("/api/layers/{lid}/restore")
def api_restore_layer(lid: str, project_id: str | None = Query(None)) -> dict[str, Any]:
    pid = project_id or repo.find_layer_across_projects(lid)[0]
    return repo.restore_layer(pid, lid)


@router.post("/api/layers/{lid}/duplicate")
def api_duplicate_layer(lid: str, project_id: str | None = Query(None)) -> dict[str, Any]:
    pid = project_id or repo.find_layer_across_projects(lid)[0]
    orig = repo.get_layer(pid, lid)
    pdir = repo.get_project_dir(pid)
    src_file = pdir / orig["path"]
    ext = src_file.suffix
    new_rel = f"layers/{slugify(orig['name'])}_salinan_{uuid.uuid4().hex[:5]}{ext}"
    shutil.copy2(src_file, pdir / new_rel)
    if src_file.with_suffix(".meta.json").exists():
        shutil.copy2(src_file.with_suffix(".meta.json"), (pdir / new_rel).with_suffix(".meta.json"))
    if src_file.with_suffix(".npz").exists():
        shutil.copy2(src_file.with_suffix(".npz"), (pdir / new_rel).with_suffix(".npz"))

    return repo.add_layer(pid, {
        **orig,
        "id": f"lyr_{uuid.uuid4().hex[:10]}",
        "name": f"{orig['name']}_salinan",
        "path": new_rel,
        "lineage": {"tool": "duplicate", "tool_name": "Duplikat Layer", "from_layer": orig["name"]},
    })


@router.get("/api/layers/{lid}/geojson")
def api_get_layer_geojson(
    lid: str,
    simplify: float = Query(0.0),
    zoom: float | None = Query(None),
    bbox: str | None = Query(None),
    limit: int = Query(50000),
    project_id: str | None = Query(None),
) -> dict[str, Any]:
    pid = project_id or repo.find_layer_across_projects(lid)[0]
    meta = repo.get_layer(pid, lid)
    if meta["kind"] != "vector":
        raise PetaLabError("NOT_VECTOR", "Hanya layer vektor yang memiliki GeoJSON.")

    pdir = repo.get_project_dir(pid)
    gdf = load_working_layer(pdir / meta["path"])
    total_features = len(gdf)
    wgs = gdf.to_crs("EPSG:4326") if gdf.crs else gdf

    # Viewport BBox filtering for large datasets (> 20,000 features)
    if bbox and total_features > 20000:
        try:
            parts = [float(x) for x in bbox.split(",")]
            if len(parts) == 4:
                from shapely.geometry import box
                view_box = box(*parts)
                wgs = wgs[wgs.geometry.intersects(view_box)].copy()
        except Exception:
            pass

    # Adaptive simplification tolerance based on zoom level or feature count
    effective_simplify = simplify
    if effective_simplify <= 0 and (total_features > 20000 or (zoom is not None and zoom < 11)):
        z_val = zoom if zoom is not None else 10.0
        if z_val < 14:
            effective_simplify = max(0.00005, 0.008 / (2 ** max(0.0, z_val - 7.0)))

    if effective_simplify > 0 and not wgs.empty:
        wgs["geometry"] = wgs.geometry.simplify(effective_simplify, preserve_topology=True)

    if len(wgs) > limit:
        wgs = wgs.head(limit).copy()

    # Also compute legend breaks / categories for current style
    style = meta.get("style", {})
    col = style.get("column")
    breaks = []
    categories = []
    if col and col in gdf.columns:
        if style.get("mode") in ("choropleth", "proportional", "heatmap"):
            breaks = compute_class_breaks(
                gdf[col],
                method=style.get("method", "quantile"),
                k=int(style.get("classes", 5)),
            )
        elif style.get("mode") == "category":
            categories = [str(x) for x in gdf[col].dropna().unique().tolist()[:20]]

    fc = json.loads(wgs.to_json())
    fc["petalab_meta"] = {
        "layer_id": lid,
        "name": meta["name"],
        "geom_type": meta["geom_type"],
        "bbox": meta["bbox"],
        "breaks": breaks,
        "categories": categories,
        "total_features": total_features,
        "returned_features": len(wgs),
        "simplified_tolerance": effective_simplify,
        "large_data_mode": total_features > 20000,
    }
    return fc
