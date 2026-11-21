import geopandas as gpd
import pandas as pd
from pydantic import BaseModel, Field
import shapely

from petalab.errors import PetaLabError
from petalab.tools._base import JobContext, LayerRef, Tool, register


# 3. Difference / Erase
class DifferenceParams(BaseModel):
    input: LayerRef = Field(..., title="Layer utama", json_schema_extra={"geom": ["point", "line", "polygon"]})
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    overlay: LayerRef = Field(..., title="Layer penghapus (Area)", json_schema_extra={"geom": ["polygon"]})
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class DifferenceTool(Tool):
    id = "vector.difference"
    name = "Hapus Bagian yang Bertumpuk"
    technical_name = "Difference / Erase"
    group = "Vektor: Dasar"
    level = "pemula"
    description = "Menghapus bagian layer utama yang tertutupi oleh area layer kedua."
    illustration = "▣ − ◯ ──► ◧"
    Params = DifferenceParams

    def run(self, p: DifferenceParams, ctx: JobContext):
        gdf = ctx.load_layer(p.input, only_selected=p.only_selected)
        ov = ctx.load_layer(p.overlay)
        if gdf.crs != ov.crs and gdf.crs is not None:
            ov = ov.to_crs(gdf.crs)
        ctx.progress(45, "Menghitung selisih area (Erase)")
        res = gpd.overlay(gdf, ov, how="difference")
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_layer(res.reset_index(drop=True), name=p.output_name or f"{in_name}_erase")

    def to_python(self, p: DifferenceParams) -> str:
        return (
            f'import geopandas as gpd\n'
            f'a = gpd.read_file("{p.input.name or p.input.id}.gpkg")\n'
            f'b = gpd.read_file("{p.overlay.name or p.overlay.id}.gpkg").to_crs(a.crs)\n'
            f'result = gpd.overlay(a, b, how="difference")'
        )


# 4. Intersection
class IntersectionParams(BaseModel):
    input: LayerRef = Field(..., title="Layer pertama", json_schema_extra={"geom": ["point", "line", "polygon"]})
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    overlay: LayerRef = Field(..., title="Layer kedua", json_schema_extra={"geom": ["polygon", "line"]})
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class IntersectionTool(Tool):
    id = "vector.intersection"
    name = "Irisan Dua Layer"
    technical_name = "Intersection"
    group = "Vektor: Dasar"
    level = "pemula"
    description = "Mengambil hanya bagian yang saling bertumpuk dari dua layer sekaligus menggabungkan atribut keduanya."
    illustration = "◯ ∩ ◯ ──►  lens"
    Params = IntersectionParams

    def run(self, p: IntersectionParams, ctx: JobContext):
        gdf = ctx.load_layer(p.input, only_selected=p.only_selected)
        ov = ctx.load_layer(p.overlay)
        if gdf.crs != ov.crs and gdf.crs is not None:
            ov = ov.to_crs(gdf.crs)
        ctx.progress(45, "Menghitung irisan geometri & atribut")
        res = gpd.overlay(gdf, ov, how="intersection")
        if res.empty:
            raise PetaLabError("NO_OVERLAP")
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_layer(res.reset_index(drop=True), name=p.output_name or f"{in_name}_intersection")

    def to_python(self, p: IntersectionParams) -> str:
        return (
            f'import geopandas as gpd\n'
            f'a = gpd.read_file("{p.input.name or p.input.id}.gpkg")\n'
            f'b = gpd.read_file("{p.overlay.name or p.overlay.id}.gpkg").to_crs(a.crs)\n'
            f'result = gpd.overlay(a, b, how="intersection")'
        )


# 5. Dissolve
class DissolveParams(BaseModel):
    input: LayerRef = Field(..., title="Layer masukan", json_schema_extra={"geom": ["polygon", "line"]})
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    by_column: str | None = Field(None, title="Kelompokkan per kolom (kosongkan untuk gabung semua)", json_schema_extra={"column_of": "input"})
    agg_func: str = Field("sum", title="Fungsi ringkasan kolom angka", json_schema_extra={"enum": ["sum", "mean", "min", "max", "first"], "advanced": True})
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class DissolveTool(Tool):
    id = "vector.dissolve"
    name = "Gabung Bentuk"
    technical_name = "Dissolve"
    group = "Vektor: Dasar"
    level = "pemula"
    description = "Menggabungkan poligon atau garis yang bersebelahan atau memiliki kategori yang sama menjadi satu kesatuan."
    illustration = "⊞ ──► □"
    Params = DissolveParams

    def run(self, p: DissolveParams, ctx: JobContext):
        gdf = ctx.load_layer(p.input, only_selected=p.only_selected)
        ctx.progress(40, "Menggabungkan batas bentuk (Dissolve)")
        work = gdf.drop(columns=["_fid"], errors="ignore")
        if p.by_column and p.by_column in work.columns:
            res = work.dissolve(by=p.by_column, aggfunc=p.agg_func).reset_index()
        else:
            res = work.dissolve(aggfunc=p.agg_func).reset_index(drop=True)
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_layer(res, name=p.output_name or f"{in_name}_dissolve")

    def to_python(self, p: DissolveParams) -> str:
        by_arg = f'by="{p.by_column}", ' if p.by_column else ""
        return (
            f'import geopandas as gpd\n'
            f'gdf = gpd.read_file("{p.input.name or p.input.id}.gpkg")\n'
            f'result = gdf.dissolve({by_arg}aggfunc="{p.agg_func}").reset_index()'
        )


# 6. Merge / Union
class MergeParams(BaseModel):
    input: LayerRef = Field(..., title="Layer pertama")
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    second: LayerRef = Field(..., title="Layer kedua")
    mode: str = Field("merge", title="Cara gabung", json_schema_extra={"enum": ["merge", "union"]})
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class MergeTool(Tool):
    id = "vector.merge"
    name = "Gabung Layer"
    technical_name = "Merge / Union"
    group = "Vektor: Dasar"
    level = "pemula"
    description = "Menggabungkan dua layer menjadi satu layer baru (tumpuk baris atau union poligon)."
    illustration = "Layer A + Layer B ──► Layer AB"
    Params = MergeParams

    def run(self, p: MergeParams, ctx: JobContext):
        a = ctx.load_layer(p.input, only_selected=p.only_selected)
        b = ctx.load_layer(p.second)
        if a.crs != b.crs and a.crs is not None:
            b = b.to_crs(a.crs)
        ctx.progress(50, "Menggabungkan kedua layer")
        if p.mode == "union":
            res = gpd.overlay(a, b, how="union")
        else:
            res = gpd.GeoDataFrame(pd.concat([a, b], ignore_index=True), geometry="geometry", crs=a.crs)
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_layer(res.reset_index(drop=True), name=p.output_name or f"{in_name}_merged")

    def to_python(self, p: MergeParams) -> str:
        return (
            f'import geopandas as gpd, pandas as pd\n'
            f'a = gpd.read_file("{p.input.name or p.input.id}.gpkg")\n'
            f'b = gpd.read_file("{p.second.name or p.second.id}.gpkg").to_crs(a.crs)\n'
            f'result = gpd.GeoDataFrame(pd.concat([a, b], ignore_index=True), crs=a.crs)'
        )


# 7. Centroid
class CentroidParams(BaseModel):
    input: LayerRef = Field(..., title="Layer poligon/garis", json_schema_extra={"geom": ["polygon", "line"]})
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    inside_polygon: bool = Field(True, title="Pastikan titik selalu berada di dalam poligon (Point on Surface)")
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class CentroidTool(Tool):
    id = "vector.centroid"
    name = "Titik Tengah"
    technical_name = "Centroid / Point on Surface"
    group = "Vektor: Dasar"
    level = "pemula"
    description = "Mengubah setiap wilayah poligon atau garis menjadi titik tengahnya sambil mempertahankan semua kolom atribut."
    illustration = "▣ ──► ⊡"
    Params = CentroidParams

    def run(self, p: CentroidParams, ctx: JobContext):
        gdf = ctx.load_layer(p.input, only_selected=p.only_selected)
        ctx.progress(35, "Menghitung titik tengah di koordinat metrik")
        work = ctx.to_metric_crs(gdf)
        if p.inside_polygon:
            work["geometry"] = work.geometry.representative_point()
        else:
            work["geometry"] = work.geometry.centroid
        out = ctx.from_metric_crs(work, like=gdf)
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_layer(out, name=p.output_name or f"{in_name}_centroid")

    def to_python(self, p: CentroidParams) -> str:
        fn = "representative_point()" if p.inside_polygon else "centroid"
        return (
            f'import geopandas as gpd\n'
            f'gdf = gpd.read_file("{p.input.name or p.input.id}.gpkg")\n'
            f'gdf["geometry"] = gdf.to_crs(gdf.estimate_utm_crs()).geometry.{fn}.to_crs(gdf.crs)'
        )


# 8. Simplify
class SimplifyParams(BaseModel):
    input: LayerRef = Field(..., title="Layer masukan", json_schema_extra={"geom": ["polygon", "line"]})
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    tolerance_m: float = Field(25.0, gt=0, title="Toleransi penyederhanaan (meter)")
    preserve_topology: bool = Field(True, title="Jaga agar bentuk tidak berlubang/rusak", json_schema_extra={"advanced": True})
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class SimplifyTool(Tool):
    id = "vector.simplify"
    name = "Sederhanakan Bentuk"
    technical_name = "Simplify"
    group = "Vektor: Dasar"
    level = "pemula"
    description = "Mengurangi jumlah titik sudut pada garis atau poligon agar ukuran file lebih ringan dan cepat digambar."
    illustration = "Garis Detail ──► Garis Sederhana"
    Params = SimplifyParams

    def run(self, p: SimplifyParams, ctx: JobContext):
        gdf = ctx.load_layer(p.input, only_selected=p.only_selected)
        work = ctx.to_metric_crs(gdf)
        ctx.progress(45, f"Menyederhanakan geometri dengan toleransi {p.tolerance_m:g} m")
        work["geometry"] = work.geometry.simplify(p.tolerance_m, preserve_topology=p.preserve_topology)
        out = ctx.from_metric_crs(work, like=gdf)
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_layer(out, name=p.output_name or f"{in_name}_simplify_{p.tolerance_m:g}m")

    def to_python(self, p: SimplifyParams) -> str:
        return (
            f'import geopandas as gpd\n'
            f'gdf = gpd.read_file("{p.input.name or p.input.id}.gpkg")\n'
            f'work = gdf.to_crs(gdf.estimate_utm_crs())\n'
            f'work["geometry"] = work.geometry.simplify({p.tolerance_m}, preserve_topology={p.preserve_topology})\n'
            f'result = work.to_crs(gdf.crs)'
        )


# 9. Make Valid
class MakeValidParams(BaseModel):
    input: LayerRef = Field(..., title="Layer masukan")
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class MakeValidTool(Tool):
    id = "vector.make_valid"
    name = "Perbaiki Bentuk Rusak"
    technical_name = "Make Valid"
    group = "Vektor: Dasar"
    level = "pemula"
    description = "Memperbaiki poligon yang garisnya saling menyilang (self-intersecting) atau tidak menutup sempurna."
    illustration = "⋈ ──► ▣"
    Params = MakeValidParams

    def run(self, p: MakeValidParams, ctx: JobContext):
        gdf = ctx.load_layer(p.input, only_selected=p.only_selected)
        ctx.progress(50, "Memperbaiki topologi geometri yang rusak")
        gdf["geometry"] = shapely.make_valid(gdf.geometry)
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_layer(gdf, name=p.output_name or f"{in_name}_valid")

    def to_python(self, p: MakeValidParams) -> str:
        return (
            f'import geopandas as gpd, shapely\n'
            f'gdf = gpd.read_file("{p.input.name or p.input.id}.gpkg")\n'
            f'gdf["geometry"] = shapely.make_valid(gdf.geometry)'
        )


# 10. Explode
class ExplodeParams(BaseModel):
    input: LayerRef = Field(..., title="Layer masukan")
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class ExplodeTool(Tool):
    id = "vector.explode"
    name = "Pecah Multi-bagian"
    technical_name = "Explode Multipart"
    group = "Vektor: Dasar"
    level = "pemula"
    description = "Memecah satu fitur yang terdiri dari banyak pulau/bagian (MultiPolygon/MultiLine) menjadi baris terpisah."
    illustration = "▣▣ (1 baris) ──► ▣ + ▣ (2 baris)"
    Params = ExplodeParams

    def run(self, p: ExplodeParams, ctx: JobContext):
        gdf = ctx.load_layer(p.input, only_selected=p.only_selected)
        ctx.progress(50, "Memecah geometri multi-bagian")
        exploded = gdf.explode(index_parts=False).reset_index(drop=True)
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_layer(exploded, name=p.output_name or f"{in_name}_exploded")

    def to_python(self, p: ExplodeParams) -> str:
        return (
            f'import geopandas as gpd\n'
            f'gdf = gpd.read_file("{p.input.name or p.input.id}.gpkg")\n'
            f'result = gdf.explode(index_parts=False).reset_index(drop=True)'
        )


# 11. Reproject
class ReprojectParams(BaseModel):
    input: LayerRef = Field(..., title="Layer masukan")
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    target_crs: str = Field(
        "EPSG:32749",
        title="Sistem Koordinat Tujuan",
        json_schema_extra={"enum": ["EPSG:4326", "EPSG:3857", "EPSG:32748", "EPSG:32749", "EPSG:32750", "EPSG:32648"]},
    )
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class ReprojectTool(Tool):
    id = "vector.reproject"
    name = "Ubah Sistem Koordinat"
    technical_name = "Reproject CRS"
    group = "Vektor: Dasar"
    level = "pemula"
    description = "Mengonversi layer ke sistem koordinat (CRS/EPSG) lain, misalnya dari WGS 84 (derajat) ke UTM (meter)."
    illustration = "EPSG:4326 (deg) ──► EPSG:32749 (m)"
    Params = ReprojectParams

    def run(self, p: ReprojectParams, ctx: JobContext):
        gdf = ctx.load_layer(p.input, only_selected=p.only_selected)
        ctx.progress(50, f"Memproyeksikan layer ke {p.target_crs}")
        reproj = gdf.to_crs(p.target_crs)
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_layer(reproj, name=p.output_name or f"{in_name}_{p.target_crs.replace(':', '')}")

    def to_python(self, p: ReprojectParams) -> str:
        return (
            f'import geopandas as gpd\n'
            f'gdf = gpd.read_file("{p.input.name or p.input.id}.gpkg")\n'
            f'result = gdf.to_crs("{p.target_crs}")'
        )
