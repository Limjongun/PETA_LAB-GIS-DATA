from typing import Any
import geopandas as gpd
import pandas as pd
import shapely

from petalab.core.crs import estimate_metric_crs, format_crs_friendly, get_crs_code


def validate_and_clean_geodataframe(
    gdf: gpd.GeoDataFrame,
    layer_name: str,
    auto_fix_geometry: bool = True,
    drop_empty: bool = False,
) -> tuple[gpd.GeoDataFrame, dict[str, Any]]:
    """
    Validates CRS, coordinate bounds (swapped lat/lon), invalid geometries,
    empty geometries, and string-encoded numeric columns.
    Returns (cleaned_gdf, beginner_friendly_import_report).
    """
    warnings: list[dict[str, Any]] = []
    tips: list[str] = []
    fixes_applied: list[str] = []

    # 1. CRS check
    crs_missing = gdf.crs is None
    if crs_missing:
        gdf = gdf.set_crs("EPSG:4326")
        warnings.append({
            "code": "CRS_MISSING",
            "message": "Info sistem koordinat (.prj) tidak ditemukan; disetel otomatis ke WGS 84 (EPSG:4326).",
        })

    # 2. Empty geometries check
    empty_mask = gdf.geometry.isna() | gdf.geometry.is_empty
    empty_count = int(empty_mask.sum())
    if empty_count > 0:
        if drop_empty:
            gdf = gdf.loc[~empty_mask].copy()
            fixes_applied.append(f"{empty_count} baris tanpa bentuk geometri dibersihkan.")
        else:
            warnings.append({
                "code": "GEOM_EMPTY",
                "message": f"Ada {empty_count} baris tanpa bentuk geometri.",
            })

    # 3. Invalid geometries check
    valid_mask = gdf.geometry.is_valid
    invalid_count = int((~valid_mask & ~gdf.geometry.isna()).sum())
    if invalid_count > 0:
        if auto_fix_geometry:
            gdf["geometry"] = shapely.make_valid(gdf.geometry)
            fixes_applied.append(f"{invalid_count} bentuk rusak sudah diperbaiki otomatis (make_valid).")
        warnings.append({
            "code": "GEOM_INVALID",
            "count": invalid_count,
            "fixed": auto_fix_geometry,
            "message": (
                f"{invalid_count} bentuk rusak, sudah diperbaiki otomatis"
                if auto_fix_geometry
                else f"Ada {invalid_count} bentuk yang rusak (garis saling silang)."
            ),
        })

    # 4. Coordinate bounds / lat-lon swapped check (if geographic)
    if not gdf.empty and gdf.crs and gdf.crs.is_geographic:
        minx, miny, maxx, maxy = [float(x) for x in gdf.total_bounds]
        # Check if latitude is outside [-90, 90] or Indonesia data has lat ~112 and lon ~-7
        if (abs(miny) > 90 or abs(maxy) > 90) or (94 <= miny <= 142 and -12 <= minx <= 7):
            warnings.append({
                "code": "LATLON_SWAPPED",
                "message": "Sepertinya kolom lintang dan bujur tertukar.",
            })

    # 5. Coerce numeric columns stored as text
    coerced_cols: list[str] = []
    for col in gdf.columns:
        if col in ("geometry", "_fid"):
            continue
        if pd.api.types.is_object_dtype(gdf[col]) or pd.api.types.is_string_dtype(gdf[col]):
            non_null = gdf[col].dropna().astype(str).str.strip()
            if len(non_null) > 0:
                # Try converting numbers with comma or dot
                cleaned = non_null.str.replace(",", ".", regex=False)
                converted = pd.to_numeric(cleaned, errors="coerce")
                if converted.notna().mean() >= 0.92:
                    full_cleaned = gdf[col].astype(str).str.strip().str.replace(",", ".", regex=False)
                    gdf[col] = pd.to_numeric(full_cleaned, errors="coerce")
                    coerced_cols.append(col)
    if coerced_cols:
        fixes_applied.append(f"Kolom angka yang tersimpan sebagai teks dikonversi otomatis: {', '.join(coerced_cols)}")

    # 6. Assign stable internal _fid
    gdf = gdf.reset_index(drop=True)
    gdf["_fid"] = list(range(1, len(gdf) + 1))

    # 7. Metric UTM recommendation
    utm_crs = estimate_metric_crs(gdf)
    utm_friendly = format_crs_friendly(utm_crs)
    tips.append(f"Untuk mengukur jarak/luas secara akurat, PetaLab akan memakai {utm_friendly} secara otomatis.")

    geom_types = gdf.geometry.geom_type.dropna().unique().tolist()
    primary_geom = geom_types[0].lower() if geom_types else "unknown"
    geom_label = {
        "point": "titik",
        "multipoint": "titik",
        "linestring": "garis",
        "multilinestring": "garis",
        "polygon": "poligon",
        "multipolygon": "poligon",
    }.get(primary_geom, "fitur")

    col_count = len([c for c in gdf.columns if c not in ("geometry", "_fid")])
    crs_code = get_crs_code(gdf.crs)
    crs_friendly = format_crs_friendly(gdf.crs)

    report = {
        "layer_name": layer_name,
        "summary": f"{len(gdf)} {geom_label} · {col_count} kolom · Sistem koordinat: {crs_friendly}",
        "feature_count": len(gdf),
        "column_count": col_count,
        "geom_type": primary_geom,
        "geom_label": geom_label,
        "crs": crs_code,
        "crs_friendly": crs_friendly,
        "recommended_utm": format_crs_friendly(utm_crs),
        "invalid_geometry_count": invalid_count,
        "empty_geometry_count": empty_count,
        "warnings": warnings,
        "fixes_applied": fixes_applied,
        "tips": tips,
        "large_dataset_tile_mode": len(gdf) > 20000,
    }
    return gdf, report
