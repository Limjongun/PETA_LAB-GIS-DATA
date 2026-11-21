import math
import geopandas as gpd
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field
from scipy.spatial import cKDTree
from shapely.geometry import LineString, MultiPoint, Point, Polygon
from shapely.ops import voronoi_diagram

from petalab.core.io_raster import RasterDataset
from petalab.tools._base import JobContext, LayerRef, Tool, register


# 1. Nearest Neighbor
class NearestParams(BaseModel):
    input: LayerRef = Field(..., title="Layer asal")
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    target: LayerRef = Field(..., title="Layer tujuan yang dicari")
    create_lines: bool = Field(False, title="Hasilkan garis penghubung ke lokasi terdekat", json_schema_extra={"advanced": True})
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class NearestNeighborTool(Tool):
    id = "analysis.nearest"
    name = "Cari yang Terdekat"
    technical_name = "Nearest Neighbor"
    group = "Vektor: Analisis"
    level = "pemula"
    description = "Mencari objek terdekat dari layer lain dan menghitung jaraknya dalam meter."
    illustration = "● ─── (320 m) ───► ★"
    Params = NearestParams

    def run(self, p: NearestParams, ctx: JobContext):
        src = ctx.load_layer(p.input, only_selected=p.only_selected)
        dst = ctx.load_layer(p.target)
        ctx.progress(30, "Memproyeksikan ke koordinat metrik UTM")
        src_m = ctx.to_metric_crs(src)
        dst_m = dst.to_crs(src_m.crs)

        src_pts = src_m.geometry.centroid
        dst_pts = dst_m.geometry.centroid
        src_coords = np.column_stack([src_pts.x, src_pts.y])
        dst_coords = np.column_stack([dst_pts.x, dst_pts.y])

        ctx.progress(60, "Mencari tetangga terdekat dengan KD-Tree")
        tree = cKDTree(dst_coords)
        dists, idxs = tree.query(src_coords, k=1)

        out_m = src_m.copy()
        out_m["jarak_terdekat_m"] = np.round(dists, 2)
        dst_attr_cols = [c for c in dst.columns if c not in ("geometry", "_fid")]
        if dst_attr_cols:
            first_col = dst_attr_cols[0]
            out_m[f"terdekat_{first_col}"] = dst.iloc[idxs][first_col].values

        if p.create_lines:
            lines = [
                LineString([(sx, sy), (dx, dy)])
                for (sx, sy), (dx, dy) in zip(src_coords, dst_coords[idxs])
            ]
            out_m["geometry"] = lines

        out = ctx.from_metric_crs(out_m, like=src)
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_layer(out, name=p.output_name or f"{in_name}_terdekat")

    def to_python(self, p: NearestParams) -> str:
        return (
            f'import geopandas as gpd\n'
            f'src = gpd.read_file("{p.input.name or p.input.id}.gpkg")\n'
            f'dst = gpd.read_file("{p.target.name or p.target.id}.gpkg")\n'
            f'utm = src.estimate_utm_crs()\n'
            f'result = gpd.sjoin_nearest(src.to_crs(utm), dst.to_crs(utm), distance_col="jarak_terdekat_m").to_crs(src.crs)'
        )


# 2. Distance Matrix (Summary statistics per origin feature to k-nearest targets)
class DistanceMatrixParams(BaseModel):
    input: LayerRef = Field(..., title="Layer titik asal")
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    target: LayerRef = Field(..., title="Layer titik tujuan")
    k_neighbors: int = Field(3, ge=1, le=20, title="Jumlah tetangga terdekat (k)")
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class DistanceMatrixTool(Tool):
    id = "analysis.distance_matrix"
    name = "Matriks Jarak"
    technical_name = "Distance Matrix (k-NN)"
    group = "Vektor: Analisis"
    level = "menengah"
    description = "Menghitung jarak minimum, maksimum, dan rata-rata ke k lokasi terdekat."
    illustration = "● ──► [d1, d2, d3]"
    Params = DistanceMatrixParams

    def run(self, p: DistanceMatrixParams, ctx: JobContext):
        src = ctx.load_layer(p.input, only_selected=p.only_selected)
        dst = ctx.load_layer(p.target)
        src_m = ctx.to_metric_crs(src)
        dst_m = dst.to_crs(src_m.crs)

        src_coords = np.column_stack([src_m.geometry.centroid.x, src_m.geometry.centroid.y])
        dst_coords = np.column_stack([dst_m.geometry.centroid.x, dst_m.geometry.centroid.y])
        k = min(p.k_neighbors, len(dst_coords))
        tree = cKDTree(dst_coords)
        dists, _ = tree.query(src_coords, k=k)
        if dists.ndim == 1:
            dists = dists[:, np.newaxis]

        out_m = src_m.copy()
        out_m["jarak_min_m"] = np.round(np.min(dists, axis=1), 2)
        out_m["jarak_rata_m"] = np.round(np.mean(dists, axis=1), 2)
        out_m["jarak_max_m"] = np.round(np.max(dists, axis=1), 2)
        out = ctx.from_metric_crs(out_m, like=src)
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_layer(out, name=p.output_name or f"{in_name}_matriks_jarak")


# 3. Grid Kotak / Heksagon (Fishnet / Hexbin) + Point Count Aggregation
class GridParams(BaseModel):
    extent_layer: LayerRef = Field(..., title="Layer acuan batas area")
    shape: str = Field("hexagon", title="Bentuk sel grid", json_schema_extra={"enum": ["hexagon", "square"]})
    cell_size_m: float = Field(1000.0, gt=50, title="Ukuran sel (meter)")
    count_points_layer: LayerRef | None = Field(None, title="Hitung titik di tiap sel (opsional)", json_schema_extra={"advanced": True})
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class GridHexbinTool(Tool):
    id = "analysis.grid"
    name = "Grid Kotak / Heksagon"
    technical_name = "Fishnet / Hexbin Grid"
    group = "Vektor: Analisis"
    level = "menengah"
    description = "Membuat petak-petak kotak atau sarang lebah (heksagon) seragam untuk analisis kepadatan wilayah."
    illustration = "⬢⬡⬢⬡ Hexbin / ⊞ Grid"
    Params = GridParams

    def run(self, p: GridParams, ctx: JobContext):
        base = ctx.load_layer(p.extent_layer)
        base_m = ctx.to_metric_crs(base)
        minx, miny, maxx, maxy = base_m.total_bounds
        step = float(p.cell_size_m)
        # Prevent overly huge grid
        if ((maxx - minx) / step) * ((maxy - miny) / step) > 25000:
            step = max(step, math.sqrt((maxx - minx) * (maxy - miny) / 10000.0))

        ctx.progress(35, f"Membuat grid {p.shape} berukuran {step:g} m")
        cells = []
        if p.shape == "square":
            xs = np.arange(minx, maxx, step)
            ys = np.arange(miny, maxy, step)
            for x in xs:
                for y in ys:
                    cells.append(Polygon([(x, y), (x + step, y), (x + step, y + step), (x, y + step)]))
        else:
            # Hexagon grid
            r = step / math.sqrt(3)
            dx = step
            dy = 1.5 * r
            row_idx = 0
            y = miny
            while y <= maxy + r:
                x_offset = (dx / 2.0) if (row_idx % 2 == 1) else 0.0
                x = minx + x_offset
                while x <= maxx + dx:
                    angles = [math.radians(60 * i + 30) for i in range(6)]
                    pts = [(x + r * math.cos(a), y + r * math.sin(a)) for a in angles]
                    cells.append(Polygon(pts))
                    x += dx
                y += dy
                row_idx += 1

        grid_m = gpd.GeoDataFrame(
            {"grid_id": list(range(1, len(cells) + 1)), "geometry": cells},
            geometry="geometry",
            crs=base_m.crs,
        )
        # Filter cells that intersect base extent
        union_geom = base_m.geometry.union_all()
        grid_m = grid_m[grid_m.geometry.intersects(union_geom)].reset_index(drop=True)
        grid_m["grid_id"] = list(range(1, len(grid_m) + 1))

        if p.count_points_layer and p.count_points_layer.id:
            ctx.progress(70, "Menghitung jumlah titik di dalam setiap sel grid")
            pts = ctx.load_layer(p.count_points_layer).to_crs(grid_m.crs)
            joined = gpd.sjoin(pts, grid_m[["grid_id", "geometry"]], how="inner", predicate="within")
            counts = joined.groupby("grid_id").size()
            grid_m["jumlah_titik"] = grid_m["grid_id"].map(counts).fillna(0).astype(int)

        out = ctx.from_metric_crs(grid_m, like=base)
        in_name = p.extent_layer.name or ctx.get_layer_meta(p.extent_layer)["name"]
        return ctx.save_layer(out, name=p.output_name or f"grid_{p.shape}_{in_name}")


# 4. Voronoi / Thiessen Polygons
class VoronoiParams(BaseModel):
    input: LayerRef = Field(..., title="Layer titik", json_schema_extra={"geom": ["point"]})
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class VoronoiTool(Tool):
    id = "analysis.voronoi"
    name = "Zona Pengaruh"
    technical_name = "Voronoi / Thiessen Polygons"
    group = "Vektor: Analisis"
    level = "menengah"
    description = "Membagi wilayah menjadi poligon-poligon di mana setiap area paling dekat ke satu titik fasilitas tertentu."
    illustration = "• • • ──► Poligon Thiessen"
    Params = VoronoiParams

    def run(self, p: VoronoiParams, ctx: JobContext):
        pts_gdf = ctx.load_layer(p.input, only_selected=p.only_selected)
        pts_m = ctx.to_metric_crs(pts_gdf)
        centroids = pts_m.geometry.centroid
        envelope = centroids.union_all().envelope.buffer(1500.0)
        ctx.progress(50, "Membentuk diagram Voronoi / Thiessen")
        v_diag = voronoi_diagram(MultiPoint(list(centroids.geometry)), envelope=envelope)
        polys = [g.intersection(envelope) for g in v_diag.geoms]

        # Match attributes back to polygons by containment
        v_gdf = gpd.GeoDataFrame({"geometry": polys}, crs=pts_m.crs)
        joined = gpd.sjoin(v_gdf, pts_m.drop(columns=["_fid"], errors="ignore"), how="left", predicate="contains")
        joined = joined.drop(columns=["index_right"], errors="ignore").reset_index(drop=True)
        out = ctx.from_metric_crs(joined, like=pts_gdf)
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_layer(out, name=p.output_name or f"{in_name}_voronoi")


# 5. Kernel Density Estimation (Point Density -> Raster)
class KDEParams(BaseModel):
    input: LayerRef = Field(..., title="Layer titik", json_schema_extra={"geom": ["point"]})
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    bandwidth_m: float = Field(1000.0, gt=50, title="Radius pengaruh (meter)")
    grid_size: int = Field(100, ge=40, le=300, title="Resolusi grid piksel", json_schema_extra={"advanced": True})
    output_name: str | None = Field(None, title="Nama layer raster hasil")


@register
class KernelDensityTool(Tool):
    id = "analysis.kde"
    name = "Kepadatan Titik (Peta Panas)"
    technical_name = "Kernel Density (KDE Raster)"
    group = "Vektor: Analisis"
    level = "menengah"
    description = "Menghitung permukaan raster kepadatan titik secara halus (hotspot konsentrasi lokasi)."
    illustration = "Titik ──► Permukaan Raster KDE"
    Params = KDEParams

    def run(self, p: KDEParams, ctx: JobContext):
        pts_gdf = ctx.load_layer(p.input, only_selected=p.only_selected)
        wgs = pts_gdf.to_crs("EPSG:4326") if pts_gdf.crs else pts_gdf
        minx, miny, maxx, maxy = [float(x) for x in wgs.total_bounds]
        pad_x = max(0.01, (maxx - minx) * 0.1)
        pad_y = max(0.01, (maxy - miny) * 0.1)
        bbox = [minx - pad_x, miny - pad_y, maxx + pad_x, maxy + pad_y]

        ctx.progress(45, "Menghitung permukaan Kernel Density")
        w = int(p.grid_size)
        h = int(p.grid_size)
        xs = np.linspace(bbox[0], bbox[2], w)
        ys = np.linspace(bbox[3], bbox[1], h)
        gx, gy = np.meshgrid(xs, ys)

        pts_x = wgs.geometry.centroid.x.to_numpy()
        pts_y = wgs.geometry.centroid.y.to_numpy()
        bw_deg = max(0.002, p.bandwidth_m / 111320.0)

        density = np.zeros((h, w), dtype=np.float32)
        for px, py in zip(pts_x, pts_y):
            dist2 = ((gx - px) ** 2 + (gy - py) ** 2) / (bw_deg ** 2)
            density += np.exp(-0.5 * dist2).astype(np.float32)

        ds = RasterDataset(
            data=density[np.newaxis, :, :],
            bbox=bbox,
            crs="EPSG:4326",
            band_names=["Kepadatan_KDE"],
        )
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_raster(
            ds,
            name=p.output_name or f"{in_name}_kde_raster",
            style_overrides={"cmap": "magma"},
        )


# 6. Place Markers at High-Density / Peak Locations (Polygons or Point Clusters)
class DensityMarkersParams(BaseModel):
    input: LayerRef = Field(..., title="Layer masukan (GeoJSON Poligon atau Titik)")
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    value_column: str | None = Field(
        None,
        title="Kolom nilai kepadatan/angka (opsional; kosongkan untuk hitung kerapatan titik otomatis)",
        json_schema_extra={"column_of": "input"},
    )
    top_n: int = Field(15, ge=1, le=500, title="Jumlah titik puncak kepadatan yang diberi Marker")
    radius_m: float = Field(1000.0, gt=50, title="Radius hitung kerapatan sekitar (meter, jika input titik)", json_schema_extra={"advanced": True})
    output_name: str | None = Field(None, title="Nama layer marker hasil")


@register
class DensityMarkersTool(Tool):
    id = "analysis.density_markers"
    name = "Tempatkan Marker di Titik Kepadatan"
    technical_name = "High-Density Peak Markers"
    group = "Vektor: Analisis"
    level = "pemula"
    description = "Mendeteksi lokasi dengan kepadatan tertinggi dari GeoJSON (poligon maupun titik) dan menempatkan titik Marker berlabel peringkat & ukuran proporsional."
    illustration = "GeoJSON ──► Marker Puncak Kepadatan (#1..#N)"
    Params = DensityMarkersParams

    def run(self, p: DensityMarkersParams, ctx: JobContext):
        gdf = ctx.load_layer(p.input, only_selected=p.only_selected).copy()
        ctx.progress(25, "Menganalisis pusat kepadatan pada layer")
        gdf_m = ctx.to_metric_crs(gdf)
        rep_pts_m = gdf_m.geometry.representative_point()
        coords = np.column_stack([rep_pts_m.x, rep_pts_m.y])

        if p.value_column and p.value_column in gdf.columns:
            scores = pd.to_numeric(gdf[p.value_column], errors="coerce").fillna(0.0).to_numpy(dtype=float)
            score_col_name = p.value_column
        else:
            # Automatically compute local spatial neighbor density within radius_m
            tree = cKDTree(coords)
            counts = [len(idxs) for idxs in tree.query_ball_point(coords, r=p.radius_m)]
            scores = np.asarray(counts, dtype=float)
            score_col_name = "kepadatan_lokal"
            gdf_m[score_col_name] = scores

        gdf_m["geometry"] = rep_pts_m
        gdf_m["_density_score"] = scores
        gdf_m = gdf_m.sort_values(by="_density_score", ascending=False).head(min(p.top_n, len(gdf_m))).reset_index(drop=True)

        ranks = list(range(1, len(gdf_m) + 1))
        gdf_m["peringkat"] = ranks
        q66 = float(np.percentile(gdf_m["_density_score"], 66)) if len(gdf_m) > 2 else 0.0
        q33 = float(np.percentile(gdf_m["_density_score"], 33)) if len(gdf_m) > 2 else 0.0

        levels = []
        labels = []
        str_cols = [c for c in gdf.columns if c not in ("geometry", "_fid") and not pd.api.types.is_numeric_dtype(gdf[c])]
        name_col = str_cols[0] if str_cols else None

        for r_idx, row in gdf_m.iterrows():
            sc = float(row["_density_score"])
            if sc >= q66:
                levels.append("Kepadatan Sangat Tinggi")
            elif sc >= q33:
                levels.append("Kepadatan Tinggi")
            else:
                levels.append("Kepadatan Sedang")
            base_label = str(row[name_col]) if name_col else f"Titik #{r_idx + 1}"
            labels.append(f"#{r_idx + 1} {base_label} ({sc:g})")

        gdf_m["tingkat_kepadatan"] = levels
        gdf_m["label_marker"] = labels
        gdf_m = gdf_m.drop(columns=["_density_score"])

        out = ctx.from_metric_crs(gdf_m, like=gdf)
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_layer(
            out,
            name=p.output_name or f"marker_kepadatan_{in_name}",
            style_overrides={
                "mode": "proportional",
                "column": score_col_name,
                "labelColumn": "label_marker",
                "color": "#dc2626",
                "fillColor": "#dc2626",
                "pointRadius": 8,
            },
        )

    def to_python(self, p: DensityMarkersParams) -> str:
        in_name = p.input.name or p.input.id
        col = p.value_column or "kepadatan"
        return (
            f'import geopandas as gpd\n\n'
            f'gdf = gpd.read_file("{in_name}.geojson")\n'
            f'gdf["geometry"] = gdf.to_crs(gdf.estimate_utm_crs()).geometry.representative_point().to_crs(gdf.crs)\n'
            f'markers = gdf.sort_values(by="{col}", ascending=False).head({p.top_n}).reset_index(drop=True)\n'
            f'markers["peringkat"] = range(1, len(markers) + 1)\n'
            f'markers.to_file("marker_kepadatan.geojson", driver="GeoJSON")'
        )


# 7. Dot Density Generator (Scatter points inside GeoJSON polygons proportional to density/population)
class DotDensityParams(BaseModel):
    polygons: LayerRef = Field(..., title="Layer wilayah poligon (GeoJSON/Vektor)", json_schema_extra={"geom": ["polygon"]})
    only_selected: bool = Field(False, title="Hanya wilayah terpilih")
    value_column: str = Field(..., title="Kolom angka/kepadatan", json_schema_extra={"column_of": "polygons"})
    value_per_dot: float = Field(5000.0, gt=0.1, title="Nilai per 1 titik marker (misal: 1 titik = 5.000 jiwa)")
    output_name: str | None = Field(None, title="Nama layer titik hasil")


@register
class DotDensityTool(Tool):
    id = "analysis.dot_density"
    name = "Sebar Titik Kepadatan di Wilayah (Dot Density)"
    technical_name = "Dot Density Marks"
    group = "Vektor: Analisis"
    level = "pemula"
    description = "Menempatkan titik-titik marker di dalam setiap poligon secara proporsional sesuai angka kepadatan/populasi (semakin padat wilayahnya, semakin rapat titiknya)."
    illustration = "Poligon (15.000) ──► ••• (3 titik @ 5.000)"
    Params = DotDensityParams

    def run(self, p: DotDensityParams, ctx: JobContext):
        polys = ctx.load_layer(p.polygons, only_selected=p.only_selected)
        if p.value_column not in polys.columns:
            from petalab.errors import PetaLabError
            raise PetaLabError("INVALID_COLUMN", f"Kolom '{p.value_column}' tidak ditemukan.")

        rng = np.random.default_rng(42)
        str_cols = [c for c in polys.columns if c not in ("geometry", "_fid") and not pd.api.types.is_numeric_dtype(polys[c])]
        name_col = str_cols[0] if str_cols else None

        dot_rows = []
        total_polys = len(polys)
        for idx, row in polys.iterrows():
            geom = row.geometry
            if geom is None or geom.is_empty:
                continue
            val = float(pd.to_numeric(row[p.value_column], errors="coerce") or 0.0)
            n_dots = min(200, max(0, int(round(val / max(1e-6, p.value_per_dot)))))
            if n_dots == 0:
                continue

            minx, miny, maxx, maxy = geom.bounds
            placed = 0
            attempts = 0
            region_label = str(row[name_col]) if name_col else f"Wilayah {idx + 1}"
            while placed < n_dots and attempts < n_dots * 12:
                attempts += 1
                rx = float(rng.uniform(minx, maxx))
                ry = float(rng.uniform(miny, maxy))
                pt = Point(rx, ry)
                if geom.contains(pt):
                    placed += 1
                    dot_rows.append({
                        "wilayah": region_label,
                        p.value_column: val,
                        "nilai_per_titik": p.value_per_dot,
                        "geometry": pt,
                    })

        if not dot_rows:
            # Fallback: at least 1 marker at centroid of top polygons
            for _, row in polys.head(10).iterrows():
                dot_rows.append({
                    "wilayah": str(row[name_col]) if name_col else "Wilayah",
                    p.value_column: float(pd.to_numeric(row[p.value_column], errors="coerce") or 0.0),
                    "nilai_per_titik": p.value_per_dot,
                    "geometry": row.geometry.representative_point(),
                })

        out_gdf = gpd.GeoDataFrame(dot_rows, geometry="geometry", crs=polys.crs)
        in_name = p.polygons.name or ctx.get_layer_meta(p.polygons)["name"]
        return ctx.save_layer(
            out_gdf,
            name=p.output_name or f"dot_density_{in_name}",
            style_overrides={"mode": "category", "column": "wilayah", "pointRadius": 4.5},
        )

    def to_python(self, p: DotDensityParams) -> str:
        in_name = p.polygons.name or p.polygons.id
        return (
            f'import geopandas as gpd\n'
            f'gdf = gpd.read_file("{in_name}.geojson")\n'
            f'# Sebar titik proporsional (1 titik = {p.value_per_dot:g} {p.value_column})\n'
            f'dots = gdf.sample_points(size=(gdf["{p.value_column}"] / {p.value_per_dot}).astype(int).clip(lower=0))'
        )

