"""
Dual-engine Raster I/O & Tile Renderer for PetaLab.
Uses `rasterio` when installed, and seamlessly falls back to a built-in pure-Python
NumPy + Pillow GeoTIFF (TIFF Tag 33550 ModelPixelScale & 33922 ModelTiepoint + JSON sidecar)
engine so all raster features (DEM, multi-band NDVI, Slope, Hillshade, Zonal Stats, Sample,
Reclassify, Clip, and XYZ PNG tiles) work 100% reliably on any Windows machine.
"""

from io import BytesIO
import json
import math
import os
from pathlib import Path
import struct
from typing import Any

import matplotlib
import numpy as np
from PIL import Image, ImageFile
from PIL.TiffImagePlugin import ImageFileDirectory_v2

try:
    import rasterio
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

ImageFile.LOAD_TRUNCATED_IMAGES = True

# GeoTIFF Tag IDs
TAG_MODEL_PIXEL_SCALE = 33550
TAG_MODEL_TIEPOINT = 33922
TAG_GDAL_NODATA = 42113


class RasterDataset:
    """Unified in-memory representation of a georeferenced multi-band raster."""

    def __init__(
        self,
        data: np.ndarray,
        bbox: list[float],
        crs: str = "EPSG:4326",
        nodata: float | None = -9999.0,
        band_names: list[str] | None = None,
    ):
        # Ensure data shape is (bands, height, width)
        if data.ndim == 2:
            data = data[np.newaxis, :, :]
        self.data = data.astype(np.float32)
        self.count, self.height, self.width = self.data.shape
        self.bbox = [float(x) for x in bbox]  # [minx, miny, maxx, maxy]
        self.crs = crs
        self.nodata = nodata
        self.band_names = band_names or [f"Band {i + 1}" for i in range(self.count)]

    @property
    def res_x(self) -> float:
        return (self.bbox[2] - self.bbox[0]) / max(1, self.width)

    @property
    def res_y(self) -> float:
        return (self.bbox[3] - self.bbox[1]) / max(1, self.height)

    def xy_to_rowcol(self, x: float | np.ndarray, y: float | np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        minx, miny, maxx, maxy = self.bbox
        col = np.floor((np.asarray(x) - minx) / self.res_x).astype(int)
        row = np.floor((maxy - np.asarray(y)) / self.res_y).astype(int)
        return row, col

    def rowcol_to_xy(self, row: int | np.ndarray, col: int | np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        minx, miny, maxx, maxy = self.bbox
        x = minx + (np.asarray(col) + 0.5) * self.res_x
        y = maxy - (np.asarray(row) + 0.5) * self.res_y
        return x, y

    def valid_mask(self, band_idx: int = 0) -> np.ndarray:
        arr = self.data[band_idx]
        mask = np.isfinite(arr)
        if self.nodata is not None:
            mask &= ~np.isclose(arr, self.nodata)
        return mask

    def compute_stats(self) -> list[dict[str, Any]]:
        stats = []
        for b in range(self.count):
            arr = self.data[b]
            mask = self.valid_mask(b)
            valid = arr[mask]
            if valid.size == 0:
                stats.append({
                    "band": b + 1,
                    "name": self.band_names[b] if b < len(self.band_names) else f"Band {b + 1}",
                    "min": 0.0,
                    "max": 1.0,
                    "mean": 0.0,
                    "std": 0.0,
                    "p2": 0.0,
                    "p98": 1.0,
                    "nodata_pct": 100.0,
                    "histogram": {"counts": [], "bins": []},
                })
                continue
            p2, p98 = np.percentile(valid, [2, 98])
            counts, bins = np.histogram(valid, bins=24)
            stats.append({
                "band": b + 1,
                "name": self.band_names[b] if b < len(self.band_names) else f"Band {b + 1}",
                "min": float(np.min(valid)),
                "max": float(np.max(valid)),
                "mean": float(np.mean(valid)),
                "std": float(np.std(valid)),
                "p2": float(p2),
                "p98": float(p98) if p98 > p2 else float(np.max(valid)),
                "nodata_pct": round(float(1.0 - valid.size / arr.size) * 100, 2),
                "histogram": {
                    "counts": [int(c) for c in counts],
                    "bins": [round(float(x), 4) for x in bins],
                },
            })
        return stats


def save_raster_dataset(ds: RasterDataset, dest_tif_path: Path) -> dict[str, Any]:
    """Saves RasterDataset as a valid GeoTIFF (+ fast metadata sidecar) atomically."""
    dest_tif_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_tif = dest_tif_path.with_suffix(".tif.tmp")
    meta_sidecar = dest_tif_path.with_suffix(".meta.json")
    npz_sidecar = dest_tif_path.with_suffix(".npz")

    if HAS_RASTERIO:
        from rasterio.transform import from_bounds
        transform = from_bounds(*ds.bbox, ds.width, ds.height)
        with rasterio.open(
            tmp_tif,
            "w",
            driver="GTiff",
            height=ds.height,
            width=ds.width,
            count=ds.count,
            dtype="float32",
            crs=ds.crs,
            transform=transform,
            nodata=ds.nodata,
        ) as dst:
            for b in range(ds.count):
                dst.write(ds.data[b], b + 1)
                if b < len(ds.band_names):
                    dst.set_band_description(b + 1, ds.band_names[b])
        os.replace(tmp_tif, dest_tif_path)
    else:
        # Write standard TIFF with GeoTIFF tags 33550 (ModelPixelScale) & 33922 (ModelTiepoint) via Pillow
        ifd = ImageFileDirectory_v2()
        ifd[TAG_MODEL_PIXEL_SCALE] = (float(ds.res_x), float(ds.res_y), 0.0)
        ifd[TAG_MODEL_TIEPOINT] = (0.0, 0.0, 0.0, float(ds.bbox[0]), float(ds.bbox[3]), 0.0)
        if ds.nodata is not None:
            ifd[TAG_GDAL_NODATA] = str(ds.nodata)

        first_band = Image.fromarray(ds.data[0].astype(np.float32), mode="F")
        first_band.save(tmp_tif, format="TIFF", tiffinfo=ifd)
        os.replace(tmp_tif, dest_tif_path)
        # Also store full multi-band float32 array in compressed npz sidecar for fast multi-band I/O
        np.savez_compressed(npz_sidecar, data=ds.data)

    band_stats = ds.compute_stats()
    meta_payload = {
        "bbox": ds.bbox,
        "crs": ds.crs,
        "width": ds.width,
        "height": ds.height,
        "count": ds.count,
        "nodata": ds.nodata,
        "band_names": ds.band_names,
        "band_stats": band_stats,
    }
    meta_sidecar.write_text(json.dumps(meta_payload, indent=2), encoding="utf-8")

    schema = [
        {
            "name": st["name"],
            "type": "raster_band",
            "nullable": st["nodata_pct"] > 0,
            "null_count": 0,
            "unique_count": 0,
            "sample": f"min={st['min']:.2f}, max={st['max']:.2f}, rata2={st['mean']:.2f}",
            "stats": st,
        }
        for st in band_stats
    ]
    return {
        "kind": "raster",
        "geom_type": "raster",
        "crs": ds.crs,
        "feature_count": ds.count,
        "bbox": ds.bbox,
        "schema": schema,
        "raster_meta": meta_payload,
    }


def load_raster_dataset(tif_path: Path) -> RasterDataset:
    meta_sidecar = tif_path.with_suffix(".meta.json")
    npz_sidecar = tif_path.with_suffix(".npz")
    meta = {}
    if meta_sidecar.exists():
        try:
            meta = json.loads(meta_sidecar.read_text(encoding="utf-8"))
        except Exception:
            meta = {}

    if HAS_RASTERIO and tif_path.exists():
        with rasterio.open(tif_path) as src:
            data = src.read().astype(np.float32)
            bounds = [float(src.bounds.left), float(src.bounds.bottom), float(src.bounds.right), float(src.bounds.top)]
            crs = str(src.crs) if src.crs else meta.get("crs", "EPSG:4326")
            nodata = src.nodata if src.nodata is not None else meta.get("nodata", -9999.0)
            bnames = [d or f"Band {i + 1}" for i, d in enumerate(src.descriptions)]
            return RasterDataset(data=data, bbox=bounds, crs=crs, nodata=nodata, band_names=meta.get("band_names") or bnames)

    if npz_sidecar.exists() and meta:
        loaded = np.load(npz_sidecar)
        return RasterDataset(
            data=loaded["data"],
            bbox=meta.get("bbox", [112.60, -7.35, 112.85, -7.20]),
            crs=meta.get("crs", "EPSG:4326"),
            nodata=meta.get("nodata", -9999.0),
            band_names=meta.get("band_names"),
        )

    # Read from TIFF via Pillow + GeoTIFF tags
    with Image.open(tif_path) as img:
        width, height = img.size
        tags = getattr(img, "tag_v2", {}) or {}
        scale = tags.get(TAG_MODEL_PIXEL_SCALE)
        tiepoint = tags.get(TAG_MODEL_TIEPOINT)
        if scale and tiepoint and len(scale) >= 2 and len(tiepoint) >= 6:
            rx, ry = float(scale[0]), float(scale[1])
            minx = float(tiepoint[3])
            maxy = float(tiepoint[4])
            maxx = minx + width * rx
            miny = maxy - height * ry
            bbox = [minx, miny, maxx, maxy]
        else:
            bbox = meta.get("bbox", [112.60, -7.35, 112.85, -7.20])

        bands = []
        n_frames = getattr(img, "n_frames", 1)
        for frame_idx in range(n_frames):
            img.seek(frame_idx)
            arr = np.array(img, dtype=np.float32)
            if arr.ndim == 3:
                for c in range(arr.shape[2]):
                    bands.append(arr[:, :, c])
            else:
                bands.append(arr)
        data = np.stack(bands, axis=0)

    return RasterDataset(
        data=data,
        bbox=bbox,
        crs=meta.get("crs", "EPSG:4326"),
        nodata=meta.get("nodata", -9999.0),
        band_names=meta.get("band_names"),
    )


def default_style_for_raster(raster_meta: dict[str, Any]) -> dict[str, Any]:
    stats = (raster_meta.get("band_stats") or [{}])[0]
    return {
        "mode": "raster",
        "cmap": "terrain",  # viridis | terrain | rdylgn | magma | blues | hillshade | rgb
        "band": 1,
        "vmin": stats.get("p2", 0.0),
        "vmax": stats.get("p98", 100.0),
        "opacity": 0.82,
        "hillshade": False,
    }


def tile_xyz_to_lonlat_bbox(z: int, x: int, y: int) -> list[float]:
    n = 2.0 ** z
    lon_min = x / n * 360.0 - 180.0
    lon_max = (x + 1) / n * 360.0 - 180.0
    lat_max = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat_min = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))
    return [lon_min, lat_min, lon_max, lat_max]


def compute_hillshade_array(elevation: np.ndarray, res_m: float = 30.0, azimuth: float = 315.0, altitude: float = 45.0) -> np.ndarray:
    dy, dx = np.gradient(elevation, res_m)
    slope = np.pi / 2.0 - np.arctan(np.sqrt(dx * dx + dy * dy))
    aspect = np.arctan2(-dx, dy)
    az_rad = np.radians(360.0 - azimuth + 90.0)
    alt_rad = np.radians(altitude)
    shaded = np.sin(alt_rad) * np.sin(slope) + np.cos(alt_rad) * np.cos(slope) * np.cos(az_rad - aspect)
    return np.clip((shaded + 1.0) / 2.0, 0.0, 1.0)


def render_raster_tile_png(
    ds: RasterDataset,
    z: int,
    x: int,
    y: int,
    cmap_name: str = "viridis",
    vmin: float | None = None,
    vmax: float | None = None,
    band: int = 1,
    tile_size: int = 256,
) -> bytes:
    """Renders a 256x256 PNG XYZ tile from the RasterDataset with colormaps or hillshade."""
    tbbox = tile_xyz_to_lonlat_bbox(z, x, y)
    rminx, rminy, rmaxx, rmaxy = ds.bbox

    # Check intersection
    if tbbox[2] <= rminx or tbbox[0] >= rmaxx or tbbox[3] <= rminy or tbbox[1] >= rmaxy:
        empty_img = Image.new("RGBA", (tile_size, tile_size), (0, 0, 0, 0))
        buf = BytesIO()
        empty_img.save(buf, format="PNG")
        return buf.getvalue()

    # Sample grid coordinates for the tile
    xs = np.linspace(tbbox[0], tbbox[2], tile_size, endpoint=False) + (tbbox[2] - tbbox[0]) / (2 * tile_size)
    ys = np.linspace(tbbox[3], tbbox[1], tile_size, endpoint=False) - (tbbox[3] - tbbox[1]) / (2 * tile_size)
    grid_x, grid_y = np.meshgrid(xs, ys)

    rows, cols = ds.xy_to_rowcol(grid_x, grid_y)
    in_bounds = (rows >= 0) & (rows < ds.height) & (cols >= 0) & (cols < ds.width)

    b_idx = max(0, min(ds.count - 1, band - 1))
    band_arr = ds.data[b_idx]

    sampled = np.full((tile_size, tile_size), np.nan, dtype=np.float32)
    valid_rows = rows[in_bounds]
    valid_cols = cols[in_bounds]
    sampled[in_bounds] = band_arr[valid_rows, valid_cols]

    mask = np.isfinite(sampled)
    if ds.nodata is not None:
        mask &= ~np.isclose(sampled, ds.nodata)

    if not np.any(mask):
        empty_img = Image.new("RGBA", (tile_size, tile_size), (0, 0, 0, 0))
        buf = BytesIO()
        empty_img.save(buf, format="PNG")
        return buf.getvalue()

    if cmap_name.lower() == "hillshade":
        filled = np.where(mask, sampled, np.nanmean(sampled[mask]))
        norm = compute_hillshade_array(filled)
        rgba = (matplotlib.colormaps["gray"](norm) * 255).astype(np.uint8)
        rgba[~mask, 3] = 0
    else:
        if vmin is None or vmax is None:
            valid_vals = ds.data[b_idx][ds.valid_mask(b_idx)]
            if valid_vals.size > 0:
                p2, p98 = np.percentile(valid_vals, [2, 98])
                vmin = float(p2) if vmin is None else vmin
                vmax = float(p98) if vmax is None else vmax
            else:
                vmin, vmax = 0.0, 1.0
        denom = (vmax - vmin) if (vmax - vmin) != 0 else 1.0
        norm = np.clip((sampled - vmin) / denom, 0.0, 1.0)
        norm = np.nan_to_num(norm, nan=0.0)

        mpl_map = {
            "viridis": "viridis",
            "terrain": "terrain",
            "ndvi": "RdYlGn",
            "rdylgn": "RdYlGn",
            "magma": "magma",
            "blues": "YlGnBu",
            "plasma": "plasma",
            "coolwarm": "coolwarm",
        }.get(cmap_name.lower(), "viridis")

        cmap_fn = matplotlib.colormaps[mpl_map]
        rgba = (cmap_fn(norm) * 255).astype(np.uint8)
        rgba[~mask, 3] = 0

    img = Image.fromarray(rgba, mode="RGBA")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
