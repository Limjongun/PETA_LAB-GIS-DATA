import geopandas as gpd
import pandas as pd
from pydantic import BaseModel, Field

from petalab.tools._base import JobContext, LayerRef, Tool, register


class CountPointsParams(BaseModel):
    polygons: LayerRef = Field(..., title="Layer wilayah (Poligon)", json_schema_extra={"geom": ["polygon"]})
    only_selected: bool = Field(False, title="Hanya wilayah terpilih")
    points: LayerRef = Field(..., title="Layer titik yang dihitung", json_schema_extra={"geom": ["point"]})
    count_column: str = Field("jumlah_titik", title="Nama kolom hasil hitungan")
    weight_column: str | None = Field(None, title="Kolom angka untuk dijumlahkan (opsional)", json_schema_extra={"column_of": "points", "advanced": True})
    calculate_density: bool = Field(True, title="Hitung juga kepadatan per km²", json_schema_extra={"advanced": True})
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class CountPointsInPolygonTool(Tool):
    id = "analysis.count_points"
    name = "Hitung Titik di Setiap Wilayah"
    technical_name = "Count Points in Polygon"
    group = "Vektor: Analisis"
    level = "pemula"
    description = "Menghitung berapa banyak titik (misalnya sekolah atau fasilitas) yang berada di dalam setiap poligon wilayah."
    illustration = "▣ + ••• ──► ▣ (n = 3)"
    Params = CountPointsParams

    def run(self, p: CountPointsParams, ctx: JobContext):
        polys = ctx.load_layer(p.polygons, only_selected=p.only_selected).copy()
        pts = ctx.load_layer(p.points)
        if polys.crs != pts.crs and polys.crs is not None:
            pts = pts.to_crs(polys.crs)

        ctx.progress(40, "Mencocokkan titik dengan batas wilayah")
        polys["_poly_idx"] = polys.index
        joined = gpd.sjoin(pts, polys[["_poly_idx", "geometry"]], how="inner", predicate="within")
        counts = joined.groupby("_poly_idx").size()
        polys[p.count_column] = polys["_poly_idx"].map(counts).fillna(0).astype(int)

        if p.weight_column and p.weight_column in pts.columns:
            w_series = pd.to_numeric(joined[p.weight_column], errors="coerce")
            joined["_w_val"] = w_series
            sums = joined.groupby("_poly_idx")["_w_val"].sum()
            polys[f"total_{p.weight_column}"] = polys["_poly_idx"].map(sums).fillna(0.0).round(2)

        if p.calculate_density:
            ctx.progress(75, "Menghitung kepadatan titik per km²")
            polys_m = ctx.to_metric_crs(polys)
            area_km2 = (polys_m.geometry.area / 1e6).clip(lower=1e-4)
            polys[f"{p.count_column}_per_km2"] = (polys[p.count_column] / area_km2).round(2)

        polys = polys.drop(columns=["_poly_idx"])
        in_name = p.polygons.name or ctx.get_layer_meta(p.polygons)["name"]
        return ctx.save_layer(
            polys,
            name=p.output_name or f"{in_name}_hitung_titik",
            style_overrides={"mode": "choropleth", "column": p.count_column, "palette": "viridis"},
        )

    def to_python(self, p: CountPointsParams) -> str:
        poly_n = p.polygons.name or p.polygons.id
        pt_n = p.points.name or p.points.id
        return (
            f'import geopandas as gpd\n\n'
            f'polys = gpd.read_file("{poly_n}.gpkg")\n'
            f'pts = gpd.read_file("{pt_n}.gpkg").to_crs(polys.crs)\n'
            f'joined = gpd.sjoin(pts, polys[["geometry"]], how="inner", predicate="within")\n'
            f'polys["{p.count_column}"] = polys.index.map(joined.groupby("index_right").size()).fillna(0).astype(int)'
        )
