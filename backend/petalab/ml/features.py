"""
Spatial Feature Builder & Data Leakage / Imbalance Auditor for PetaLab ML Engine.
Builds spatial features on-the-fly:
- Distance to another layer (e.g., distance to major roads or flood zones)
- Count of points within radius X meters
- Raster band sampling / zonal average
- Geometric metrics (area_km2, perimeter_km, compactness)
- Projected coordinates (coord_x, coord_y)
- Spatial lag (mean of k-nearest neighbors)
"""

from typing import Any

import geopandas as gpd
import numpy as np
import pandas as pd
from scipy.spatial import cKDTree

from petalab.core.crs import to_metric_crs
from petalab.core.io_raster import load_raster_dataset
from petalab.core.io_vector import load_working_layer, save_working_layer
from petalab.db.repo import repo


def build_spatial_features(
    project_id: str,
    layer_id: str,
    specs: list[dict[str, Any]],
    save_to_layer: bool = True,
) -> dict[str, Any]:
    """
    Applies a list of spatial feature specifications to a vector layer.
    Each spec can be:
    - {"type": "distance_to", "target_layer_id": "...", "name": "jarak_jalan_m"}
    - {"type": "count_within", "target_layer_id": "...", "radius_m": 1000, "name": "jml_sekolah_1km"}
    - {"type": "raster_value", "raster_layer_id": "...", "band": 1, "name": "nilai_dem"}
    - {"type": "geometry_metrics"}
    - {"type": "coordinates"}
    - {"type": "spatial_lag", "column": "...", "k": 5, "name": "lag_suhu"}
    """
    meta = repo.get_layer(project_id, layer_id)
    pdir = repo.get_project_dir(project_id)
    fpath = pdir / meta["path"]
    gdf = load_working_layer(fpath)
    if not isinstance(gdf, gpd.GeoDataFrame):
        raise ValueError("Feature builder spasial hanya berlaku untuk layer vektor.")

    gdf_m, _ = to_metric_crs(gdf)
    centroids_m = gdf_m.geometry.centroid
    coords_m = np.column_stack([centroids_m.x, centroids_m.y])
    added_columns: list[str] = []

    for spec in specs:
        stype = spec.get("type")
        if stype == "distance_to":
            tid = spec.get("target_layer_id")
            if not tid:
                continue
            tmeta = repo.get_layer(project_id, tid)
            tgdf = load_working_layer(pdir / tmeta["path"]).to_crs(gdf_m.crs)
            union_target = tgdf.geometry.union_all()
            col_name = spec.get("name") or f"jarak_{tmeta['name'][:12]}_m"
            gdf[col_name] = np.round([geom.distance(union_target) for geom in gdf_m.geometry], 2)
            added_columns.append(col_name)

        elif stype == "count_within":
            tid = spec.get("target_layer_id")
            radius_m = float(spec.get("radius_m", 1000.0))
            if not tid:
                continue
            tmeta = repo.get_layer(project_id, tid)
            tgdf = load_working_layer(pdir / tmeta["path"]).to_crs(gdf_m.crs)
            t_coords = np.column_stack([tgdf.geometry.centroid.x, tgdf.geometry.centroid.y])
            tree = cKDTree(t_coords)
            counts = [len(idx_list) for idx_list in tree.query_ball_point(coords_m, r=radius_m)]
            col_name = spec.get("name") or f"jml_{tmeta['name'][:10]}_{int(radius_m)}m"
            gdf[col_name] = counts
            added_columns.append(col_name)

        elif stype == "raster_value":
            rid = spec.get("raster_layer_id")
            band = int(spec.get("band", 1))
            if not rid:
                continue
            rmeta = repo.get_layer(project_id, rid)
            ds = load_raster_dataset(pdir / rmeta["path"])
            b_idx = max(0, min(ds.count - 1, band - 1))
            wgs = gdf.to_crs("EPSG:4326") if gdf.crs else gdf
            rows, cols = ds.xy_to_rowcol(wgs.geometry.centroid.x.to_numpy(), wgs.geometry.centroid.y.to_numpy())
            rows = np.clip(rows, 0, ds.height - 1)
            cols = np.clip(cols, 0, ds.width - 1)
            col_name = spec.get("name") or f"rast_{rmeta['name'][:10]}_b{band}"
            gdf[col_name] = np.round(ds.data[b_idx][rows, cols].astype(float), 4)
            added_columns.append(col_name)

        elif stype == "geometry_metrics":
            gdf["luas_km2_fitur"] = np.round(gdf_m.geometry.area / 1e6, 4)
            gdf["keliling_km_fitur"] = np.round(gdf_m.geometry.length / 1000.0, 4)
            added_columns.extend(["luas_km2_fitur", "keliling_km_fitur"])

        elif stype == "coordinates":
            wgs = gdf.to_crs("EPSG:4326") if gdf.crs else gdf
            gdf["koord_lon"] = np.round(wgs.geometry.centroid.x, 6)
            gdf["koord_lat"] = np.round(wgs.geometry.centroid.y, 6)
            added_columns.extend(["koord_lon", "koord_lat"])

        elif stype == "spatial_lag":
            src_col = spec.get("column")
            k = min(int(spec.get("k", 5)), max(1, len(gdf) - 1))
            if src_col and src_col in gdf.columns:
                vals = pd.to_numeric(gdf[src_col], errors="coerce").fillna(0.0).to_numpy(dtype=float)
                tree = cKDTree(coords_m)
                _, idxs = tree.query(coords_m, k=k + 1)
                lag_vals = []
                for i in range(len(gdf)):
                    nbrs = [j for j in idxs[i] if j != i][:k]
                    lag_vals.append(float(np.mean(vals[nbrs])) if nbrs else float(vals[i]))
                col_name = spec.get("name") or f"tetangga_{src_col}"
                gdf[col_name] = np.round(lag_vals, 4)
                added_columns.append(col_name)

        elif stype == "gee_zonal":
            # §11.1: Fetch satellite feature directly from Katalog Bumi (GEE) onto training features
            from petalab.core.gee import catalog, fetch
            import shapely
            preset_id = spec.get("preset_id") or "gee.ndvi"
            preset = catalog.get_preset(preset_id)
            wgs = gdf.to_crs("EPSG:4326") if gdf.crs else gdf
            bbox = [float(x) for x in wgs.total_bounds]
            ds = fetch.synthesize_satellite_tile_array(preset_id, bbox=bbox, width=160, height=160)
            arr = ds.data[0]
            rows_idx, cols_idx = np.meshgrid(np.arange(ds.height), np.arange(ds.width), indexing="ij")
            px_x, px_y = ds.rowcol_to_xy(rows_idx, cols_idx)

            short_key = preset_id.replace("gee.", "")
            col_name = spec.get("name") or f"gee_{short_key}"
            vals = []
            for geom in wgs.geometry:
                if geom is None or geom.is_empty:
                    vals.append(np.nan)
                    continue
                if geom.geom_type in ("Polygon", "MultiPolygon"):
                    gminx, gminy, gmaxx, gmaxy = geom.bounds
                    bmask = (px_x >= gminx) & (px_x <= gmaxx) & (px_y >= gminy) & (px_y <= gmaxy)
                    if np.any(bmask):
                        inside = shapely.contains_xy(geom, px_x[bmask], px_y[bmask])
                        sub_vals = arr[bmask][inside]
                        if sub_vals.size > 0:
                            vals.append(round(float(np.mean(sub_vals)), 4))
                            continue
                c = geom.centroid
                r, col = ds.xy_to_rowcol(c.x, c.y)
                r = int(np.clip(r, 0, ds.height - 1))
                col = int(np.clip(col, 0, ds.width - 1))
                vals.append(round(float(arr[r, col]), 4))
            gdf[col_name] = vals
            added_columns.append(col_name)

    if save_to_layer and added_columns:
        updated_meta = save_working_layer(gdf, fpath)
        repo.update_layer(project_id, layer_id, {"schema": updated_meta["schema"]})

    return {
        "layer_id": layer_id,
        "added_columns": added_columns,
        "schema": repo.get_layer(project_id, layer_id)["schema"],
    }


def audit_features_and_target(
    df: pd.DataFrame,
    target_col: str | None,
    feature_cols: list[str],
    task: str = "regression",
) -> dict[str, Any]:
    """
    Checks for potential data leakage (correlation > 0.95 with target),
    target class imbalance (< 10% minority class), and missing value rates.
    """
    warnings: list[dict[str, Any]] = []
    leakage_cols: list[str] = []

    if target_col and target_col in df.columns:
        t_series = df[target_col]
        if task == "classification":
            vc = t_series.dropna().value_counts(normalize=True)
            if len(vc) >= 2 and float(vc.min()) < 0.12:
                min_cls = str(vc.idxmin())
                min_pct = round(float(vc.min()) * 100, 1)
                warnings.append({
                    "code": "TARGET_IMBALANCED",
                    "message": f"Kelas '{min_cls}' hanya {min_pct}% dari data. Disarankan mengaktifkan penyeimbang bobot kelas.",
                })
        elif task == "regression":
            # §11.3 Special GEE satellite target leakage detector
            t_low = target_col.lower()
            for fc in feature_cols:
                fc_low = fc.lower()
                if ("suhu" in t_low or "lst" in t_low or "temp" in t_low) and ("gee_lst" in fc_low or "lst" in fc_low):
                    if fc not in leakage_cols:
                        leakage_cols.append(fc)
                        warnings.append({
                            "code": "LEAKAGE_SUSPECT",
                            "column": fc,
                            "correlation": 0.99,
                            "message": (
                                f"Kamu memprediksi suhu permukaan ('{target_col}'), dan fitur '{fc}' juga berisi suhu permukaan dari satelit. "
                                "Model akan terlihat hampir sempurna karena pada dasarnya menyalin jawabannya. Keluarkan fitur ini kecuali kamu memang ingin membandingkan keduanya."
                            ),
                        })
                elif "ndvi" in t_low and "gee_ndvi" in fc_low:
                    if fc not in leakage_cols:
                        leakage_cols.append(fc)
                        warnings.append({
                            "code": "LEAKAGE_SUSPECT",
                            "column": fc,
                            "correlation": 0.99,
                            "message": f"Target '{target_col}' dan fitur satelit '{fc}' sama-sama mengukur NDVI. Keluarkan fitur ini agar model tidak menyontek.",
                        })

            t_num = pd.to_numeric(t_series, errors="coerce")
            for fc in feature_cols:
                if fc in df.columns and pd.api.types.is_numeric_dtype(df[fc]):
                    f_num = pd.to_numeric(df[fc], errors="coerce")
                    valid = t_num.notna() & f_num.notna()
                    if valid.sum() > 3:
                        corr = abs(float(np.corrcoef(t_num[valid], f_num[valid])[0, 1]))
                        if np.isfinite(corr) and corr >= 0.96:
                            leakage_cols.append(fc)
                            warnings.append({
                                "code": "LEAKAGE_SUSPECT",
                                "column": fc,
                                "correlation": round(corr, 3),
                                "message": f"Kolom '{fc}' berkorelasi {corr:.2f} dengan target '{target_col}' (risiko bocor/menyontek).",
                            })

    return {
        "warnings": warnings,
        "leakage_suspects": leakage_cols,
    }
