"""
Dashboard Statistics, Spatial Geostatistics, Cross-Filter Summary, & Choropleth Classification Engine.
Computes context-aware KPI cards, spatial Nearest Neighbor & dispersion metrics, segment breakdowns &
boxplots, Pearson correlation matrix, 2D spatial coordinate plot, histograms with IQR outlier detection,
Top-N / Bottom-N charts, scatter plots with linear regression + R², automatic Indonesian executive
insights, data quality audits, and choropleth class breaks.
"""

from pathlib import Path
from typing import Any

import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import MultiPoint

from petalab.core.crs import to_metric_crs
from petalab.core.duck import json_safe_records
from petalab.core.io_vector import load_working_layer

_LOW_PRIORITY_NUM_COLS = {
    "id",
    "fid",
    "_fid",
    "gid",
    "objectid",
    "kode",
    "lat",
    "latitude",
    "lon",
    "long",
    "longitude",
    "long_akurat",
    "lat_akurat",
    "utm_x_m",
    "utm_y_m",
    "x",
    "y",
}

_HIGH_PRIORITY_CAT_COLS = (
    "segmen_zona",
    "kategori",
    "kategori_banjir",
    "wilayah",
    "kelas",
    "cluster",
    "kecamatan",
    "nama",
)


def compute_class_breaks(values: pd.Series, method: str = "quantile", k: int = 5) -> list[float]:
    clean = pd.to_numeric(values, errors="coerce").dropna().to_numpy(dtype=float)
    clean = clean[np.isfinite(clean)]
    if len(clean) == 0:
        return [0.0, 1.0]
    k = max(2, min(9, int(k)))
    vmin, vmax = float(np.min(clean)), float(np.max(clean))
    if vmin == vmax:
        return [vmin, vmax + 1.0]

    method = method.lower()
    if method == "equal_interval":
        breaks = np.linspace(vmin, vmax, k + 1).tolist()
    elif method in ("natural_breaks", "jenks"):
        quantiles = np.linspace(0, 100, k + 1)
        breaks = np.percentile(clean, quantiles).tolist()
        try:
            from sklearn.cluster import KMeans

            unique_vals = np.unique(clean)
            if len(unique_vals) >= k:
                km = KMeans(n_clusters=k, random_state=42, n_init=5).fit(clean.reshape(-1, 1))
                centers = np.sort(km.cluster_centers_.ravel())
                midpoints = ((centers[:-1] + centers[1:]) / 2.0).tolist()
                breaks = [vmin] + midpoints + [vmax]
        except Exception:
            pass
    else:  # quantile
        quantiles = np.linspace(0, 100, k + 1)
        breaks = np.percentile(clean, quantiles).tolist()

    dedup = [round(float(breaks[0]), 4)]
    for b in breaks[1:]:
        rb = round(float(b), 4)
        if rb > dedup[-1]:
            dedup.append(rb)
    if len(dedup) < 2:
        dedup.append(dedup[0] + 1.0)
    return dedup


def _pick_smart_default_numeric(numeric_cols: list[str]) -> str | None:
    if not numeric_cols:
        return None
    preferred = [c for c in numeric_cols if c.lower() not in _LOW_PRIORITY_NUM_COLS]
    return preferred[0] if preferred else numeric_cols[0]


def _pick_smart_default_category(string_cols: list[str], attr_cols: list[str], df: pd.DataFrame) -> str | None:
    lower_map = {c.lower(): c for c in attr_cols}
    for key in _HIGH_PRIORITY_CAT_COLS:
        if key in lower_map:
            return lower_map[key]
    # Prefer string column with moderate cardinality (2..15 unique values) for meaningful segmentation
    for c in string_cols:
        nu = int(df[c].nunique(dropna=True))
        if 2 <= nu <= 15:
            return c
    return string_cols[0] if string_cols else (attr_cols[0] if attr_cols else None)


def compute_layer_dashboard_stats(
    parquet_path: Path,
    selected_fids: list[int] | None = None,
    num_col: str | None = None,
    cat_col: str | None = None,
    scatter_x: str | None = None,
    scatter_y: str | None = None,
    top_n_label_col: str | None = None,
) -> dict[str, Any]:
    df = load_working_layer(parquet_path)
    is_spatial = isinstance(df, gpd.GeoDataFrame) and "geometry" in df.columns
    total_count = len(df)

    # Selection subset for cross-filtering ("Terpilih vs Semua")
    sel_set = set(int(x) for x in selected_fids) if selected_fids else set()
    sel_df = df[df["_fid"].isin(sel_set)] if sel_set else df

    # 1. KPI & Spatial Geostatistics (UTM Metric)
    area_km2 = 0.0
    length_km = 0.0
    invalid_geom_count = 0
    geom_kind = "table"
    utm_crs_str = "Non-spasial"
    hull_area_km2 = 0.0
    span_width_km = 0.0
    span_height_km = 0.0
    density_per_km2 = 0.0
    mean_center: list[float] | None = None
    std_distance_km = 0.0
    avg_nnd_m = 0.0
    min_nnd_m = 0.0
    max_nnd_m = 0.0
    nni_ratio: float | None = None
    spatial_pattern = "N/A"
    wgs_centroids_x: np.ndarray | None = None
    wgs_centroids_y: np.ndarray | None = None

    if is_spatial and not df.empty:
        gtypes = set(df.geometry.geom_type.dropna().unique())
        if any("Polygon" in g for g in gtypes):
            geom_kind = "polygon"
        elif any("Line" in g for g in gtypes):
            geom_kind = "line"
        else:
            geom_kind = "point"

        try:
            metric_gdf, _ = to_metric_crs(df)
            utm_crs_str = metric_gdf.crs.to_string() if metric_gdf.crs else "EPSG:3857"
            area_km2 = round(float(metric_gdf.geometry.area.sum() / 1e6), 2)
            length_km = round(float(metric_gdf.geometry.length.sum() / 1000.0), 2)
            invalid_geom_count = int((~df.geometry.is_valid).sum())

            # Centroid coordinates in metric UTM & WGS 84
            m_cent = metric_gdf.geometry.centroid
            mx = m_cent.x.to_numpy(dtype=float)
            my = m_cent.y.to_numpy(dtype=float)
            valid_m = np.isfinite(mx) & np.isfinite(my)
            if valid_m.any():
                mx_v, my_v = mx[valid_m], my[valid_m]
                span_width_km = round(float((mx_v.max() - mx_v.min()) / 1000.0), 2)
                span_height_km = round(float((my_v.max() - my_v.min()) / 1000.0), 2)
                mean_mx, mean_my = float(mx_v.mean()), float(my_v.mean())
                std_distance_km = round(
                    float(np.sqrt(np.mean((mx_v - mean_mx) ** 2 + (my_v - mean_my) ** 2)) / 1000.0),
                    2,
                )

                # Convex hull area (works for points, lines, and polygons)
                if len(mx_v) >= 3:
                    hull = MultiPoint(list(zip(mx_v, my_v))).convex_hull
                    hull_area_km2 = round(float(hull.area / 1e6), 2)
                effective_area = area_km2 if area_km2 > 0 else hull_area_km2
                if effective_area > 0:
                    density_per_km2 = round(float(len(mx_v) / effective_area), 2)

                # Nearest Neighbor Distance & Clark-Evans R ratio (sampled up to 1500 pts for speed)
                if len(mx_v) >= 2:
                    from scipy.spatial import cKDTree

                    pts_m = np.column_stack([mx_v[:1500], my_v[:1500]])
                    tree = cKDTree(pts_m)
                    dists, _ = tree.query(pts_m, k=2)
                    nn_dists = dists[:, 1]
                    avg_nnd_m = round(float(np.mean(nn_dists)), 1)
                    min_nnd_m = round(float(np.min(nn_dists)), 1)
                    max_nnd_m = round(float(np.max(nn_dists)), 1)
                    if effective_area > 0:
                        expected_nnd_m = 0.5 / np.sqrt(len(pts_m) / (effective_area * 1e6))
                        if expected_nnd_m > 0:
                            r_val = float(avg_nnd_m / expected_nnd_m)
                            nni_ratio = round(r_val, 3)
                            if r_val < 0.85:
                                spatial_pattern = "Mengelompok (Clustered)"
                            elif r_val > 1.15:
                                spatial_pattern = "Tersebar Merata (Dispersed)"
                            else:
                                spatial_pattern = "Acak (Random)"

            # WGS 84 centroids for 2D Spatial Map Plot
            wgs_cent = gpd.GeoSeries(m_cent, crs=metric_gdf.crs).to_crs("EPSG:4326")
            wgs_centroids_x = wgs_cent.x.to_numpy(dtype=float)
            wgs_centroids_y = wgs_cent.y.to_numpy(dtype=float)
            valid_w = np.isfinite(wgs_centroids_x) & np.isfinite(wgs_centroids_y)
            if valid_w.any():
                mean_center = [
                    round(float(wgs_centroids_x[valid_w].mean()), 6),
                    round(float(wgs_centroids_y[valid_w].mean()), 6),
                ]
        except Exception:
            pass

    attr_cols = [c for c in df.columns if c not in ("geometry", "_fid")]
    total_cells = max(1, len(df) * max(1, len(attr_cols)))
    missing_cells = int(df[attr_cols].isna().sum().sum()) if attr_cols else 0
    missing_pct = round((missing_cells / total_cells) * 100.0, 2)

    numeric_cols = [c for c in attr_cols if pd.api.types.is_numeric_dtype(df[c])]
    string_cols = [c for c in attr_cols if c not in numeric_cols]

    smart_num = _pick_smart_default_numeric(numeric_cols)
    active_num_col = num_col if (num_col and num_col in numeric_cols) else smart_num
    active_cat_col = cat_col if (cat_col and cat_col in attr_cols) else _pick_smart_default_category(string_cols, attr_cols, df)
    active_label_col = top_n_label_col if (top_n_label_col and top_n_label_col in attr_cols) else (string_cols[0] if string_cols else "_fid")

    # 2. Histogram & Full Descriptive Statistics + IQR Outlier Detection
    histogram_data: dict[str, Any] = {"column": active_num_col, "bins": [], "counts_all": [], "counts_selected": [], "stats": {}}
    outlier_fids: list[int] = []
    if active_num_col:
        s_series = pd.to_numeric(df[active_num_col], errors="coerce")
        s_all = s_series.dropna()
        if len(s_all) > 0:
            counts_all, bin_edges = np.histogram(s_all, bins=min(15, max(5, int(np.sqrt(len(s_all))))))
            if sel_set:
                s_sel = pd.to_numeric(sel_df[active_num_col], errors="coerce").dropna()
                counts_sel, _ = np.histogram(s_sel, bins=bin_edges)
            else:
                counts_sel = np.zeros_like(counts_all)

            q1 = float(s_all.quantile(0.25))
            q3 = float(s_all.quantile(0.75))
            iqr = q3 - q1
            mean_v = float(s_all.mean())
            std_v = float(s_all.std()) if len(s_all) > 1 else 0.0
            cv_pct = round(abs(std_v / mean_v) * 100.0, 1) if mean_v != 0 else 0.0
            skew_v = round(float(s_all.skew()), 3) if len(s_all) > 2 and np.isfinite(s_all.skew()) else 0.0

            if iqr > 0:
                lower_fence = q1 - 1.5 * iqr
                upper_fence = q3 + 1.5 * iqr
                out_mask = (s_series < lower_fence) | (s_series > upper_fence)
                outlier_fids = [int(x) for x in df.loc[out_mask, "_fid"].tolist()[:500]]

            bin_labels = [f"{bin_edges[i]:.1f}–{bin_edges[i+1]:.1f}" for i in range(len(bin_edges) - 1)]
            histogram_data = {
                "column": active_num_col,
                "bins": bin_labels,
                "bin_edges": [round(float(x), 4) for x in bin_edges],
                "counts_all": [int(c) for c in counts_all],
                "counts_selected": [int(c) for c in counts_sel],
                "stats": {
                    "min": round(float(s_all.min()), 3),
                    "q1": round(q1, 3),
                    "median": round(float(s_all.median()), 3),
                    "mean": round(mean_v, 3),
                    "q3": round(q3, 3),
                    "max": round(float(s_all.max()), 3),
                    "std": round(std_v, 3),
                    "iqr": round(iqr, 3),
                    "cv_pct": cv_pct,
                    "skewness": skew_v,
                    "sum": round(float(s_all.sum()), 3),
                    "outlier_count": len(outlier_fids),
                    "outlier_fids": outlier_fids,
                },
            }

    # 3. Top-10 Highest & Bottom-5 Lowest Bar Charts (with disambiguated labels if repeated)
    top_n_data: list[dict[str, Any]] = []
    bottom_n_data: list[dict[str, Any]] = []
    if active_num_col:
        label_has_dups = df[active_label_col].astype(str).nunique() < len(df)
        cols_needed = list(dict.fromkeys(["_fid", active_label_col, active_num_col]))
        valid_ranked = df[cols_needed].dropna(subset=[active_num_col])

        for target_list, asc, lim in [(top_n_data, False, 10), (bottom_n_data, True, 5)]:
            sub_r = valid_ranked.sort_values(by=active_num_col, ascending=asc).head(lim)
            for _, r in sub_r.iterrows():
                fid_val = int(r["_fid"])
                raw_lbl = str(r[active_label_col])
                disp_lbl = f"#{fid_val} · {raw_lbl}" if (label_has_dups and active_label_col != "_fid") else raw_lbl
                target_list.append({
                    "fid": fid_val,
                    "label": disp_lbl,
                    "value": round(float(r[active_num_col]), 3),
                    "selected": fid_val in sel_set,
                })

    # 4. Pie / Donut category proportion & Full Segment Comparative Breakdown + Boxplot
    pie_data: list[dict[str, Any]] = []
    segment_breakdown: list[dict[str, Any]] = []
    if active_cat_col and active_cat_col in df.columns:
        cat_series = df[active_cat_col].fillna("(Kosong)").astype(str)
        vc = cat_series.value_counts()
        top_cats = vc.head(10)
        for cat_name, cnt in top_cats.items():
            mask = cat_series == cat_name
            fids_for_cat = [int(x) for x in df.loc[mask, "_fid"].tolist()[:1000]]
            if len(pie_data) < 8:
                pie_data.append({"name": str(cat_name), "value": int(cnt), "fids": fids_for_cat})

            seg_item: dict[str, Any] = {
                "segment": str(cat_name),
                "count": int(cnt),
                "pct": round((int(cnt) / max(1, total_count)) * 100.0, 1),
                "fids": fids_for_cat,
                "selected_count": sum(1 for x in fids_for_cat if x in sel_set),
            }
            if active_num_col:
                vals = pd.to_numeric(df.loc[mask, active_num_col], errors="coerce").dropna()
                if len(vals) > 0:
                    seg_item.update({
                        "sum": round(float(vals.sum()), 2),
                        "mean": round(float(vals.mean()), 2),
                        "median": round(float(vals.median()), 2),
                        "min": round(float(vals.min()), 2),
                        "q1": round(float(vals.quantile(0.25)), 2),
                        "q3": round(float(vals.quantile(0.75)), 2),
                        "max": round(float(vals.max()), 2),
                        "std": round(float(vals.std()), 2) if len(vals) > 1 else 0.0,
                        "boxplot": [
                            round(float(vals.min()), 2),
                            round(float(vals.quantile(0.25)), 2),
                            round(float(vals.median()), 2),
                            round(float(vals.quantile(0.75)), 2),
                            round(float(vals.max()), 2),
                        ],
                    })
            segment_breakdown.append(seg_item)
        if len(vc) > 8:
            pie_data.append({"name": "Lainnya", "value": int(vc.iloc[8:].sum()), "fids": []})

    # 5. Scatter Plot of 2 numeric columns (+ linear trend, Pearson r, & R²)
    preferred_nums = [c for c in numeric_cols if c.lower() not in _LOW_PRIORITY_NUM_COLS]
    non_id_nums = [c for c in numeric_cols if c.lower() not in ("id", "fid", "_fid", "gid", "objectid")]
    if len(preferred_nums) >= 2:
        def_sx, def_sy = preferred_nums[0], preferred_nums[1]
    elif len(preferred_nums) == 1:
        def_sy = preferred_nums[0]
        other_cols = [c for c in non_id_nums if c != def_sy]
        def_sx = other_cols[0] if other_cols else def_sy
    else:
        def_sx = non_id_nums[0] if len(non_id_nums) >= 1 else (numeric_cols[0] if numeric_cols else None)
        def_sy = non_id_nums[1] if len(non_id_nums) >= 2 else def_sx
    sx = scatter_x if (scatter_x and scatter_x in numeric_cols) else def_sx
    sy = scatter_y if (scatter_y and scatter_y in numeric_cols) else def_sy
    scatter_data: dict[str, Any] = {"x_col": sx, "y_col": sy, "points": [], "r": 0.0, "r2": 0.0, "trendline": []}
    if sx and sy:
        sub_cols = list(dict.fromkeys(["_fid", active_label_col, sx, sy]))
        sub = df[sub_cols].dropna(subset=[sx, sy]).head(500)
        if len(sub) >= 2:
            xs = sub[sx].to_numpy(dtype=float)
            ys = sub[sy].to_numpy(dtype=float)
            corr = float(np.corrcoef(xs, ys)[0, 1]) if np.std(xs) > 0 and np.std(ys) > 0 else 0.0
            corr = corr if np.isfinite(corr) else 0.0
            slope, intercept = np.polyfit(xs, ys, 1) if np.std(xs) > 0 else (0.0, float(np.mean(ys)))
            xmin, xmax = float(np.min(xs)), float(np.max(xs))
            pts = [
                {
                    "fid": int(row["_fid"]),
                    "label": str(row[active_label_col]),
                    "x": round(float(row[sx]), 4),
                    "y": round(float(row[sy]), 4),
                    "selected": int(row["_fid"]) in sel_set,
                }
                for _, row in sub.iterrows()
            ]
            scatter_data = {
                "x_col": sx,
                "y_col": sy,
                "points": pts,
                "r": round(corr, 3),
                "r2": round(corr * corr, 3),
                "trendline": [
                    [round(xmin, 4), round(float(slope * xmin + intercept), 4)],
                    [round(xmax, 4), round(float(slope * xmax + intercept), 4)],
                ],
            }

    # 6. Pairwise Pearson Correlation Matrix (up to 8 meaningful, non-redundant numeric columns)
    corr_cols = [
        c for c in numeric_cols
        if c.lower() not in ("id", "fid", "_fid", "gid", "objectid", "long_akurat", "lat_akurat")
    ][:8]
    if len(corr_cols) < 2:
        corr_cols = numeric_cols[:8]
    correlation_matrix: dict[str, Any] = {"columns": corr_cols, "cells": []}
    if len(corr_cols) >= 2:
        num_df = df[corr_cols].apply(pd.to_numeric, errors="coerce")
        cmat = num_df.corr().fillna(0.0)
        cells = []
        for i, ci in enumerate(corr_cols):
            for j, cj in enumerate(corr_cols):
                val = float(cmat.loc[ci, cj])
                cells.append([i, j, round(val, 2) if np.isfinite(val) else 0.0])
        correlation_matrix = {"columns": corr_cols, "cells": cells}

    # 7. 2D Spatial Coordinate Map Plot (Long x Lat bubble plot by segment & active_num_col)
    spatial_scatter: dict[str, Any] = {"points": [], "mean_center": mean_center, "segments": []}
    if is_spatial and wgs_centroids_x is not None and wgs_centroids_y is not None:
        step = max(1, total_count // 400)
        seg_names = []
        sp_pts = []
        for idx in range(0, total_count, step):
            x_v = wgs_centroids_x[idx]
            y_v = wgs_centroids_y[idx]
            if not (np.isfinite(x_v) and np.isfinite(y_v)):
                continue
            row = df.iloc[idx]
            fid_val = int(row["_fid"])
            seg_val = str(row[active_cat_col]) if (active_cat_col and active_cat_col in df.columns) else "Semua"
            if seg_val not in seg_names:
                seg_names.append(seg_val)
            num_val = float(pd.to_numeric(row[active_num_col], errors="coerce")) if active_num_col else 1.0
            if not np.isfinite(num_val):
                num_val = 0.0
            sp_pts.append({
                "fid": fid_val,
                "lon": round(float(x_v), 5),
                "lat": round(float(y_v), 5),
                "value": round(num_val, 2),
                "segment": seg_val,
                "label": str(row[active_label_col]) if active_label_col in df.columns else f"#{fid_val}",
                "selected": fid_val in sel_set,
            })
        spatial_scatter = {"points": sp_pts, "mean_center": mean_center, "segments": seg_names[:12]}

    # 8. Data quality per column
    quality_cols = []
    for c in attr_cols:
        nulls = int(df[c].isna().sum())
        dups = int(df[c].duplicated().sum())
        quality_cols.append({
            "column": c,
            "type": "numeric" if c in numeric_cols else "string",
            "null_count": nulls,
            "null_pct": round((nulls / max(1, total_count)) * 100, 1),
            "unique_count": int(df[c].nunique(dropna=True)),
            "duplicate_count": dups,
        })

    # 9. Automatic Indonesian Executive Insights
    insights: list[str] = []
    if active_num_col and segment_breakdown:
        with_means = [s for s in segment_breakdown if "mean" in s]
        if len(with_means) >= 2:
            best_seg = max(with_means, key=lambda x: x["mean"])
            low_seg = min(with_means, key=lambda x: x["mean"])
            insights.append(
                f"Segmen dengan rata-rata '{active_num_col}' tertinggi adalah {best_seg['segment']} "
                f"({best_seg['mean']}, {best_seg['count']} fitur), sedangkan terendah adalah {low_seg['segment']} ({low_seg['mean']})."
            )
    if nni_ratio is not None:
        insights.append(
            f"Pola distribusi spasial terdiagnosis '{spatial_pattern}' (Rasio Nearest Neighbor R = {nni_ratio}, "
            f"jarak tetangga terdekat rata-rata {avg_nnd_m:.0f} m, radius sebaran {std_distance_km} km)."
        )
    if active_num_col and histogram_data.get("stats"):
        st = histogram_data["stats"]
        if st.get("outlier_count", 0) > 0:
            insights.append(
                f"Terdeteksi {st['outlier_count']} nilai pencilan (outlier IQR) pada kolom '{active_num_col}' "
                f"(rentang Q1–Q3: {st['q1']} s.d. {st['q3']}; CV = {st['cv_pct']}%)."
            )
        else:
            insights.append(
                f"Distribusi '{active_num_col}' bersih tanpa outlier ekstrem (Median {st['median']}, "
                f"Rata-rata {st['mean']}, Simpangan Baku σ = {st['std']}, Skewness = {st['skewness']})."
            )
    if sx and sy and sx != sy:
        r_v = scatter_data.get("r", 0.0)
        strength = "kuat" if abs(r_v) >= 0.6 else ("sedang" if abs(r_v) >= 0.3 else "lemah")
        direction = "positif" if r_v >= 0 else "negatif"
        insights.append(
            f"Korelasi antara '{sx}' dan '{sy}' bersifat {direction} {strength} (r = {r_v}, R² = {scatter_data.get('r2', 0.0)})."
        )

    # 10. Top 5 summary table rows
    plain_df = pd.DataFrame(df.drop(columns=["geometry"])) if is_spatial else pd.DataFrame(df)
    if active_num_col:
        top5_df = plain_df.sort_values(by=active_num_col, ascending=False).head(5)
    else:
        top5_df = plain_df.head(5)

    return {
        "kpi": {
            "feature_count": total_count,
            "selected_count": len(sel_set),
            "area_km2": area_km2,
            "hull_area_km2": hull_area_km2,
            "length_km": length_km,
            "column_count": len(attr_cols),
            "missing_pct": missing_pct,
            "invalid_geom_count": invalid_geom_count,
            "geom_kind": geom_kind,
            "utm_crs": utm_crs_str,
        },
        "spatial_metrics": {
            "geom_kind": geom_kind,
            "utm_crs": utm_crs_str,
            "hull_area_km2": hull_area_km2,
            "span_width_km": span_width_km,
            "span_height_km": span_height_km,
            "density_per_km2": density_per_km2,
            "mean_center": mean_center,
            "std_distance_km": std_distance_km,
            "avg_nnd_m": avg_nnd_m,
            "min_nnd_m": min_nnd_m,
            "max_nnd_m": max_nnd_m,
            "nni_ratio": nni_ratio,
            "spatial_pattern": spatial_pattern,
        },
        "numeric_columns": numeric_cols,
        "string_columns": string_cols,
        "histogram": histogram_data,
        "top_n": top_n_data,
        "bottom_n": bottom_n_data,
        "pie": {"column": active_cat_col, "data": pie_data},
        "segment_breakdown": {"column": active_cat_col, "metric": active_num_col, "rows": segment_breakdown},
        "scatter": scatter_data,
        "correlation_matrix": correlation_matrix,
        "spatial_scatter": spatial_scatter,
        "insights": insights,
        "quality": {
            "columns": quality_cols,
            "invalid_geometries": invalid_geom_count,
            "duplicate_rows": int(plain_df.drop(columns=["_fid"], errors="ignore").duplicated().sum()),
        },
        "top_rows": json_safe_records(top5_df),
    }
