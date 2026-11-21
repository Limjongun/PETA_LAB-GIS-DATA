import csv
import json
import os
from pathlib import Path
import shutil
import tempfile
from typing import Any
import zipfile

import geopandas as gpd
import numpy as np
import pandas as pd
import pyogrio
import shapely
from shapely.geometry import Point

from petalab.core.crs import get_crs_code
from petalab.core.validate import validate_and_clean_geodataframe
from petalab.errors import PetaLabError

LAT_CANDIDATES = {"lat", "latitude", "lintang", "y", "coord_y", "lat_dd", "koord_y"}
LON_CANDIDATES = {"lon", "lng", "long", "longitude", "bujur", "x", "coord_x", "lon_dd", "koord_x"}
WKT_CANDIDATES = {"wkt", "geometry", "geom", "the_geom", "shape"}


def detect_coordinate_columns(df: pd.DataFrame) -> dict[str, str | None]:
    cols_lower = {str(c).strip().lower(): str(c) for c in df.columns}
    lat_col = next((cols_lower[k] for k in cols_lower if k in LAT_CANDIDATES), None)
    lon_col = next((cols_lower[k] for k in cols_lower if k in LON_CANDIDATES), None)
    wkt_col = next((cols_lower[k] for k in cols_lower if k in WKT_CANDIDATES), None)
    # Fuzzy substring check if exact not found
    if not lat_col:
        lat_col = next((orig for low, orig in cols_lower.items() if "lat" in low or "lintang" in low), None)
    if not lon_col:
        lon_col = next((orig for low, orig in cols_lower.items() if "lon" in low or "lng" in low or "bujur" in low), None)
    return {"lat_col": lat_col, "lon_col": lon_col, "wkt_col": wkt_col}


def read_tabular_file(file_path: Path) -> pd.DataFrame:
    suffix = file_path.suffix.lower()
    if suffix in (".xlsx", ".xls"):
        return pd.read_excel(file_path)
    if suffix == ".parquet":
        return pd.read_parquet(file_path)
    # CSV with automatic encoding & delimiter detection
    raw_bytes = file_path.read_bytes()
    text = None
    for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            text = raw_bytes.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        text = raw_bytes.decode("latin-1", errors="replace")

    sample_lines = "\n".join(text.splitlines()[:15])
    delimiter = ","
    try:
        dialect = csv.Sniffer().sniff(sample_lines, delimiters=",;\t|")
        delimiter = dialect.delimiter
    except Exception:
        if sample_lines.count(";") > sample_lines.count(","):
            delimiter = ";"
        elif sample_lines.count("\t") > sample_lines.count(","):
            delimiter = "\t"

    from io import StringIO
    return pd.read_csv(StringIO(text), sep=delimiter)


def _extract_safe_zip(zip_path: Path, dest_dir: Path) -> Path:
    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.namelist():
            member_path = (dest_dir / member).resolve()
            if not str(member_path).startswith(str(dest_dir.resolve())):
                raise PetaLabError("ZIP_SLIP", "File arsip .zip memiliki path tidak aman.", status_code=400)
        zf.extractall(dest_dir)
    shp_files = list(dest_dir.rglob("*.shp"))
    if not shp_files:
        gpkg_files = list(dest_dir.rglob("*.gpkg"))
        if gpkg_files:
            return gpkg_files[0]
        geojson_files = list(dest_dir.rglob("*.geojson")) + list(dest_dir.rglob("*.json"))
        if geojson_files:
            return geojson_files[0]
        raise PetaLabError("SHP_INCOMPLETE", detail="Tidak ada file .shp di dalam arsip .zip")
    shp = shp_files[0]
    if not shp.with_suffix(".dbf").exists() or not shp.with_suffix(".shx").exists():
        raise PetaLabError("SHP_INCOMPLETE", detail="File .dbf atau .shx tidak ditemukan bersama .shp")
    return shp


def read_any_vector_or_table(
    file_path: Path,
    lat_col: str | None = None,
    lon_col: str | None = None,
    wkt_col: str | None = None,
    crs_override: str | None = None,
    swap_latlon: bool = False,
) -> tuple[gpd.GeoDataFrame | pd.DataFrame, str, dict[str, Any]]:
    """
    Reads vector or tabular file.
    Returns (gdf_or_df, kind ['vector'|'table'], import_report).
    """
    suffix = file_path.suffix.lower()
    layer_name = file_path.stem

    if suffix == ".shp":
        if not file_path.with_suffix(".dbf").exists() or not file_path.with_suffix(".shx").exists():
            raise PetaLabError("SHP_INCOMPLETE")

    if suffix in (".csv", ".xlsx", ".xls"):
        df = read_tabular_file(file_path)
        detected = detect_coordinate_columns(df)
        use_wkt = wkt_col or detected["wkt_col"]
        use_lat = lat_col or detected["lat_col"]
        use_lon = lon_col or detected["lon_col"]

        if swap_latlon and use_lat and use_lon:
            use_lat, use_lon = use_lon, use_lat

        if use_wkt and use_wkt in df.columns:
            geoms = shapely.from_wkt(df[use_wkt].astype(str), on_invalid="ignore")
            gdf = gpd.GeoDataFrame(df, geometry=geoms, crs=crs_override or "EPSG:4326")
            gdf, report = validate_and_clean_geodataframe(gdf, layer_name)
            report["detected_coordinates"] = {"mode": "wkt", "wkt_col": use_wkt}
            return gdf, "vector", report

        if use_lat and use_lon and use_lat in df.columns and use_lon in df.columns:
            xs = pd.to_numeric(df[use_lon].astype(str).str.replace(",", "."), errors="coerce")
            ys = pd.to_numeric(df[use_lat].astype(str).str.replace(",", "."), errors="coerce")
            geoms = [Point(x, y) if pd.notna(x) and pd.notna(y) else None for x, y in zip(xs, ys)]
            gdf = gpd.GeoDataFrame(df, geometry=geoms, crs=crs_override or "EPSG:4326")
            gdf, report = validate_and_clean_geodataframe(gdf, layer_name)
            report["detected_coordinates"] = {"mode": "latlon", "lat_col": use_lat, "lon_col": use_lon}
            return gdf, "vector", report

        # Non-spatial table
        df = df.reset_index(drop=True)
        df["_fid"] = list(range(1, len(df) + 1))
        report = {
            "layer_name": layer_name,
            "summary": f"Tabel {len(df)} baris · {len(df.columns) - 1} kolom (tanpa koordinat, siap di-Join ke layer peta)",
            "feature_count": len(df),
            "column_count": len(df.columns) - 1,
            "geom_type": None,
            "geom_label": "baris tabel",
            "crs": None,
            "warnings": [],
            "fixes_applied": [],
            "tips": ["Gunakan fitur Join Tabel di menu Tabel untuk menggabungkan data ini ke peta wilayah."],
        }
        return df, "table", report

    if suffix == ".parquet":
        try:
            gdf = gpd.read_parquet(file_path)
            if crs_override:
                gdf = gdf.set_crs(crs_override, allow_override=True)
            gdf, report = validate_and_clean_geodataframe(gdf, layer_name)
            return gdf, "vector", report
        except Exception:
            df = pd.read_parquet(file_path)
            df["_fid"] = list(range(1, len(df) + 1))
            report = {
                "layer_name": layer_name,
                "summary": f"Tabel Parquet {len(df)} baris · {len(df.columns) - 1} kolom",
                "feature_count": len(df),
                "column_count": len(df.columns) - 1,
                "geom_type": None,
                "crs": None,
                "warnings": [],
                "fixes_applied": [],
                "tips": [],
            }
            return df, "table", report

    # Vector formats (.zip, .shp, .geojson, .json, .gpkg, .kml, .fgb)
    with tempfile.TemporaryDirectory() as tmpdir:
        target_path = file_path
        if suffix == ".zip":
            target_path = _extract_safe_zip(file_path, Path(tmpdir))
        try:
            gdf = pyogrio.read_dataframe(target_path)
        except Exception:
            gdf = gpd.read_file(target_path)

    if crs_override:
        gdf = gdf.set_crs(crs_override, allow_override=True)

    if swap_latlon and not gdf.empty:
        gdf["geometry"] = gdf.geometry.map(
            lambda geom: shapely.ops.transform(lambda x, y, z=None: (y, x), geom) if geom is not None else None
        )

    gdf, report = validate_and_clean_geodataframe(gdf, layer_name)
    return gdf, "vector", report


def build_schema_summary(df: pd.DataFrame | gpd.GeoDataFrame) -> list[dict[str, Any]]:
    schema: list[dict[str, Any]] = []
    for col in df.columns:
        if col == "geometry":
            continue
        series = df[col]
        if pd.api.types.is_integer_dtype(series):
            dtype = "integer"
        elif pd.api.types.is_float_dtype(series):
            dtype = "number"
        elif pd.api.types.is_bool_dtype(series):
            dtype = "boolean"
        else:
            dtype = "string"
        non_null = series.dropna()
        sample_val = non_null.iloc[0] if len(non_null) > 0 else None
        if isinstance(sample_val, (np.generic,)):
            sample_val = sample_val.item()
        elif pd.notna(sample_val) and not isinstance(sample_val, (int, float, bool, str)):
            sample_val = str(sample_val)
        schema.append({
            "name": str(col),
            "type": dtype,
            "nullable": bool(series.isna().any()),
            "null_count": int(series.isna().sum()),
            "unique_count": int(series.nunique(dropna=True)),
            "sample": sample_val,
        })
    return schema


def default_style_for_geom(geom_type: str | None, layer_index: int = 0) -> dict[str, Any]:
    palette = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#4f46e5"]
    color = palette[layer_index % len(palette)]
    return {
        "mode": "single",  # single | category | choropleth | proportional | heatmap
        "color": color,
        "fillColor": color,
        "strokeColor": "#1e293b" if geom_type and "polygon" in geom_type else color,
        "strokeWidth": 1.5,
        "opacity": 0.78,
        "pointRadius": 6,
        "column": None,
        "method": "quantile",  # quantile | equal_interval | natural_breaks
        "classes": 5,
        "palette": "viridis",
        "labelColumn": None,
    }


def save_working_layer(
    df: gpd.GeoDataFrame | pd.DataFrame,
    dest_parquet_path: Path,
) -> dict[str, Any]:
    """Atomically writes GeoDataFrame or DataFrame to GeoParquet / Parquet and extracts metadata."""
    dest_parquet_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = dest_parquet_path.with_suffix(".parquet.tmp")

    df = df.copy()
    if "_fid" not in df.columns:
        df["_fid"] = list(range(1, len(df) + 1))

    is_spatial = isinstance(df, gpd.GeoDataFrame) and "geometry" in df.columns and df.geometry is not None
    if is_spatial:
        gdf: gpd.GeoDataFrame = df
        if gdf.crs is None:
            gdf = gdf.set_crs("EPSG:4326")
        gdf.to_parquet(tmp_path, index=False)
        os.replace(tmp_path, dest_parquet_path)

        # Compute WGS84 bounding box for map display
        try:
            wgs_gdf = gdf.to_crs("EPSG:4326") if get_crs_code(gdf.crs) != "EPSG:4326" else gdf
            bounds = [float(x) if np.isfinite(x) else 0.0 for x in wgs_gdf.total_bounds]
        except Exception:
            bounds = [112.6, -7.35, 112.85, -7.2]

        geom_types = gdf.geometry.geom_type.dropna().unique().tolist()
        raw_geom = geom_types[0].lower() if geom_types else "polygon"
        if "point" in raw_geom:
            gtype = "point"
        elif "line" in raw_geom:
            gtype = "line"
        else:
            gtype = "polygon"

        return {
            "kind": "vector",
            "geom_type": gtype,
            "crs": get_crs_code(gdf.crs),
            "feature_count": len(gdf),
            "bbox": bounds,
            "schema": build_schema_summary(gdf),
        }
    else:
        if "geometry" in df.columns:
            df = df.drop(columns=["geometry"])
        df.to_parquet(tmp_path, index=False)
        os.replace(tmp_path, dest_parquet_path)
        return {
            "kind": "table",
            "geom_type": None,
            "crs": None,
            "feature_count": len(df),
            "bbox": None,
            "schema": build_schema_summary(df),
        }


def load_working_layer(parquet_path: Path, only_selected_fids: list[int] | None = None) -> gpd.GeoDataFrame | pd.DataFrame:
    try:
        df = gpd.read_parquet(parquet_path)
    except Exception:
        df = pd.read_parquet(parquet_path)
    if only_selected_fids:
        fid_set = set(int(x) for x in only_selected_fids)
        df = df[df["_fid"].isin(fid_set)].copy()
    return df


def export_vector_or_table(
    parquet_path: Path,
    out_path: Path,
    fmt: str,
    only_selected_fids: list[int] | None = None,
    csv_delimiter: str = ";",
) -> Path:
    df = load_working_layer(parquet_path, only_selected_fids=only_selected_fids)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fmt = fmt.lower()

    if fmt == "parquet":
        shutil.copy2(parquet_path, out_path) if not only_selected_fids else df.to_parquet(out_path, index=False)
        return out_path

    if fmt in ("csv", "xlsx"):
        out_df = pd.DataFrame(df.copy())
        if isinstance(df, gpd.GeoDataFrame) and "geometry" in df.columns:
            wgs = df.to_crs("EPSG:4326") if df.crs else df
            if wgs.crs is not None and not wgs.empty:
                from petalab.core.crs import to_metric_crs
                metric_gdf, _ = to_metric_crs(wgs)
                centroids = metric_gdf.geometry.centroid.to_crs("EPSG:4326")
            else:
                centroids = wgs.geometry.centroid
            if "long" not in out_df.columns and "longitude" not in out_df.columns:
                out_df["long"] = centroids.x.round(6)
            if "lat" not in out_df.columns and "latitude" not in out_df.columns:
                out_df["lat"] = centroids.y.round(6)
            out_df["wkt"] = wgs.geometry.to_wkt()
            out_df = out_df.drop(columns=["geometry"])
        out_df = out_df.drop(columns=["_fid"], errors="ignore")

        if fmt == "csv":
            sep = ";" if csv_delimiter == ";" else ","
            out_df.to_csv(out_path, index=False, encoding="utf-8-sig", sep=sep)
            return out_path

        # Styled native Excel (.xlsx) with frozen bold header and auto-fitted column widths
        try:
            from openpyxl.styles import Alignment, Font, PatternFill

            with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
                out_df.to_excel(writer, index=False, sheet_name="Data_PetaLab")
                ws = writer.sheets["Data_PetaLab"]
                header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
                header_font = Font(bold=True, color="FFFFFF", name="Calibri", size=11)
                for col_idx, col_name in enumerate(out_df.columns, start=1):
                    cell = ws.cell(row=1, column=col_idx)
                    cell.fill = header_fill
                    cell.font = header_font
                    cell.alignment = Alignment(horizontal="center", vertical="center")
                    sample_lens = [len(str(v)) for v in out_df[col_name].head(200).fillna("").tolist()]
                    max_len = max([len(str(col_name)), *sample_lens])
                    ws.column_dimensions[cell.column_letter].width = min(max_len + 4, 42)
                ws.freeze_panes = "A2"
        except Exception:
            out_df.to_excel(out_path, index=False)
        return out_path

    if not isinstance(df, gpd.GeoDataFrame):
        raise PetaLabError("NOT_SPATIAL", "Tabel non-spasial hanya dapat diekspor ke CSV, XLSX, atau Parquet.")

    if fmt == "geojson":
        wgs = df.to_crs("EPSG:4326") if df.crs else df
        wgs.to_file(out_path, driver="GeoJSON")
        return out_path

    if fmt == "gpkg":
        df.to_file(out_path, driver="GPKG")
        return out_path

    if fmt == "kml":
        wgs = df.to_crs("EPSG:4326") if df.crs else df
        pyogrio.write_dataframe(wgs, out_path, driver="KML")
        return out_path

    if fmt in ("shp", "shapefile", "shp.zip"):
        with tempfile.TemporaryDirectory() as tmpdir:
            shp_file = Path(tmpdir) / f"{out_path.stem}.shp"
            df.to_file(shp_file, driver="ESRI Shapefile")
            with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for f in Path(tmpdir).iterdir():
                    zf.write(f, arcname=f.name)
        return out_path

    raise PetaLabError("UNSUPPORTED_FORMAT", f"Format ekspor '{fmt}' belum didukung.")
