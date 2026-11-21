import numpy as np
from pydantic import BaseModel, Field

from petalab.core.io_raster import RasterDataset
from petalab.tools._base import JobContext, LayerRef, Tool, register


class SpectralIndexParams(BaseModel):
    raster: LayerRef = Field(..., title="Layer citra satelit (Multi-band)", json_schema_extra={"kind": "raster"})
    index_type: str = Field(
        "NDVI",
        title="Jenis Indeks",
        json_schema_extra={"enum": ["NDVI (Kehijauan Vegetasi)", "NDWI (Badan Air / Kelembapan)", "NDBI (Kerapatan Bangunan)"]},
    )
    band_a: int = Field(3, ge=1, title="Band NIR / Green (Band A)")
    band_b: int = Field(2, ge=1, title="Band Red / NIR (Band B)")
    output_name: str | None = Field(None, title="Nama layer raster hasil")


@register
class SpectralIndexTool(Tool):
    id = "raster.index"
    name = "Indeks Vegetasi / Air / Bangunan"
    technical_name = "NDVI / NDWI / NDBI"
    group = "Raster"
    level = "pemula"
    description = "Menghitung indeks kehijauan tanaman (NDVI), air (NDWI), atau kerapatan bangunan dari band citra satelit: (BandA - BandB) / (BandA + BandB)."
    illustration = "(NIR - Red) / (NIR + Red) ──► NDVI"
    Params = SpectralIndexParams

    def run(self, p: SpectralIndexParams, ctx: JobContext):
        ds = ctx.load_raster(p.raster)
        ia = max(0, min(ds.count - 1, p.band_a - 1))
        ib = max(0, min(ds.count - 1, p.band_b - 1))
        ctx.progress(40, f"Menghitung {p.index_type} dari Band {ia + 1} dan Band {ib + 1}")

        a = ds.data[ia].astype(np.float32)
        b = ds.data[ib].astype(np.float32)
        denom = a + b
        idx_arr = np.where(np.abs(denom) > 1e-6, (a - b) / denom, 0.0)
        idx_arr = np.clip(idx_arr, -1.0, 1.0).astype(np.float32)

        short_code = p.index_type.split()[0]
        out_ds = RasterDataset(
            data=idx_arr[np.newaxis, :, :],
            bbox=ds.bbox,
            crs=ds.crs,
            nodata=-9999.0,
            band_names=[short_code],
        )
        in_name = p.raster.name or ctx.get_layer_meta(p.raster)["name"]
        cmap = "rdylgn" if short_code == "NDVI" else ("blues" if short_code == "NDWI" else "magma")
        return ctx.save_raster(
            out_ds,
            name=p.output_name or f"{in_name}_{short_code.lower()}",
            style_overrides={"cmap": cmap, "vmin": -0.2, "vmax": 0.7},
        )

    def to_python(self, p: SpectralIndexParams) -> str:
        return (
            f'import rasterio, numpy as np\n'
            f'with rasterio.open("{p.raster.name or p.raster.id}.tif") as src:\n'
            f'    nir = src.read({p.band_a}).astype("float32")\n'
            f'    red = src.read({p.band_b}).astype("float32")\n'
            f'    ndvi = np.where((nir + red) != 0, (nir - red) / (nir + red), 0)'
        )
