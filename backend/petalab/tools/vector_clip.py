from pydantic import BaseModel, Field
from petalab.errors import PetaLabError
from petalab.tools._base import JobContext, LayerRef, Tool, register


class ClipParams(BaseModel):
    input: LayerRef = Field(..., title="Layer yang akan dipotong", json_schema_extra={"geom": ["point", "line", "polygon"]})
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    mask: LayerRef = Field(..., title="Layer batas pemotong (Area)", json_schema_extra={"geom": ["polygon"]})
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class ClipTool(Tool):
    id = "vector.clip"
    name = "Potong dengan Area"
    technical_name = "Clip"
    group = "Vektor: Dasar"
    level = "pemula"
    description = "Memotong layer menggunakan batas poligon layer lain, seperti memotong kue dengan cetakan."
    illustration = "▣ ∩ ◯ ──► ◓"
    Params = ClipParams

    def run(self, p: ClipParams, ctx: JobContext):
        gdf = ctx.load_layer(p.input, only_selected=p.only_selected)
        mask_gdf = ctx.load_layer(p.mask)
        ctx.progress(20, "Menyamakan sistem koordinat kedua layer")
        if gdf.crs != mask_gdf.crs and gdf.crs is not None:
            mask_gdf = mask_gdf.to_crs(gdf.crs)
        ctx.progress(50, "Memotong fitur dengan batas area")
        clipped = gdf.clip(mask_gdf)
        if clipped.empty:
            raise PetaLabError("NO_OVERLAP")
        ctx.progress(90, "Menyimpan layer hasil potongan")
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        out_name = p.output_name or f"{in_name}_clip"
        return ctx.save_layer(clipped.reset_index(drop=True), name=out_name)

    def to_python(self, p: ClipParams) -> str:
        in_name = p.input.name or p.input.id
        m_name = p.mask.name or p.mask.id
        return (
            f'import geopandas as gpd\n\n'
            f'gdf = gpd.read_file("{in_name}.gpkg")\n'
            f'mask = gpd.read_file("{m_name}.gpkg").to_crs(gdf.crs)\n'
            f'result = gpd.clip(gdf, mask)\n'
            f'result.to_file("{p.output_name or in_name + "_clip"}.gpkg", driver="GPKG")'
        )
