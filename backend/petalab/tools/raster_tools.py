import geopandas as gpd
import numpy as np
from pydantic import BaseModel, Field
import shapely
from shapely.geometry import Polygon

from petalab.core.io_raster import RasterDataset, compute_hillshade_array
from petalab.errors import PetaLabError
from petalab.tools._base import JobContext, LayerRef, Tool, register


# 1. Raster Clip / Mask
class RasterClipParams(BaseModel):
    raster: LayerRef = Field(..., title="Layer raster", json_schema_extra={"kind": "raster"})
    mask: LayerRef = Field(..., title="Layer area pemotong (Poligon)", json_schema_extra={"geom": ["polygon"]})
    only_selected: bool = Field(False, title="Hanya fitur terpilih pada pemotong")
    output_name: str | None = Field(None, title="Nama layer raster hasil")


@register
class RasterClipTool(Tool):
    id = "raster.clip"
    name = "Potong Raster dengan Area"
    technical_name = "Raster Clip / Mask"
    group = "Raster"
    level = "pemula"
    description = "Memotong citra atau raster DEM mengikuti batas wilayah poligon."
    illustration = "▓▓ ∩ ▣ ──► ▓"
    Params = RasterClipParams

    def run(self, p: RasterClipParams, ctx: JobContext):
        ds = ctx.load_raster(p.raster)
        polys = ctx.load_layer(p.mask, only_selected=p.only_selected)
        wgs_polys = polys.to_crs("EPSG:4326") if polys.crs else polys
        union_geom = wgs_polys.geometry.union_all()

        rows_idx, cols_idx = np.meshgrid(np.arange(ds.height), np.arange(ds.width), indexing="ij")
        px_x, px_y = ds.rowcol_to_xy(rows_idx, cols_idx)
        ctx.progress(50, "Memotong piksel di luar batas poligon")
        inside = shapely.contains_xy(union_geom, px_x, px_y)

        nodata_val = ds.nodata if ds.nodata is not None else -9999.0
        new_data = ds.data.copy()
        for b in range(ds.count):
            new_data[b] = np.where(inside, new_data[b], nodata_val)

        out_ds = RasterDataset(
            data=new_data,
            bbox=ds.bbox,
            crs=ds.crs,
            nodata=nodata_val,
            band_names=ds.band_names,
        )
        in_name = p.raster.name or ctx.get_layer_meta(p.raster)["name"]
        return ctx.save_raster(out_ds, name=p.output_name or f"{in_name}_clip")


# 2. Sample Raster Values to Points
class RasterSampleParams(BaseModel):
    points: LayerRef = Field(..., title="Layer titik", json_schema_extra={"geom": ["point"]})
    only_selected: bool = Field(False, title="Hanya titik terpilih")
    raster: LayerRef = Field(..., title="Layer raster sumber nilai", json_schema_extra={"kind": "raster"})
    band: int = Field(1, ge=1, title="Nomor Band")
    column_name: str = Field("nilai_raster", title="Nama kolom hasil")
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class RasterSampleTool(Tool):
    id = "raster.sample"
    name = "Ambil Nilai Raster ke Titik"
    technical_name = "Sample Raster Values"
    group = "Raster"
    level = "pemula"
    description = "Membaca nilai piksel raster (seperti ketinggian DEM atau NDVI) tepat di posisi setiap titik."
    illustration = "● + ▓▓ ──► ● (nilai = 14.2)"
    Params = RasterSampleParams

    def run(self, p: RasterSampleParams, ctx: JobContext):
        pts = ctx.load_layer(p.points, only_selected=p.only_selected).copy()
        ds = ctx.load_raster(p.raster)
        b_idx = max(0, min(ds.count - 1, p.band - 1))
        arr = ds.data[b_idx]

        wgs_pts = pts.to_crs("EPSG:4326") if pts.crs else pts
        xs = wgs_pts.geometry.centroid.x.to_numpy()
        ys = wgs_pts.geometry.centroid.y.to_numpy()
        rows, cols = ds.xy_to_rowcol(xs, ys)
        rows = np.clip(rows, 0, ds.height - 1)
        cols = np.clip(cols, 0, ds.width - 1)

        vals = arr[rows, cols]
        if ds.nodata is not None:
            vals = np.where(np.isclose(vals, ds.nodata), np.nan, vals)
        pts[p.column_name] = np.round(vals.astype(float), 4)

        in_name = p.points.name or ctx.get_layer_meta(p.points)["name"]
        return ctx.save_layer(pts, name=p.output_name or f"{in_name}_sampled")


# 3. Raster Calculator
class RasterCalcParams(BaseModel):
    raster: LayerRef = Field(..., title="Layer raster", json_schema_extra={"kind": "raster"})
    expression: str = Field("(B3 - B2) / (B3 + B2)", title="Rumus Band (gunakan B1, B2, B3, B4)")
    output_name: str | None = Field(None, title="Nama layer raster hasil")


@register
class RasterCalculatorTool(Tool):
    id = "raster.calculator"
    name = "Kalkulator Raster"
    technical_name = "Raster Calculator"
    group = "Raster"
    level = "menengah"
    description = "Menghitung rumus matematika antar-band raster, contoh: (B3 - B2) / (B3 + B2) atau B1 * 2.5."
    illustration = "f(B1, B2) ──► Raster Baru"
    Params = RasterCalcParams

    def run(self, p: RasterCalcParams, ctx: JobContext):
        ds = ctx.load_raster(p.raster)
        safe_env: dict[str, Any] = {"np": np, "abs": np.abs, "sqrt": np.sqrt, "log": np.log1p}
        for i in range(ds.count):
            safe_env[f"B{i + 1}"] = ds.data[i].astype(np.float32)
            safe_env[f"b{i + 1}"] = ds.data[i].astype(np.float32)

        ctx.progress(50, f"Mengevaluasi rumus: {p.expression}")
        try:
            with np.errstate(divide="ignore", invalid="ignore"):
                res = eval(p.expression, {"__builtins__": {}}, safe_env)
            res_arr = np.nan_to_num(np.asarray(res, dtype=np.float32), nan=0.0, posinf=0.0, neginf=0.0)
        except Exception as e:
            raise PetaLabError("RASTER_CALC_ERR", f"Rumus kalkulator raster belum valid: {e}", detail=str(e))

        out_ds = RasterDataset(
            data=res_arr[np.newaxis, :, :],
            bbox=ds.bbox,
            crs=ds.crs,
            nodata=ds.nodata,
            band_names=["Hasil_Kalkulator"],
        )
        in_name = p.raster.name or ctx.get_layer_meta(p.raster)["name"]
        return ctx.save_raster(out_ds, name=p.output_name or f"{in_name}_calc")


# 4. Terrain Analysis: Slope, Aspect, Hillshade
class TerrainParams(BaseModel):
    dem: LayerRef = Field(..., title="Layer DEM (Ketinggian)", json_schema_extra={"kind": "raster"})
    mode: str = Field(
        "slope",
        title="Analisis permukaan",
        json_schema_extra={"enum": ["slope", "aspect", "hillshade"]},
    )
    output_name: str | None = Field(None, title="Nama layer raster hasil")


@register
class TerrainAnalysisTool(Tool):
    id = "raster.terrain"
    name = "Kemiringan & Bayangan Lereng"
    technical_name = "Slope / Aspect / Hillshade"
    group = "Raster"
    level = "menengah"
    description = "Menghitung derajat kemiringan lereng (Slope), arah hadap lereng (Aspect), atau efek timbul 3D (Hillshade) dari DEM."
    illustration = "DEM Elevasi ──► Slope / Hillshade"
    Params = TerrainParams

    def run(self, p: TerrainParams, ctx: JobContext):
        ds = ctx.load_raster(p.dem)
        elev = ds.data[0].astype(np.float32)
        res_m = max(10.0, ds.res_x * 111320.0)
        ctx.progress(45, f"Menghitung {p.mode} dari DEM")

        dy, dx = np.gradient(elev, res_m)
        if p.mode == "slope":
            out_arr = np.degrees(np.arctan(np.sqrt(dx * dx + dy * dy))).astype(np.float32)
            bname = "Kemiringan_Derajat"
            cmap = "magma"
        elif p.mode == "aspect":
            out_arr = (np.degrees(np.arctan2(-dx, dy)) % 360.0).astype(np.float32)
            bname = "Arah_Lereng_Derajat"
            cmap = "viridis"
        else:
            out_arr = (compute_hillshade_array(elev, res_m=res_m) * 255.0).astype(np.float32)
            bname = "Hillshade"
            cmap = "hillshade"

        out_ds = RasterDataset(
            data=out_arr[np.newaxis, :, :],
            bbox=ds.bbox,
            crs=ds.crs,
            nodata=ds.nodata,
            band_names=[bname],
        )
        in_name = p.dem.name or ctx.get_layer_meta(p.dem)["name"]
        return ctx.save_raster(
            out_ds,
            name=p.output_name or f"{in_name}_{p.mode}",
            style_overrides={"cmap": cmap},
        )


# 5. Reclassify Raster
class ReclassifyParams(BaseModel):
    raster: LayerRef = Field(..., title="Layer raster", json_schema_extra={"kind": "raster"})
    band: int = Field(1, ge=1, title="Nomor Band")
    n_classes: int = Field(3, ge=2, le=9, title="Jumlah kelas (otomatis kuantil: 1=Rendah .. N=Tinggi)")
    polygonize: bool = Field(False, title="Ubah sekaligus menjadi layer poligon vektor", json_schema_extra={"advanced": True})
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class ReclassifyTool(Tool):
    id = "raster.reclassify"
    name = "Klasifikasi Ulang Raster"
    technical_name = "Reclassify / Polygonize"
    group = "Raster"
    level = "menengah"
    description = "Mengelompokkan nilai kontinu raster menjadi kelas bertingkat (1, 2, ..., N) dan opsional mengubahnya ke poligon."
    illustration = "0.0..1.0 ──► Kelas 1, 2, 3"
    Params = ReclassifyParams

    def run(self, p: ReclassifyParams, ctx: JobContext):
        ds = ctx.load_raster(p.raster)
        b_idx = max(0, min(ds.count - 1, p.band - 1))
        arr = ds.data[b_idx]
        valid = arr[ds.valid_mask(b_idx)]
        quantiles = np.linspace(0, 100, p.n_classes + 1)[1:-1]
        thresholds = np.percentile(valid, quantiles) if valid.size > 0 else np.linspace(0, 1, p.n_classes - 1)
        classified = (np.digitize(arr, thresholds) + 1).astype(np.float32)

        in_name = p.raster.name or ctx.get_layer_meta(p.raster)["name"]
        if not p.polygonize:
            out_ds = RasterDataset(
                data=classified[np.newaxis, :, :],
                bbox=ds.bbox,
                crs=ds.crs,
                nodata=ds.nodata,
                band_names=[f"Kelas_1_{p.n_classes}"],
            )
            return ctx.save_raster(out_ds, name=p.output_name or f"{in_name}_reclass")

        # Polygonize classified grid cells and dissolve by class
        ctx.progress(65, "Mengonversi piksel sekelas menjadi poligon vektor")
        rx, ry = ds.res_x, ds.res_y
        minx, _, _, maxy = ds.bbox
        records = []
        # Coarsen if high res for fast polygonization
        step_r = max(1, ds.height // 45)
        step_c = max(1, ds.width // 45)
        for r in range(0, ds.height, step_r):
            for c in range(0, ds.width, step_c):
                cls_val = int(classified[r, c])
                x0 = minx + c * rx
                y1 = maxy - r * ry
                x1 = x0 + step_c * rx
                y0 = y1 - step_r * ry
                records.append({"kelas": cls_val, "label_kelas": f"Kelas {cls_val}", "geometry": Polygon([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])})
        gdf = gpd.GeoDataFrame(records, geometry="geometry", crs=ds.crs)
        dissolved = gdf.dissolve(by=["kelas", "label_kelas"]).reset_index()
        return ctx.save_layer(
            dissolved,
            name=p.output_name or f"{in_name}_poligon_kelas",
            style_overrides={"mode": "category", "column": "label_kelas"},
        )
