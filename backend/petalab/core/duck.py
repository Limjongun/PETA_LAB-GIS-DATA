"""
DuckDB + Pandas/GeoPandas Tabular & Attribute Query Engine.
Provides fast server-side pagination, sorting, text search, visual query builder evaluation,
sandboxed Field Calculator (Beginner templates + Advanced DuckDB SQL expressions),
Group-By aggregations, and 3-step Table Join Wizard with fuzzy matching & text normalization.
"""

from difflib import SequenceMatcher
from pathlib import Path
import re
from typing import Any

import duckdb
import geopandas as gpd
import numpy as np
import pandas as pd

from petalab.core.crs import to_metric_crs
from petalab.core.io_vector import load_working_layer, save_working_layer
from petalab.errors import PetaLabError


_FORBIDDEN_SQL_RE = re.compile(
    r"(;|--|\b("
    r"DROP|DELETE|UPDATE|INSERT|COPY|ATTACH|DETACH|INSTALL|LOAD|PRAGMA|CALL|EXPORT|IMPORT|CREATE|ALTER|SET|"
    r"READ_CSV|READ_CSV_AUTO|READ_PARQUET|READ_JSON|READ_JSON_AUTO|READ_NDJSON|READ_TEXT|READ_BLOB|"
    r"SNIFF_CSV|PARQUET_SCAN|CSV_SCAN|GLOB|GETENV|CURRENT_SETTING|DUCKDB_SETTINGS|HTTP_GET|SQLITE_ATTACH|POSTGRES_ATTACH"
    r")\b)",
    re.I,
)


def _assert_safe_duckdb_expr(expr: str, context: str = "SQL") -> None:
    if _FORBIDDEN_SQL_RE.search(expr):
        raise PetaLabError(
            "UNSAFE_SQL",
            f"Ekspresi {context} mengandung perintah atau fungsi sistem/file yang diblokir demi keamanan.",
            hint="Gunakan hanya nama kolom, operator perbandingan (=, >, <, AND, OR), atau fungsi matematika/teks standar.",
        )


def _strip_geom_to_df(df: gpd.GeoDataFrame | pd.DataFrame) -> pd.DataFrame:
    if isinstance(df, gpd.GeoDataFrame) and "geometry" in df.columns:
        return pd.DataFrame(df.drop(columns=["geometry"]))
    return pd.DataFrame(df)


def query_table_page(
    parquet_path: Path,
    offset: int = 0,
    limit: int = 100,
    sort_col: str | None = None,
    sort_desc: bool = False,
    search: str | None = None,
    only_fids: list[int] | None = None,
) -> dict[str, Any]:
    raw_df = load_working_layer(parquet_path)
    df = _strip_geom_to_df(raw_df)
    total_all = len(df)

    if only_fids is not None:
        fid_set = set(int(x) for x in only_fids)
        df = df[df["_fid"].isin(fid_set)]

    if search and search.strip():
        q = search.strip().lower()
        str_cols = [c for c in df.columns if c != "_fid"]
        if str_cols:
            mask = pd.Series(False, index=df.index)
            for c in str_cols:
                mask |= df[c].astype(str).str.lower().str.contains(q, na=False, regex=False)
            df = df[mask]

    total_filtered = len(df)

    if sort_col and sort_col in df.columns:
        df = df.sort_values(by=sort_col, ascending=not sort_desc, na_position="last")
    elif "_fid" in df.columns:
        df = df.sort_values(by="_fid", ascending=True)

    page_df = df.iloc[offset : offset + limit].copy()
    # Replace NaN/inf with None for JSON serialization
    page_df = page_df.replace([np.inf, -np.inf], np.nan)
    records = json_safe_records(page_df)

    return {
        "total": total_all,
        "filtered": total_filtered,
        "offset": offset,
        "limit": limit,
        "rows": records,
    }


def json_safe_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    records = []
    for row in df.to_dict(orient="records"):
        clean: dict[str, Any] = {}
        for k, v in row.items():
            if pd.isna(v):
                clean[k] = None
            elif isinstance(v, (np.integer,)):
                clean[k] = int(v)
            elif isinstance(v, (np.floating,)):
                clean[k] = round(float(v), 6) if np.isfinite(v) else None
            elif isinstance(v, (np.bool_,)):
                clean[k] = bool(v)
            else:
                clean[k] = v
        records.append(clean)
    return records


def evaluate_attribute_selection(
    parquet_path: Path,
    rules: list[dict[str, Any]] | None = None,
    logic: str = "AND",
    sql_where: str | None = None,
) -> list[int]:
    """
    Evaluates visual query builder rules or a sandboxed DuckDB SQL WHERE clause.
    Returns matching list of `_fid`.
    """
    raw_df = load_working_layer(parquet_path)
    df = _strip_geom_to_df(raw_df)
    if df.empty:
        return []

    if sql_where and sql_where.strip():
        # Execute safely in DuckDB in-memory connection on the DataFrame
        _assert_safe_duckdb_expr(sql_where, "filter WHERE")
        try:
            con = duckdb.connect(":memory:")
            con.register("layer_tbl", df)
            res = con.execute(f"SELECT _fid FROM layer_tbl WHERE {sql_where}").df()
            return [int(x) for x in res["_fid"].tolist()]
        except Exception as e:
            raise PetaLabError("SQL_ERROR", f"Sintaks filter SQL belum tepat: {e}", detail=str(e))

    if not rules:
        return [int(x) for x in df["_fid"].tolist()]

    masks = []
    for rule in rules:
        col = rule.get("column")
        op = rule.get("operator", "eq")
        val = rule.get("value")
        if not col or col not in df.columns:
            continue
        s = df[col]
        if op in ("eq", "=", "=="):
            if pd.api.types.is_numeric_dtype(s):
                m = s == float(val)
            else:
                m = s.astype(str).str.lower() == str(val).strip().lower()
        elif op in ("neq", "!="):
            if pd.api.types.is_numeric_dtype(s):
                m = s != float(val)
            else:
                m = s.astype(str).str.lower() != str(val).strip().lower()
        elif op in ("gt", ">", "lebih_dari"):
            m = pd.to_numeric(s, errors="coerce") > float(val)
        elif op in ("gte", ">="):
            m = pd.to_numeric(s, errors="coerce") >= float(val)
        elif op in ("lt", "<", "kurang_dari"):
            m = pd.to_numeric(s, errors="coerce") < float(val)
        elif op in ("lte", "<="):
            m = pd.to_numeric(s, errors="coerce") <= float(val)
        elif op in ("contains", "mengandung"):
            m = s.astype(str).str.lower().str.contains(str(val).strip().lower(), na=False, regex=False)
        elif op in ("in", "termasuk"):
            items = [x.strip().lower() for x in str(val).split(",") if x.strip()]
            m = s.astype(str).str.lower().isin(items)
        elif op == "is_null":
            m = s.isna()
        elif op == "not_null":
            m = s.notna()
        else:
            m = pd.Series(True, index=df.index)
        masks.append(m)

    if not masks:
        return []
    combined = masks[0]
    for m in masks[1:]:
        combined = (combined | m) if logic.upper() == "OR" else (combined & m)

    return [int(x) for x in df.loc[combined, "_fid"].tolist()]


def calculate_field(
    parquet_path: Path,
    target_column: str,
    mode: str = "template",
    template: str | None = None,
    param_col_a: str | None = None,
    param_col_b: str | None = None,
    sql_expr: str | None = None,
    preview_only: bool = False,
) -> dict[str, Any]:
    """
    Field Calculator supporting Beginner templates (area_km2, length_km, density,
    percentage, ratio, centroid_x, centroid_y, concat, categorize) and Advanced DuckDB SQL expressions.
    """
    gdf = load_working_layer(parquet_path)
    is_spatial = isinstance(gdf, gpd.GeoDataFrame) and "geometry" in gdf.columns

    if mode == "template":
        tpl = (template or "area_km2").lower()
        if tpl == "area_km2":
            if not is_spatial:
                raise PetaLabError("NOT_SPATIAL", "Layer ini bukan layer peta, tidak bisa menghitung luas.")
            metric_gdf, _ = to_metric_crs(gdf)
            values = (metric_gdf.geometry.area / 1e6).round(4)
        elif tpl == "area_ha":
            if not is_spatial:
                raise PetaLabError("NOT_SPATIAL", "Layer ini bukan layer peta.")
            metric_gdf, _ = to_metric_crs(gdf)
            values = (metric_gdf.geometry.area / 1e4).round(3)
        elif tpl == "length_km":
            if not is_spatial:
                raise PetaLabError("NOT_SPATIAL", "Layer ini bukan layer peta.")
            metric_gdf, _ = to_metric_crs(gdf)
            values = (metric_gdf.geometry.length / 1000.0).round(4)
        elif tpl == "density":
            if not is_spatial or not param_col_a or param_col_a not in gdf.columns:
                raise PetaLabError("INVALID_PARAM", "Pilih kolom angka untuk menghitung kepadatan per km².")
            metric_gdf, _ = to_metric_crs(gdf)
            area_km2 = np.maximum(metric_gdf.geometry.area / 1e6, 1e-6)
            values = (pd.to_numeric(gdf[param_col_a], errors="coerce") / area_km2).round(2)
        elif tpl == "percentage":
            if not param_col_a or param_col_a not in gdf.columns:
                raise PetaLabError("INVALID_PARAM", "Pilih kolom angka untuk menghitung persentase.")
            s = pd.to_numeric(gdf[param_col_a], errors="coerce")
            total = s.sum() if not param_col_b or param_col_b not in gdf.columns else pd.to_numeric(gdf[param_col_b], errors="coerce")
            values = ((s / total) * 100.0).round(2)
        elif tpl in ("centroid_x", "centroid_y"):
            if not is_spatial:
                raise PetaLabError("NOT_SPATIAL", "Layer ini bukan layer peta.")
            wgs = gdf.to_crs("EPSG:4326") if gdf.crs else gdf
            c = wgs.geometry.centroid
            values = c.x.round(6) if tpl == "centroid_x" else c.y.round(6)
        elif tpl == "concat":
            ca = gdf[param_col_a].astype(str) if param_col_a and param_col_a in gdf.columns else ""
            cb = gdf[param_col_b].astype(str) if param_col_b and param_col_b in gdf.columns else ""
            values = ca + " - " + cb
        elif tpl == "categorize":
            if not param_col_a or param_col_a not in gdf.columns:
                raise PetaLabError("INVALID_PARAM", "Pilih kolom angka untuk dikategorikan.")
            s = pd.to_numeric(gdf[param_col_a], errors="coerce")
            q33, q66 = s.quantile(0.33), s.quantile(0.66)
            values = pd.Series(
                np.where(s <= q33, "Rendah", np.where(s <= q66, "Sedang", "Tinggi")),
                index=gdf.index,
            )
        else:
            raise PetaLabError("INVALID_TEMPLATE", f"Template '{tpl}' tidak dikenali.")
    else:
        # Sandboxed DuckDB SQL expression
        if not sql_expr or not sql_expr.strip():
            raise PetaLabError("INVALID_PARAM", "Masukkan ekspresi kalkulator kolom.")
        _assert_safe_duckdb_expr(sql_expr, "kalkulator kolom")
        plain_df = _strip_geom_to_df(gdf)
        try:
            con = duckdb.connect(":memory:")
            con.register("tbl", plain_df)
            res = con.execute(f"SELECT ({sql_expr}) AS val FROM tbl").df()
            values = res["val"]
        except Exception as e:
            raise PetaLabError("SQL_ERROR", f"Ekspresi kalkulator belum valid: {e}", detail=str(e))

    gdf[target_column] = values
    preview_df = _strip_geom_to_df(gdf).head(5)

    return {
        "target_column": target_column,
        "preview_rows": json_safe_records(preview_df),
        "result_gdf": None if preview_only else gdf,
    }


def _normalize_key(val: Any) -> str:
    if pd.isna(val):
        return ""
    s = str(val).strip().lower()
    # Strip common administrative prefixes in Indonesia
    s = re.sub(r"^(kecamatan|kec\.|kelurahan|kel\.|desa|kabupaten|kab\.|kota)\s+", "", s)
    s = re.sub(r"[^a-z0-9]", "", s)
    return s


def suggest_join_columns(left_df: pd.DataFrame, right_df: pd.DataFrame) -> dict[str, Any]:
    left_cols = [c for c in left_df.columns if c not in ("geometry", "_fid")]
    right_cols = [c for c in right_df.columns if c not in ("geometry", "_fid")]
    best_pair = (left_cols[0] if left_cols else "", right_cols[0] if right_cols else "")
    best_score = -1.0

    for lc in left_cols:
        l_vals = set(left_df[lc].dropna().astype(str).str.strip().str.lower().head(100))
        for rc in right_cols:
            name_sim = SequenceMatcher(None, lc.lower(), rc.lower()).ratio()
            r_vals = set(right_df[rc].dropna().astype(str).str.strip().str.lower().head(100))
            overlap = len(l_vals & r_vals) / max(1, min(len(l_vals), len(r_vals))) if l_vals and r_vals else 0.0
            score = name_sim * 0.4 + overlap * 0.6
            if score > best_score:
                best_score = score
                best_pair = (lc, rc)

    return {"left_key": best_pair[0], "right_key": best_pair[1], "confidence": round(best_score, 2)}


def preview_or_apply_join(
    left_parquet: Path,
    right_parquet: Path,
    left_key: str,
    right_key: str,
    normalize_text: bool = True,
    manual_mapping: dict[str, str] | None = None,
    preview_only: bool = True,
) -> dict[str, Any]:
    """
    3-Step Join Wizard Engine:
    Matches spatial layer with tabular data, detects fuzzy mismatches
    (e.g., 'Sukomanunggal' vs 'Suko Manunggal'), supports automatic text normalization
    and manual mapping overrides.
    """
    left_gdf = load_working_layer(left_parquet)
    right_df = _strip_geom_to_df(load_working_layer(right_parquet))

    if left_key not in left_gdf.columns:
        raise PetaLabError("INVALID_COLUMN", f"Kolom '{left_key}' tidak ditemukan di layer utama.")
    if right_key not in right_df.columns:
        raise PetaLabError("INVALID_COLUMN", f"Kolom '{right_key}' tidak ditemukan di tabel gabung.")

    manual_mapping = manual_mapping or {}

    def transform_left(val: Any) -> str:
        s = str(val).strip() if pd.notna(val) else ""
        if s in manual_mapping:
            s = manual_mapping[s]
        return _normalize_key(s) if normalize_text else s.lower()

    def transform_right(val: Any) -> str:
        s = str(val).strip() if pd.notna(val) else ""
        return _normalize_key(s) if normalize_text else s.lower()

    left_keys_raw = left_gdf[left_key].astype(str).tolist()
    right_keys_raw = right_df[right_key].astype(str).tolist()

    left_norm = left_gdf[left_key].map(transform_left)
    right_norm = right_df[right_key].map(transform_right)

    right_lookup = dict(zip(right_norm, right_keys_raw))
    matched_mask = left_norm.isin(set(right_norm))
    matched_count = int(matched_mask.sum())
    total_left = len(left_gdf)

    unmatched_examples = []
    for idx, is_m in enumerate(matched_mask):
        if not is_m:
            l_raw = left_keys_raw[idx]
            # Find closest candidate in right_keys_raw
            best_cand = None
            best_ratio = 0.0
            for r_raw in right_keys_raw:
                ratio = SequenceMatcher(None, _normalize_key(l_raw), _normalize_key(r_raw)).ratio()
                if ratio > best_ratio:
                    best_ratio = ratio
                    best_cand = r_raw
            unmatched_examples.append({
                "left_value": l_raw,
                "suggested_right": best_cand if best_ratio >= 0.55 else None,
                "similarity": round(best_ratio, 2),
            })

    if preview_only:
        return {
            "total_left": total_left,
            "matched_count": matched_count,
            "unmatched_count": total_left - matched_count,
            "match_rate_pct": round((matched_count / max(1, total_left)) * 100, 1),
            "unmatched_examples": unmatched_examples[:15],
            "normalize_text": normalize_text,
        }

    # Apply join
    left_copy = left_gdf.copy()
    left_copy["_join_key"] = left_norm
    right_copy = right_df.copy()
    right_copy["_join_key"] = right_norm
    # Drop duplicate keys on right side and drop _fid from right side
    right_cols_to_drop = [c for c in ["_fid", right_key] if c in right_copy.columns]
    right_copy = right_copy.drop(columns=right_cols_to_drop).drop_duplicates(subset=["_join_key"])

    merged = left_copy.merge(right_copy, on="_join_key", how="left", suffixes=("", "_join"))
    merged = merged.drop(columns=["_join_key"])
    if isinstance(left_gdf, gpd.GeoDataFrame):
        merged = gpd.GeoDataFrame(merged, geometry="geometry", crs=left_gdf.crs)

    return {
        "total_left": total_left,
        "matched_count": matched_count,
        "unmatched_count": total_left - matched_count,
        "match_rate_pct": round((matched_count / max(1, total_left)) * 100, 1),
        "merged_gdf": merged,
    }


def group_by_layer(
    parquet_path: Path,
    group_col: str,
    agg_col: str,
    agg_func: str = "sum",
    dissolve_geometry: bool = True,
) -> gpd.GeoDataFrame | pd.DataFrame:
    df = load_working_layer(parquet_path)
    if group_col not in df.columns:
        raise PetaLabError("INVALID_COLUMN", f"Kolom kelompok '{group_col}' tidak ditemukan.")

    agg_func_map = {
        "sum": "sum",
        "mean": "mean",
        "avg": "mean",
        "count": "count",
        "min": "min",
        "max": "max",
        "median": "median",
    }
    fn = agg_func_map.get(agg_func.lower(), "sum")

    if isinstance(df, gpd.GeoDataFrame) and "geometry" in df.columns and dissolve_geometry:
        if agg_col and agg_col in df.columns and agg_col != group_col:
            dissolved = df[[group_col, agg_col, "geometry"]].dissolve(by=group_col, aggfunc=fn).reset_index()
            dissolved = dissolved.rename(columns={agg_col: f"{agg_col}_{fn}"})
        else:
            dissolved = df[[group_col, "geometry"]].dissolve(by=group_col).reset_index()
        dissolved["_fid"] = list(range(1, len(dissolved) + 1))
        return dissolved

    plain = _strip_geom_to_df(df)
    target = agg_col if (agg_col and agg_col in plain.columns) else "_fid"
    grouped = plain.groupby(group_col, dropna=False)[target].agg(fn).reset_index()
    grouped = grouped.rename(columns={target: f"{target}_{fn}"})
    grouped["_fid"] = list(range(1, len(grouped) + 1))
    return grouped
