from pydantic import BaseModel, Field
from petalab.tools._base import JobContext, LayerRef, Tool, register


class BufferParams(BaseModel):
    input: LayerRef = Field(..., title="Layer masukan", json_schema_extra={"geom": ["point", "line", "polygon"]})
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    distance: float = Field(500.0, gt=0, title="Jarak")
    unit: str = Field("m", title="Satuan", json_schema_extra={"enum": ["m", "km"]})
    dissolve: bool = Field(False, title="Gabungkan hasil yang bertumpuk", json_schema_extra={"advanced": True})
    segments: int = Field(16, ge=4, le=64, title="Kehalusan lengkungan (segmen)", json_schema_extra={"advanced": True})
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class BufferTool(Tool):
    id = "vector.buffer"
    name = "Buat Zona di Sekitar"
    technical_name = "Buffer"
    group = "Vektor: Dasar"
    level = "pemula"
    description = "Membuat area selebar jarak tertentu di sekitar titik, garis, atau poligon (otomatis dihitung dalam meter UTM)."
    illustration = "● ──►  concentric-circle"
    Params = BufferParams

    def run(self, p: BufferParams, ctx: JobContext):
        gdf = ctx.load_layer(p.input, only_selected=p.only_selected)
        ctx.progress(15, "Menyiapkan sistem koordinat metrik (UTM otomatis)")
        work = ctx.to_metric_crs(gdf)
        dist_m = p.distance * (1000.0 if p.unit == "km" else 1.0)
        ctx.progress(45, f"Membuat zona radius {p.distance:g} {p.unit}")
        work["geometry"] = work.geometry.buffer(dist_m, resolution=p.segments)
        if p.dissolve:
            ctx.progress(70, "Menggabungkan zona yang saling bertumpuk")
            work = work.dissolve().reset_index(drop=True)
        ctx.check_cancel()
        out = ctx.from_metric_crs(work, like=gdf)
        ctx.progress(90, "Menyimpan layer hasil")
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        out_name = p.output_name or f"{in_name}_buffer_{p.distance:g}{p.unit}"
        return ctx.save_layer(out, name=out_name)

    def to_python(self, p: BufferParams) -> str:
        in_name = p.input.name or p.input.id
        mult = " * 1000" if p.unit == "km" else ""
        diss = "\ngdf_m = gdf_m.dissolve().reset_index(drop=True)" if p.dissolve else ""
        return (
            f'import geopandas as gpd\n\n'
            f'gdf = gpd.read_file("{in_name}.gpkg")\n'
            f'gdf_m = gdf.to_crs(gdf.estimate_utm_crs())\n'
            f'gdf_m["geometry"] = gdf_m.geometry.buffer({p.distance}{mult}, quad_segs={p.segments}){diss}\n'
            f'result = gdf_m.to_crs(gdf.crs)\n'
            f'result.to_file("{p.output_name or in_name + "_buffer"}.gpkg", driver="GPKG")'
        )
