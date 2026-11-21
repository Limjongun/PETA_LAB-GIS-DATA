"""
Spatial Cross-Validation Engine (`SpatialBlockKFold`, `GroupKFold`, `RandomKFold`).
Includes GeoJSON spatial block preview generator for Step ④ of the ML Wizard.
"""

from typing import Any, Iterator

import geopandas as gpd
import numpy as np
from shapely.geometry import Polygon
from sklearn.model_selection import BaseCrossValidator, GroupKFold, KFold

from petalab.core.crs import to_metric_crs


def assign_spatial_blocks(
    gdf: gpd.GeoDataFrame,
    block_size_m: float = 2500.0,
    n_splits: int = 5,
    random_state: int = 42,
) -> tuple[np.ndarray, np.ndarray, dict[str, Any]]:
    """
    Divides the layer extent into metric square blocks of `block_size_m` meters,
    assigns each feature to a block, and distributes blocks across `n_splits` folds.
    Returns (block_ids, fold_ids, blocks_geojson_preview).
    """
    n_splits = max(2, min(10, int(n_splits)))
    gdf_m, _ = to_metric_crs(gdf)
    centroids_m = gdf_m.geometry.centroid
    xs = centroids_m.x.to_numpy()
    ys = centroids_m.y.to_numpy()

    minx, miny, maxx, maxy = [float(v) for v in gdf_m.total_bounds]
    step = max(250.0, float(block_size_m))
    # Ensure at least n_splits non-empty blocks
    if ((maxx - minx) / step) * ((maxy - miny) / step) < n_splits:
        step = max(100.0, min(maxx - minx, maxy - miny) / max(2, n_splits))

    col_idx = np.floor((xs - minx) / step).astype(int)
    row_idx = np.floor((ys - miny) / step).astype(int)
    max_cols = int(np.max(col_idx)) + 1 if len(col_idx) > 0 else 1
    block_ids = row_idx * max_cols + col_idx

    unique_blocks = np.unique(block_ids)
    rng = np.random.default_rng(random_state)
    shuffled_blocks = rng.permutation(unique_blocks)
    block_to_fold = {int(b): int(i % n_splits) for i, b in enumerate(shuffled_blocks)}
    fold_ids = np.array([block_to_fold[int(b)] for b in block_ids], dtype=int)

    # Build GeoJSON preview of spatial blocks colored by fold
    block_polys = []
    seen_rc = set()
    for r, c, b in zip(row_idx, col_idx, block_ids):
        key = (int(r), int(c))
        if key in seen_rc:
            continue
        seen_rc.add(key)
        x0 = minx + c * step
        y0 = miny + r * step
        poly = Polygon([(x0, y0), (x0 + step, y0), (x0 + step, y0 + step), (x0, y0 + step)])
        cnt = int(np.sum(block_ids == b))
        block_polys.append({
            "block_id": int(b),
            "fold": block_to_fold[int(b)] + 1,
            "feature_count": cnt,
            "geometry": poly,
        })

    blocks_gdf_m = gpd.GeoDataFrame(block_polys, geometry="geometry", crs=gdf_m.crs)
    blocks_wgs = blocks_gdf_m.to_crs("EPSG:4326")
    preview_geojson = blocks_wgs.__geo_interface__

    return block_ids, fold_ids, preview_geojson


class SpatialBlockKFold(BaseCrossValidator):
    def __init__(self, fold_ids: np.ndarray, n_splits: int = 5):
        self.fold_ids = np.asarray(fold_ids, dtype=int)
        self.n_splits = max(2, int(n_splits))

    def get_n_splits(self, X: Any = None, y: Any = None, groups: Any = None) -> int:
        return len(np.unique(self.fold_ids))

    def _iter_test_indices(self, X: Any = None, y: Any = None, groups: Any = None) -> Iterator[np.ndarray]:
        for fold in sorted(np.unique(self.fold_ids)):
            test_mask = self.fold_ids == fold
            if np.any(test_mask) and not np.all(test_mask):
                yield np.where(test_mask)[0]


def build_cv_splitter(
    gdf: gpd.GeoDataFrame,
    cv_method: str = "spatial_block",
    n_splits: int = 5,
    block_size_m: float = 2500.0,
    group_col: str | None = None,
    random_state: int = 42,
) -> tuple[Any, np.ndarray, dict[str, Any]]:
    n_eff = min(max(2, int(n_splits)), max(2, len(gdf) // 2))
    if cv_method == "group" and group_col and group_col in gdf.columns:
        groups = gdf[group_col].astype(str).to_numpy()
        n_groups = len(np.unique(groups))
        if n_groups >= 2:
            gkf = GroupKFold(n_splits=min(n_eff, n_groups))
            fold_ids = np.zeros(len(gdf), dtype=int)
            for f_idx, (_, test_idx) in enumerate(gkf.split(gdf, groups=groups)):
                fold_ids[test_idx] = f_idx
            return SpatialBlockKFold(fold_ids, n_splits=min(n_eff, n_groups)), fold_ids, {}

    if cv_method == "random":
        kf = KFold(n_splits=n_eff, shuffle=True, random_state=random_state)
        fold_ids = np.zeros(len(gdf), dtype=int)
        for f_idx, (_, test_idx) in enumerate(kf.split(gdf)):
            fold_ids[test_idx] = f_idx
        return kf, fold_ids, {}

    # Default: Spatial Block Cross-Validation
    _, fold_ids, preview_geojson = assign_spatial_blocks(
        gdf, block_size_m=block_size_m, n_splits=n_eff, random_state=random_state
    )
    if len(np.unique(fold_ids)) < 2:
        # Fallback if all features fell into 1 block
        kf = KFold(n_splits=n_eff, shuffle=True, random_state=random_state)
        fold_ids = np.zeros(len(gdf), dtype=int)
        for f_idx, (_, test_idx) in enumerate(kf.split(gdf)):
            fold_ids[test_idx] = f_idx
        return kf, fold_ids, preview_geojson

    return SpatialBlockKFold(fold_ids, n_splits=len(np.unique(fold_ids))), fold_ids, preview_geojson
