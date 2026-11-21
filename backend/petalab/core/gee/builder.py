"""
Real Google Earth Engine (`ee`) Image Builder, Cloud Masker, Live `getMapId()` Tile Fetcher,
and Live `getDownloadURL()` GeoTIFF Downloader (§10.1 & §8).
Uses lazy `import ee` inside functions so PetaLab remains 100% functional even without `earthengine-api`.
"""

from pathlib import Path
import tempfile
from typing import Any
import zipfile

import httpx

from petalab.core.gee import catalog, errors
from petalab.core.io_raster import RasterDataset, load_raster_dataset

CMAP_PALETTES_HEX: dict[str, list[str]] = {
    "rdylgn": ["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"],
    "ndvi": ["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"],
    "terrain": ["#333399", "#00a600", "#e6e600", "#eab64e", "#ffffff"],
    "magma": ["#000004", "#51127c", "#b73779", "#fc8961", "#fcfdbf"],
    "blues": ["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"],
    "viridis": ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"],
}


def _mask_s2_clouds(image: Any) -> Any:
    qa = image.select("QA60")
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    mask = qa.bitwiseAnd(cloud_bit_mask).eq(0).And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))
    return image.updateMask(mask).divide(10000)


def _mask_landsat_clouds(image: Any) -> Any:
    qa = image.select("QA_PIXEL")
    # Bit 3 = Cloud, Bit 4 = Cloud Shadow
    mask = qa.bitwiseAnd(1 << 3).eq(0).And(qa.bitwiseAnd(1 << 4).eq(0))
    return image.updateMask(mask)


def build_ee_image(
    preset_id: str,
    bbox: list[float],
    tanggal_mulai: str = "2026-06-01",
    tanggal_akhir: str = "2026-08-31",
    buang_awan: bool = True,
    batas_awan: int = 40,
    custom_dataset_id: str | None = None,
    custom_expr: str | None = None,
) -> tuple[Any, Any, int]:
    """
    Constructs a lazy `ee.Image` clipped to `bbox` and returns `(ee_image, ee_region, scene_count)`.
    """
    import ee

    preset = catalog.get_preset(preset_id)
    region = ee.Geometry.Rectangle([float(x) for x in bbox])
    n_scenes = 1

    if preset_id == "gee.rgb":
        col = (
            ee.ImageCollection(preset["dataset_id"])
            .filterBounds(region)
            .filterDate(tanggal_mulai, tanggal_akhir)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", batas_awan))
        )
        n_scenes = int(col.size().getInfo())
        if buang_awan:
            col = col.map(_mask_s2_clouds)
        else:
            col = col.map(lambda im: im.divide(10000))
        img = col.select(["B4", "B3", "B2"]).median().clip(region)

    elif preset_id == "gee.ndvi":
        col = (
            ee.ImageCollection(preset["dataset_id"])
            .filterBounds(region)
            .filterDate(tanggal_mulai, tanggal_akhir)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", batas_awan))
        )
        n_scenes = int(col.size().getInfo())
        if buang_awan:
            col = col.map(_mask_s2_clouds)
        img = col.map(lambda im: im.normalizedDifference(["B8", "B4"]).rename("NDVI")).median().clip(region)

    elif preset_id == "gee.builtup":
        col = (
            ee.ImageCollection(preset["dataset_id"])
            .filterBounds(region)
            .filterDate(tanggal_mulai, tanggal_akhir)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", batas_awan))
        )
        n_scenes = int(col.size().getInfo())
        if buang_awan:
            col = col.map(_mask_s2_clouds)
        img = col.map(lambda im: im.normalizedDifference(["B11", "B8"]).rename("NDBI")).median().clip(region)

    elif preset_id == "gee.lst":
        col = (
            ee.ImageCollection(preset["dataset_id"])
            .filterBounds(region)
            .filterDate(tanggal_mulai, tanggal_akhir)
            .filter(ee.Filter.lt("CLOUD_COVER", batas_awan))
        )
        n_scenes = int(col.size().getInfo())
        if buang_awan:
            col = col.map(_mask_landsat_clouds)
        # Convert Landsat C2 L2 ST_B10 Kelvin to Celsius
        img = (
            col.map(lambda im: im.select("ST_B10").multiply(0.00341802).add(149.0).subtract(273.15).rename("LST_Celsius"))
            .median()
            .clip(region)
        )

    elif preset_id == "gee.dem":
        img = ee.ImageCollection(preset["dataset_id"]).select("DEM").mosaic().clip(region)

    elif preset_id == "gee.landcover":
        img = ee.ImageCollection(preset["dataset_id"]).first().select("Map").clip(region)

    elif preset_id == "gee.rainfall":
        col = ee.ImageCollection(preset["dataset_id"]).filterBounds(region).filterDate(tanggal_mulai, tanggal_akhir)
        n_scenes = int(col.size().getInfo())
        img = col.select("precipitation").sum().clip(region)

    elif preset_id == "gee.nightlights":
        col = ee.ImageCollection(preset["dataset_id"]).filterBounds(region).filterDate(tanggal_mulai, tanggal_akhir)
        n_scenes = int(col.size().getInfo())
        img = col.select("avg_rad").median().clip(region)

    elif preset_id == "gee.water":
        img = ee.Image(preset["dataset_id"]).select("occurrence").clip(region)

    else:
        ds_id = custom_dataset_id or preset["dataset_id"]
        col = ee.ImageCollection(ds_id).filterBounds(region).filterDate(tanggal_mulai, tanggal_akhir)
        n_scenes = int(col.size().getInfo())
        med = col.median()
        img = (med.expression(custom_expr) if custom_expr else med).clip(region)

    return img, region, n_scenes


def get_live_ee_map_tile_url(
    preset_id: str,
    bbox: list[float],
    cmap: str | None = None,
    tanggal_mulai: str = "2026-06-01",
    tanggal_akhir: str = "2026-08-31",
    buang_awan: bool = True,
    batas_awan: int = 40,
) -> tuple[str, int]:
    """Path A (Live GEE): Calls `ee.Image.getMapId()` to obtain instant Google XYZ tile URL."""
    preset = catalog.get_preset(preset_id)
    img, _, n_scenes = build_ee_image(
        preset_id=preset_id,
        bbox=bbox,
        tanggal_mulai=tanggal_mulai,
        tanggal_akhir=tanggal_akhir,
        buang_awan=buang_awan,
        batas_awan=batas_awan,
    )
    vmin, vmax = preset["default_range"]
    if preset_id == "gee.rgb":
        vis_params = {"bands": ["B4", "B3", "B2"], "min": 0.0, "max": 0.3}
    else:
        pal = CMAP_PALETTES_HEX.get((cmap or preset["default_cmap"]).lower(), CMAP_PALETTES_HEX["viridis"])
        vis_params = {"min": vmin, "max": vmax, "palette": pal}

    map_id_dict = img.getMapId(vis_params)
    url_format = map_id_dict["tile_fetcher"].url_format
    return url_format, n_scenes


def download_live_ee_tile_to_dataset(
    preset_id: str,
    bbox: list[float],
    scale: int,
    tanggal_mulai: str = "2026-06-01",
    tanggal_akhir: str = "2026-08-31",
    buang_awan: bool = True,
    batas_awan: int = 40,
    custom_dataset_id: str | None = None,
    custom_expr: str | None = None,
) -> RasterDataset:
    """Path B/C (Live GEE): Downloads a GeoTIFF directly from Google Earth Engine `getDownloadURL()`."""
    preset = catalog.get_preset(preset_id)
    img, region, _ = build_ee_image(
        preset_id=preset_id,
        bbox=bbox,
        tanggal_mulai=tanggal_mulai,
        tanggal_akhir=tanggal_akhir,
        buang_awan=buang_awan,
        batas_awan=batas_awan,
        custom_dataset_id=custom_dataset_id,
        custom_expr=custom_expr,
    )
    url = img.getDownloadURL({
        "scale": int(scale),
        "region": region,
        "crs": "EPSG:4326",
        "format": "GEO_TIFF",
    })
    with tempfile.TemporaryDirectory() as tmpdir:
        out_file = Path(tmpdir) / "gee_tile.tif"
        with httpx.Client(timeout=120.0, follow_redirects=True) as client:
            resp = client.get(url)
            resp.raise_for_status()
            out_file.write_bytes(resp.content)

        # Handle zipped GeoTIFF if GEE returned a zip archive
        if zipfile.is_zipfile(out_file):
            with zipfile.ZipFile(out_file, "r") as zf:
                zf.extractall(tmpdir)
            tifs = list(Path(tmpdir).glob("*.tif"))
            if tifs:
                out_file = tifs[0]

        ds = load_raster_dataset(out_file)
        ds.bbox = [float(x) for x in bbox]
        ds.band_names = preset["band_labels"][: ds.count]
        return ds
