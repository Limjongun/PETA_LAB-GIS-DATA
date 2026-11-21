import numpy as np
from pydantic import BaseModel, Field
import shapely

from petalab.tools._base import JobContext, LayerRef, Tool, register


class ZonalStatsParams(BaseModel):
    zones: LayerRef = Field(..., title="Layer wilayah (Poligon)", json_schema_extra={"geom": ["polygon"]})
    only_selected: bool = Field(False, title="Hanya wilayah terpilih")
    raster: LayerRef = Field(..., title="Layer raster", json_schema_extra={"kind": "raster"})
    band: int = Field(1, ge=1, title="Nomor Band Raster")
    prefix: str = Field("rast_", title="Awalan nama kolom baru")
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class RasterZonalStatsTool(Tool):
    id = "raster.zonal_stats"
    name = "Statistik Raster per Wilayah"
    technical_name = "Zonal Statistics"
    group = "Raster"
    level = "menengah"
    description = "Menghitung rata-rata, nilai minimum, maksimum, dan standar deviasi piksel raster di dalam setiap wilayah poligon."
    illustration = "▣ + ▓▓ ──► ▣ (mean, min, max)"
    Params = ZonalStatsParams

    def run(self, p: ZonalStatsParams, ctx: JobContext):
        zones = ctx.load_layer(p.zones, only_selected=p.only_selected).copy()
        ds = ctx.load_raster(p.raster)
        b_idx = max(0, min(ds.count - 1, p.band - 1))
        arr = ds.data[b_idx]
        valid_mask = ds.valid_mask(b_idx)

        wgs_zones = zones.to_crs("EPSG:4326") if zones.crs else zones
        rows_idx, cols_idx = np.meshgrid(np.arange(ds.height), np.arange(ds.width), indexing="ij")
        px_x, px_y = ds.rowcol_to_xy(rows_idx, cols_idx)

        means, mins, maxs, stds = [], [], [], []
        total = len(wgs_zones)
        for i, geom in enumerate(wgs_zones.geometry):
            if i % max(1, total // 10) == 0:
                ctx.progress(20 + 65 * (i / max(1, total)), f"Menghitung statistik wilayah {i + 1}/{total}")
            if geom is None or geom.is_empty:
                means.append(np.nan)
                mins.append(np.nan)
                maxs.append(np.nan)
                stds.append(np.nan)
                continue
            gminx, gminy, gmaxx, gmaxy = geom.bounds
            bbox_mask = (px_x >= gminx) & (px_x <= gmaxx) & (px_y >= gminy) & (px_y <= gmaxy) & valid_mask
            if not np.any(bbox_mask):
                # Fallback sample centroid
                r, c = ds.xy_to_rowcol(geom.centroid.x, geom.centroid.y)
                r = int(np.clip(r, 0, ds.height - 1))
                c = int(np.clip(c, 0, ds.width - 1))
                val = float(arr[r, c])
                means.append(round(val, 3))
                mins.append(round(val, 3))
                maxs.append(round(val, 3))
                stds.append(0.0)
                continue

            cand_x = px_x[bbox_mask]
            cand_y = px_y[bbox_mask]
            cand_vals = arr[bbox_mask]
            inside = shapely.contains_xy(geom, cand_x, cand_y)
            vals = cand_vals[inside]
            if vals.size == 0:
                vals = cand_vals
            means.append(round(float(np.mean(vals)), 3))
            mins.append(round(float(np.min(vals)), 3))
            maxs.append(round(float(np.max(vals)), 3))
            stds.append(round(float(np.std(vals)), 3))

        zones[f"{p.prefix}mean"] = means
        zones[f"{p.prefix}min"] = mins
        zones[f"{p.prefix}max"] = maxs
        zones[f"{p.prefix}std"] = stds

        in_name = p.zones.name or ctx.get_layer_meta(p.zones)["name"]
        return ctx.save_layer(
            zones,
            name=p.output_name or f"{in_name}_zonal_stats",
            style_overrides={"mode": "choropleth", "column": f"{p.prefix}mean", "palette": "viridis"},
        )
