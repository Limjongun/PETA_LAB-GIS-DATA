import geopandas as gpd
from pydantic import BaseModel, Field

from petalab.tools._base import JobContext, LayerRef, Tool, register


class SpatialJoinParams(BaseModel):
    target: LayerRef = Field(..., title="Layer penerima atribut")
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    join_layer: LayerRef = Field(..., title="Layer sumber informasi")
    predicate: str = Field(
        "intersects",
        title="Hubungan lokasi",
        json_schema_extra={"enum": ["intersects", "within", "contains", "nearest"]},
    )
    how: str = Field("left", title="Mode gabung", json_schema_extra={"enum": ["left", "inner"], "advanced": True})
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class SpatialJoinTool(Tool):
    id = "analysis.spatial_join"
    name = "Ambil Data dari Layer Lain berdasarkan Lokasi"
    technical_name = "Spatial Join"
    group = "Vektor: Analisis"
    level = "menengah"
    description = "Menambahkan informasi dari layer kedua ke layer pertama berdasarkan posisi spasial (di dalam, bersinggungan, atau terdekat)."
    illustration = "● + ▣ ──► ● (dengan atribut wilayah)"
    Params = SpatialJoinParams

    def run(self, p: SpatialJoinParams, ctx: JobContext):
        left = ctx.load_layer(p.target, only_selected=p.only_selected)
        right = ctx.load_layer(p.join_layer).drop(columns=["_fid"], errors="ignore")
        if left.crs != right.crs and left.crs is not None:
            right = right.to_crs(left.crs)

        ctx.progress(45, f"Menjalankan Spatial Join ({p.predicate})")
        if p.predicate == "nearest":
            left_m = ctx.to_metric_crs(left)
            right_m = right.to_crs(left_m.crs)
            joined_m = gpd.sjoin_nearest(left_m, right_m, how=p.how, distance_col="jarak_m")
            joined_m["jarak_m"] = joined_m["jarak_m"].round(2)
            joined = ctx.from_metric_crs(joined_m, like=left)
        else:
            joined = gpd.sjoin(left, right, how=p.how, predicate=p.predicate)

        joined = joined.drop(columns=["index_right"], errors="ignore")
        # Deduplicate rows if one target matched multiple polygons in left join
        joined = joined[~joined.index.duplicated(keep="first")].reset_index(drop=True)
        in_name = p.target.name or ctx.get_layer_meta(p.target)["name"]
        return ctx.save_layer(joined, name=p.output_name or f"{in_name}_sjoin")

    def to_python(self, p: SpatialJoinParams) -> str:
        t_name = p.target.name or p.target.id
        j_name = p.join_layer.name or p.join_layer.id
        if p.predicate == "nearest":
            return (
                f'import geopandas as gpd\n'
                f'left = gpd.read_file("{t_name}.gpkg")\n'
                f'right = gpd.read_file("{j_name}.gpkg")\n'
                f'utm = left.estimate_utm_crs()\n'
                f'result = gpd.sjoin_nearest(left.to_crs(utm), right.to_crs(utm), how="{p.how}", distance_col="jarak_m").to_crs(left.crs)'
            )
        return (
            f'import geopandas as gpd\n'
            f'left = gpd.read_file("{t_name}.gpkg")\n'
            f'right = gpd.read_file("{j_name}.gpkg").to_crs(left.crs)\n'
            f'result = gpd.sjoin(left, right, how="{p.how}", predicate="{p.predicate}")'
        )
