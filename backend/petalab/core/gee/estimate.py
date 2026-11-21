"""
Download Size, Grid Dimension, & Automatic Tile Splitting Estimator for GEE (§7.2, §7.3, §10.2).
Enforces the 32 MB GEE hard limit (with 25% safety margin -> 24 MB per tile budget)
and 10,000-pixel grid dimension limit before any download begins.
"""

from dataclasses import asdict, dataclass
import math
from typing import Any

from petalab.errors import PetaLabError

BYTES_PER_DTYPE = {
    "uint8": 1,
    "int16": 2,
    "uint16": 2,
    "float32": 4,
    "float64": 8,
}
MAX_REQUEST_BYTES = 32 * 1024 * 1024  # Batas keras GEE: 32 MB
SAFETY = 0.75                          # Margin keamanan 25% -> budget 24 MB per petak
MAX_GRID_DIM = 10_000


@dataclass
class DownloadPlan:
    width_px: int
    height_px: int
    est_bytes: int
    est_mb: float
    n_tiles: int
    tile_grid: tuple[int, int]  # (cols, rows)
    scale: int
    native_scale: int
    area_km2: float
    est_seconds_min: int
    est_seconds_max: int
    tile_bboxes: list[list[float]]
    scale_warning: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def bbox_extent_meters(bbox: list[float]) -> tuple[float, float, float]:
    """Calculates metric width (m), height (m), and area (km²) from WGS84 [minx, miny, maxx, maxy]."""
    minx, miny, maxx, maxy = [float(v) for v in bbox]
    mean_lat_rad = math.radians((miny + maxy) / 2.0)
    m_per_deg_lat = 111132.92 - 559.82 * math.cos(2 * mean_lat_rad)
    m_per_deg_lon = 111412.84 * math.cos(mean_lat_rad)
    w_m = max(10.0, abs(maxx - minx) * m_per_deg_lon)
    h_m = max(10.0, abs(maxy - miny) * m_per_deg_lat)
    area_km2 = (w_m * h_m) / 1e6
    return w_m, h_m, round(area_km2, 3)


def split_bbox_into_grid(bbox: list[float], cols: int, rows: int) -> list[list[float]]:
    minx, miny, maxx, maxy = [float(v) for v in bbox]
    dx = (maxx - minx) / max(1, cols)
    dy = (maxy - miny) / max(1, rows)
    tiles: list[list[float]] = []
    for r in range(rows):
        for c in range(cols):
            tx0 = minx + c * dx
            ty0 = miny + r * dy
            tx1 = minx + (c + 1) * dx if c < cols - 1 else maxx
            ty1 = miny + (r + 1) * dy if r < rows - 1 else maxy
            tiles.append([round(tx0, 6), round(ty0, 6), round(tx1, 6), round(ty1, 6)])
    return tiles


def plan_download(
    bbox: list[float],
    scale: int,
    n_bands: int = 1,
    dtype: str = "float32",
    native_scale: int = 10,
    strict_scale: bool = False,
) -> DownloadPlan:
    """
    Computes pixel dimensions, uncompressed byte estimate, and automatic tile grid splitting
    so every tile request stays safely below 24 MB and 10,000x10,000 pixels.
    """
    scale = max(1, int(scale))
    native_scale = max(1, int(native_scale))
    scale_warning = None

    if scale < native_scale:
        scale_warning = (
            f"Data ini aslinya {native_scale} meter. Meminta {scale} meter tidak menambah detail, hanya memperbesar ukuran file."
        )
        if strict_scale:
            raise PetaLabError(
                "GEE_SCALE_TOO_FINE",
                message=scale_warning,
                actions=[{"label": f"Pakai {native_scale} meter", "action": "use_native_scale", "value": native_scale}],
            )

    w_m, h_m, area_km2 = bbox_extent_meters(bbox)
    w_px = max(1, math.ceil(w_m / scale))
    h_px = max(1, math.ceil(h_m / scale))
    bytes_per_val = BYTES_PER_DTYPE.get(dtype, 4)
    total_bytes = w_px * h_px * max(1, n_bands) * bytes_per_val

    budget = int(MAX_REQUEST_BYTES * SAFETY)
    by_bytes = math.ceil(total_bytes / budget)
    by_dim = math.ceil(w_px / MAX_GRID_DIM) * math.ceil(h_px / MAX_GRID_DIM)
    n = max(1, by_bytes, by_dim)

    cols = max(1, math.ceil(math.sqrt(n * w_px / max(h_px, 1))))
    rows = max(1, math.ceil(n / max(cols, 1)))
    n_tiles = cols * rows

    tile_bboxes = split_bbox_into_grid(bbox, cols, rows)
    est_mb = round(total_bytes / (1024 * 1024), 2)
    est_sec_min = max(2, int(3 * n_tiles + est_mb * 0.8))
    est_sec_max = max(5, int(8 * n_tiles + est_mb * 2.2))

    return DownloadPlan(
        width_px=w_px,
        height_px=h_px,
        est_bytes=total_bytes,
        est_mb=est_mb,
        n_tiles=n_tiles,
        tile_grid=(cols, rows),
        scale=scale,
        native_scale=native_scale,
        area_km2=area_km2,
        est_seconds_min=est_sec_min,
        est_seconds_max=est_sec_max,
        tile_bboxes=tile_bboxes,
        scale_warning=scale_warning,
    )
