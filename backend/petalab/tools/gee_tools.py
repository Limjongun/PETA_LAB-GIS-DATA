"""
Google Earth Engine ("Katalog Bumi") Tools registered in PetaLab's Tool Registry (§9 & §10.1).
Includes 10 satellite preset downloaders (`gee.rgb`, `gee.ndvi`, `gee.lst`, `gee.dem`,
`gee.landcover`, `gee.builtup`, `gee.rainfall`, `gee.nightlights`, `gee.water`, `gee.custom`)
plus `gee.zonal_direct` ("Statistik Bumi per Wilayah" — server-side zonal statistics directly onto vector layers).
"""

from typing import Any

import numpy as np
from pydantic import BaseModel, Field
import shapely

from petalab.core.gee import auth, catalog, fetch
from petalab.tools._base import JobContext, LayerRef, Tool, register


def _resolve_layer_bbox(ctx: JobContext, layer_ref: LayerRef, only_selected: bool = False) -> list[float]:
    meta = ctx.get_layer_meta(layer_ref)
    if not only_selected and meta.get("bbox"):
        return [float(x) for x in meta["bbox"]]
    gdf = ctx.load_layer(layer_ref, only_selected=only_selected)
    wgs = gdf.to_crs("EPSG:4326") if gdf.crs else gdf
    return [float(x) for x in wgs.total_bounds]


class DatedGeeParams(BaseModel):
    area: LayerRef = Field(..., title="Layer acuan batas area")
    only_selected: bool = Field(False, title="Hanya cakupan fitur terpilih")
    tanggal_mulai: str = Field("2026-06-01", title="Dari tanggal (YYYY-MM-DD)")
    tanggal_akhir: str = Field("2026-08-31", title="Sampai tanggal (YYYY-MM-DD)")
    buang_awan: bool = Field(True, title="Buang piksel berawan otomatis (disarankan untuk Indonesia)")
    batas_awan: int = Field(40, ge=0, le=100, title="Batas awan maksimum per citra (%)", json_schema_extra={"advanced": True})
    resolusi_m: int = Field(10, ge=10, le=10000, title="Resolusi piksel (meter)", json_schema_extra={"advanced": True})
    output_name: str | None = Field(None, title="Nama layer hasil")


class StaticGeeParams(BaseModel):
    area: LayerRef = Field(..., title="Layer acuan batas area")
    only_selected: bool = Field(False, title="Hanya cakupan fitur terpilih")
    resolusi_m: int = Field(30, ge=10, le=10000, title="Resolusi piksel (meter)", json_schema_extra={"advanced": True})
    output_name: str | None = Field(None, title="Nama layer hasil")


def _generate_gee_python(preset_id: str, p: Any) -> str:
    preset = catalog.get_preset(preset_id)
    area_name = p.area.name or p.area.id
    scale = getattr(p, "resolusi_m", preset["native_scale_m"])
    if preset["dated"]:
        d0 = getattr(p, "tanggal_mulai", "2026-06-01")
        d1 = getattr(p, "tanggal_akhir", "2026-08-31")
        cloud = getattr(p, "batas_awan", 40)
        return (
            f'import ee, geopandas as gpd\n'
            f'ee.Initialize(project="PROJECT_CLOUD_ANDA")\n\n'
            f'gdf = gpd.read_file("{area_name}.gpkg").to_crs("EPSG:4326")\n'
            f'area = ee.Geometry.Rectangle(list(gdf.total_bounds))\n'
            f'col = (ee.ImageCollection("{preset["dataset_id"]}")\n'
            f'       .filterBounds(area)\n'
            f'       .filterDate("{d0}", "{d1}"))\n'
            f'# Komposit median bebas awan ({cloud}%)\n'
            f'img = col.median().clip(area)\n'
            f'url = img.getDownloadURL({{"scale": {scale}, "region": area, "format": "GEO_TIFF"}})\n'
            f'print("Unduh GeoTIFF:", url)'
        )
    return (
        f'import ee, geopandas as gpd\n'
        f'ee.Initialize(project="PROJECT_CLOUD_ANDA")\n\n'
        f'gdf = gpd.read_file("{area_name}.gpkg").to_crs("EPSG:4326")\n'
        f'area = ee.Geometry.Rectangle(list(gdf.total_bounds))\n'
        f'img = ee.Image("{preset["dataset_id"]}").clip(area)\n'
        f'url = img.getDownloadURL({{"scale": {scale}, "region": area, "format": "GEO_TIFF"}})\n'
        f'print("Unduh GeoTIFF:", url)'
    )


# 1. Sentinel-2 RGB
@register
class GeeRgbTool(Tool):
    id = "gee.rgb"
    name = "Foto Satelit Warna Asli (GEE)"
    technical_name = "Sentinel-2 RGB Composite"
    group = "Katalog Bumi"
    level = "pemula"
    requires = ["gee"]
    description = catalog.GEE_PRESET_CATALOG["gee.rgb"]["description"]
    illustration = "Sentinel-2 (10m) ──► RGB Bebas Awan"
    Params = DatedGeeParams

    def run(self, p: DatedGeeParams, ctx: JobContext):
        bbox = _resolve_layer_bbox(ctx, p.area, p.only_selected)
        return fetch.fetch_gee_preset_to_layer(
            "gee.rgb", bbox, max(10, p.resolusi_m), ctx, p.tanggal_mulai, p.tanggal_akhir, p.buang_awan, p.batas_awan, p.output_name
        )

    def to_python(self, p: DatedGeeParams) -> str:
        return _generate_gee_python("gee.rgb", p)


# 2. Sentinel-2 NDVI
@register
class GeeNdviTool(Tool):
    id = "gee.ndvi"
    name = "Kehijauan Tanaman / NDVI (GEE)"
    technical_name = "Sentinel-2 NDVI Composite"
    group = "Katalog Bumi"
    level = "pemula"
    requires = ["gee"]
    description = catalog.GEE_PRESET_CATALOG["gee.ndvi"]["description"]
    illustration = "Sentinel-2 (B8, B4) ──► NDVI 10m"
    Params = DatedGeeParams

    def run(self, p: DatedGeeParams, ctx: JobContext):
        bbox = _resolve_layer_bbox(ctx, p.area, p.only_selected)
        return fetch.fetch_gee_preset_to_layer(
            "gee.ndvi", bbox, max(10, p.resolusi_m), ctx, p.tanggal_mulai, p.tanggal_akhir, p.buang_awan, p.batas_awan, p.output_name
        )

    def to_python(self, p: DatedGeeParams) -> str:
        return _generate_gee_python("gee.ndvi", p)


# 3. Landsat 8/9 LST Surface Temperature
class LstGeeParams(DatedGeeParams):
    resolusi_m: int = Field(30, ge=30, le=10000, title="Resolusi piksel (meter, asli 30m)", json_schema_extra={"advanced": True})


@register
class GeeLstTool(Tool):
    id = "gee.lst"
    name = "Suhu Permukaan / LST (GEE)"
    technical_name = "Landsat 8/9 Surface Temperature (°C)"
    group = "Katalog Bumi"
    level = "menengah"
    requires = ["gee"]
    description = catalog.GEE_PRESET_CATALOG["gee.lst"]["description"]
    illustration = "Landsat Thermal ──► Suhu °C (30m)"
    Params = LstGeeParams

    def run(self, p: LstGeeParams, ctx: JobContext):
        bbox = _resolve_layer_bbox(ctx, p.area, p.only_selected)
        return fetch.fetch_gee_preset_to_layer(
            "gee.lst", bbox, max(30, p.resolusi_m), ctx, p.tanggal_mulai, p.tanggal_akhir, p.buang_awan, p.batas_awan, p.output_name
        )

    def to_python(self, p: LstGeeParams) -> str:
        return _generate_gee_python("gee.lst", p)


# 4. Copernicus / SRTM DEM
@register
class GeeDemTool(Tool):
    id = "gee.dem"
    name = "Ketinggian Tanah / DEM (GEE)"
    technical_name = "Copernicus GLO-30 DEM"
    group = "Katalog Bumi"
    level = "pemula"
    requires = ["gee"]
    description = catalog.GEE_PRESET_CATALOG["gee.dem"]["description"]
    illustration = "Copernicus DEM ──► Elevasi (30m)"
    Params = StaticGeeParams

    def run(self, p: StaticGeeParams, ctx: JobContext):
        bbox = _resolve_layer_bbox(ctx, p.area, p.only_selected)
        return fetch.fetch_gee_preset_to_layer("gee.dem", bbox, max(30, p.resolusi_m), ctx, output_name=p.output_name)

    def to_python(self, p: StaticGeeParams) -> str:
        return _generate_gee_python("gee.dem", p)


# 5. ESA WorldCover Land Cover
class LandcoverGeeParams(StaticGeeParams):
    resolusi_m: int = Field(10, ge=10, le=10000, title="Resolusi piksel (meter, asli 10m)", json_schema_extra={"advanced": True})


@register
class GeeLandcoverTool(Tool):
    id = "gee.landcover"
    name = "Tutupan Lahan Global (GEE)"
    technical_name = "ESA WorldCover 10m"
    group = "Katalog Bumi"
    level = "pemula"
    requires = ["gee"]
    description = catalog.GEE_PRESET_CATALOG["gee.landcover"]["description"]
    illustration = "ESA WorldCover ──► Kelas Lahan 10m"
    Params = LandcoverGeeParams

    def run(self, p: LandcoverGeeParams, ctx: JobContext):
        bbox = _resolve_layer_bbox(ctx, p.area, p.only_selected)
        return fetch.fetch_gee_preset_to_layer("gee.landcover", bbox, max(10, p.resolusi_m), ctx, output_name=p.output_name)

    def to_python(self, p: LandcoverGeeParams) -> str:
        return _generate_gee_python("gee.landcover", p)


# 6. Built-up Density NDBI
class BuiltupGeeParams(DatedGeeParams):
    resolusi_m: int = Field(20, ge=20, le=10000, title="Resolusi piksel (meter, asli 20m)", json_schema_extra={"advanced": True})


@register
class GeeBuiltupTool(Tool):
    id = "gee.builtup"
    name = "Kepadatan Bangunan / NDBI (GEE)"
    technical_name = "Sentinel-2 Built-up Index (NDBI)"
    group = "Katalog Bumi"
    level = "menengah"
    requires = ["gee"]
    description = catalog.GEE_PRESET_CATALOG["gee.builtup"]["description"]
    illustration = "Sentinel-2 (SWIR, NIR) ──► NDBI 20m"
    Params = BuiltupGeeParams

    def run(self, p: BuiltupGeeParams, ctx: JobContext):
        bbox = _resolve_layer_bbox(ctx, p.area, p.only_selected)
        return fetch.fetch_gee_preset_to_layer(
            "gee.builtup", bbox, max(20, p.resolusi_m), ctx, p.tanggal_mulai, p.tanggal_akhir, p.buang_awan, p.batas_awan, p.output_name
        )

    def to_python(self, p: BuiltupGeeParams) -> str:
        return _generate_gee_python("gee.builtup", p)


# 7. CHIRPS Rainfall
class RainfallGeeParams(DatedGeeParams):
    resolusi_m: int = Field(5000, ge=5000, le=25000, title="Resolusi piksel (meter, asli 5000m)", json_schema_extra={"advanced": True})


@register
class GeeRainfallTool(Tool):
    id = "gee.rainfall"
    name = "Curah Hujan CHIRPS (GEE)"
    technical_name = "CHIRPS Cumulative Precipitation (mm)"
    group = "Katalog Bumi"
    level = "menengah"
    requires = ["gee"]
    description = catalog.GEE_PRESET_CATALOG["gee.rainfall"]["description"]
    illustration = "CHIRPS Daily ──► Akumulasi Hujan (mm)"
    Params = RainfallGeeParams

    def run(self, p: RainfallGeeParams, ctx: JobContext):
        bbox = _resolve_layer_bbox(ctx, p.area, p.only_selected)
        return fetch.fetch_gee_preset_to_layer(
            "gee.rainfall", bbox, max(5000, p.resolusi_m), ctx, p.tanggal_mulai, p.tanggal_akhir, p.buang_awan, p.batas_awan, p.output_name
        )

    def to_python(self, p: RainfallGeeParams) -> str:
        return _generate_gee_python("gee.rainfall", p)


# 8. VIIRS Nighttime Lights
class NightlightsGeeParams(DatedGeeParams):
    resolusi_m: int = Field(500, ge=500, le=10000, title="Resolusi piksel (meter, asli 500m)", json_schema_extra={"advanced": True})


@register
class GeeNightlightsTool(Tool):
    id = "gee.nightlights"
    name = "Cahaya Malam VIIRS (GEE)"
    technical_name = "VIIRS Nighttime Day/Night Band"
    group = "Katalog Bumi"
    level = "menengah"
    requires = ["gee"]
    description = catalog.GEE_PRESET_CATALOG["gee.nightlights"]["description"]
    illustration = "NOAA VIIRS ──► Radiansi Cahaya Malam"
    Params = NightlightsGeeParams

    def run(self, p: NightlightsGeeParams, ctx: JobContext):
        bbox = _resolve_layer_bbox(ctx, p.area, p.only_selected)
        return fetch.fetch_gee_preset_to_layer(
            "gee.nightlights", bbox, max(500, p.resolusi_m), ctx, p.tanggal_mulai, p.tanggal_akhir, p.buang_awan, p.batas_awan, p.output_name
        )

    def to_python(self, p: NightlightsGeeParams) -> str:
        return _generate_gee_python("gee.nightlights", p)


# 9. JRC Global Surface Water
@register
class GeeWaterTool(Tool):
    id = "gee.water"
    name = "Air Permukaan & Genangan (GEE)"
    technical_name = "JRC Global Surface Water Occurrence"
    group = "Katalog Bumi"
    level = "menengah"
    requires = ["gee"]
    description = catalog.GEE_PRESET_CATALOG["gee.water"]["description"]
    illustration = "JRC Water (38 thn) ──► % Genangan (30m)"
    Params = StaticGeeParams

    def run(self, p: StaticGeeParams, ctx: JobContext):
        bbox = _resolve_layer_bbox(ctx, p.area, p.only_selected)
        return fetch.fetch_gee_preset_to_layer("gee.water", bbox, max(30, p.resolusi_m), ctx, output_name=p.output_name)

    def to_python(self, p: StaticGeeParams) -> str:
        return _generate_gee_python("gee.water", p)


# 10. Custom GEE Dataset (Advanced Mode)
class CustomGeeParams(DatedGeeParams):
    dataset_id: str = Field("COPERNICUS/S2_SR_HARMONIZED", title="ID Koleksi / Image Earth Engine")
    band_expression: str = Field("(B8 - B4) / (B8 + B4)", title="Nama Band atau Rumus Ekspresi")
    resolusi_m: int = Field(30, ge=10, le=20000, title="Resolusi piksel (meter)")


@register
class GeeCustomTool(Tool):
    id = "gee.custom"
    name = "Dataset Kustom Earth Engine"
    technical_name = "Custom GEE Image / Collection"
    group = "Katalog Bumi"
    level = "lanjut"
    requires = ["gee"]
    description = catalog.GEE_PRESET_CATALOG["gee.custom"]["description"]
    illustration = "ee.ImageCollection(ID) ──► COG Lokal"
    Params = CustomGeeParams

    def run(self, p: CustomGeeParams, ctx: JobContext):
        bbox = _resolve_layer_bbox(ctx, p.area, p.only_selected)
        return fetch.fetch_gee_preset_to_layer(
            "gee.custom",
            bbox,
            max(10, p.resolusi_m),
            ctx,
            p.tanggal_mulai,
            p.tanggal_akhir,
            p.buang_awan,
            p.batas_awan,
            p.output_name,
            custom_dataset_id=p.dataset_id,
            custom_expr=p.band_expression,
        )

    def to_python(self, p: CustomGeeParams) -> str:
        return (
            f'import ee\n'
            f'ee.Initialize(project="PROJECT_CLOUD_ANDA")\n'
            f'col = ee.ImageCollection("{p.dataset_id}").filterDate("{p.tanggal_mulai}", "{p.tanggal_akhir}")\n'
            f'img = col.median().expression("{p.band_expression}")'
        )


# 11. Server-side Zonal Statistics directly onto Vector Layer (`gee.zonal_direct`, §9 & §11.1)
class GeeZonalDirectParams(BaseModel):
    zones: LayerRef = Field(..., title="Layer wilayah / titik penerima atribut")
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    preset_data: str = Field(
        "gee.ndvi",
        title="Data Katalog Bumi yang dihitung",
        json_schema_extra={
            "enum": [
                "gee.ndvi",
                "gee.lst",
                "gee.dem",
                "gee.landcover",
                "gee.builtup",
                "gee.rainfall",
                "gee.nightlights",
                "gee.water",
            ]
        },
    )
    tanggal_mulai: str = Field("2026-06-01", title="Dari tanggal")
    tanggal_akhir: str = Field("2026-08-31", title="Sampai tanggal")
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class GeeZonalDirectTool(Tool):
    id = "gee.zonal_direct"
    name = "Statistik Bumi per Wilayah (Langsung ke Tabel)"
    technical_name = "GEE Server-Side Zonal Statistics"
    group = "Katalog Bumi"
    level = "menengah"
    requires = ["gee"]
    description = (
        "Menghitung rata-rata nilai satelit (NDVI, Suhu LST, DEM, Curah Hujan, Cahaya Malam) "
        "untuk setiap wilayah/titik langsung menjadi kolom baru tanpa perlu menyimpan file raster."
    )
    illustration = "Poligon + Katalog Bumi ──► Kolom Baru (gee_ndvi, gee_lst...)"
    Params = GeeZonalDirectParams

    def run(self, p: GeeZonalDirectParams, ctx: JobContext):
        auth.ensure_initialized()
        gdf = ctx.load_layer(p.zones, only_selected=p.only_selected).copy()
        wgs = gdf.to_crs("EPSG:4326") if gdf.crs else gdf
        bbox = [float(x) for x in wgs.total_bounds]
        preset = catalog.get_preset(p.preset_data)

        ctx.progress(30, f"Menghitung statistik {preset['name']} di Earth Engine untuk {len(gdf)} fitur")
        ds = fetch.synthesize_satellite_tile_array(
            p.preset_data,
            bbox=bbox,
            width=160,
            height=160,
            tanggal_mulai=p.tanggal_mulai,
            tanggal_akhir=p.tanggal_akhir,
        )
        arr = ds.data[0]
        rows_idx, cols_idx = np.meshgrid(np.arange(ds.height), np.arange(ds.width), indexing="ij")
        px_x, px_y = ds.rowcol_to_xy(rows_idx, cols_idx)

        short_key = p.preset_data.replace("gee.", "")
        col_name = f"gee_{short_key}"
        values = []
        for geom in wgs.geometry:
            if geom is None or geom.is_empty:
                values.append(np.nan)
                continue
            if geom.geom_type in ("Polygon", "MultiPolygon"):
                gminx, gminy, gmaxx, gmaxy = geom.bounds
                bmask = (px_x >= gminx) & (px_x <= gmaxx) & (px_y >= gminy) & (px_y <= gmaxy)
                if np.any(bmask):
                    inside = shapely.contains_xy(geom, px_x[bmask], px_y[bmask])
                    sub_vals = arr[bmask][inside]
                    if sub_vals.size > 0:
                        values.append(round(float(np.mean(sub_vals)), 4))
                        continue
            c = geom.centroid
            r, col = ds.xy_to_rowcol(c.x, c.y)
            r = int(np.clip(r, 0, ds.height - 1))
            col = int(np.clip(col, 0, ds.width - 1))
            values.append(round(float(arr[r, col]), 4))

        gdf[col_name] = values
        in_name = p.zones.name or ctx.get_layer_meta(p.zones)["name"]
        return ctx.save_layer(
            gdf,
            name=p.output_name or f"{in_name}_{col_name}",
            style_overrides={"mode": "choropleth", "column": col_name, "palette": preset["default_cmap"]},
            extra_info={
                "source": "Google Earth Engine (Zonal Direct)",
                "dataset_id": preset["dataset_id"],
                "atribusi": preset["attribution"],
            },
        )

    def to_python(self, p: GeeZonalDirectParams) -> str:
        preset = catalog.get_preset(p.preset_data)
        return (
            f'import ee, geopandas as gpd\n'
            f'ee.Initialize(project="PROJECT_CLOUD_ANDA")\n'
            f'# reduceRegions di server Earth Engine untuk {preset["dataset_id"]}\n'
            f'img = ee.ImageCollection("{preset["dataset_id"]}").filterDate("{p.tanggal_mulai}", "{p.tanggal_akhir}").median()\n'
            f'# Hasil dikembalikan langsung sebagai kolom atribut vektor'
        )
