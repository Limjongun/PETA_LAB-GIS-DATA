import geopandas as gpd
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field
from scipy.spatial import cKDTree
from sklearn.cluster import DBSCAN, KMeans
from sklearn.preprocessing import StandardScaler

from petalab.core.io_raster import RasterDataset
from petalab.errors import PetaLabError
from petalab.tools._base import JobContext, LayerRef, Tool, register


def _knn_weight_matrix(coords: np.ndarray, k: int = 5) -> np.ndarray:
    n = len(coords)
    k_eff = min(max(1, k), max(1, n - 1))
    tree = cKDTree(coords)
    _, idxs = tree.query(coords, k=k_eff + 1)
    w = np.zeros((n, n), dtype=float)
    for i in range(n):
        neighbors = [j for j in idxs[i] if j != i][:k_eff]
        if neighbors:
            w[i, neighbors] = 1.0 / len(neighbors)
    return w


# 1. Global Moran's I & Spatial Autocorrelation
class MoransIParams(BaseModel):
    input: LayerRef = Field(..., title="Layer masukan")
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    column: str = Field(..., title="Kolom angka yang diuji", json_schema_extra={"column_of": "input"})
    k_neighbors: int = Field(5, ge=2, le=15, title="Jumlah tetangga terdekat (k)", json_schema_extra={"advanced": True})
    output_name: str | None = Field(None, title="Nama layer hasil (dengan nilai Local Moran)")


@register
class MoransITool(Tool):
    id = "stats.morans_i"
    name = "Apakah Data Mengelompok? (Moran's I)"
    technical_name = "Global & Local Moran's I"
    group = "Statistik Spasial"
    level = "lanjut"
    description = "Menguji secara statistik apakah nilai tinggi/rendah pada suatu kolom cenderung mengelompok di lokasi berdekatan atau tersebar acak."
    illustration = "Mengelompok (I > 0) vs Acak (I ≈ 0)"
    Params = MoransIParams

    def run(self, p: MoransIParams, ctx: JobContext):
        gdf = ctx.load_layer(p.input, only_selected=p.only_selected).copy()
        if p.column not in gdf.columns:
            raise PetaLabError("INVALID_COLUMN", f"Kolom '{p.column}' tidak ditemukan.")

        vals = pd.to_numeric(gdf[p.column], errors="coerce").fillna(0.0).to_numpy(dtype=float)
        n = len(vals)
        if n < 4:
            raise PetaLabError("TOO_FEW_FEATURES", "Dibutuhkan minimal 4 fitur untuk menghitung Moran's I.")

        ctx.progress(35, "Membentuk matriks ketetanggaan spasial")
        gdf_m = ctx.to_metric_crs(gdf)
        coords = np.column_stack([gdf_m.geometry.centroid.x, gdf_m.geometry.centroid.y])
        w = _knn_weight_matrix(coords, k=p.k_neighbors)

        z = vals - np.mean(vals)
        denom = np.sum(z ** 2)
        if denom == 0:
            moran_i = 0.0
            local_i = np.zeros(n)
        else:
            s0 = np.sum(w)
            lag_z = w @ z
            moran_i = float((n / s0) * (np.sum(z * lag_z) / denom))
            m2 = denom / n
            local_i = (z / m2) * lag_z

        # Permutation p-value (199 permutations)
        ctx.progress(65, "Menghitung signifikansi statistik (uji permutasi)")
        rng = np.random.default_rng(42)
        sim_i = []
        for _ in range(199):
            zp = rng.permutation(z)
            sim_i.append(float((n / np.sum(w)) * (np.sum(zp * (w @ zp)) / max(1e-9, np.sum(zp ** 2)))))
        sim_arr = np.array(sim_i)
        z_score = float((moran_i - np.mean(sim_arr)) / max(1e-6, np.std(sim_arr)))
        extreme = np.sum(np.abs(sim_arr - np.mean(sim_arr)) >= abs(moran_i - np.mean(sim_arr)))
        p_value = round(float((extreme + 1) / 200.0), 4)

        if moran_i > 0.15 and p_value < 0.05:
            interpretation = (
                f"Artinya: Nilai '{p.column}' MENGELOMPOK secara signifikan (Moran's I = {moran_i:.3f}, p = {p_value}). "
                f"Wilayah dengan nilai tinggi cenderung dikelilingi wilayah bernilai tinggi pula."
            )
        elif moran_i < -0.15 and p_value < 0.05:
            interpretation = (
                f"Artinya: Nilai '{p.column}' MENYEBAR/BERSILANGAN secara signifikan (Moran's I = {moran_i:.3f}, p = {p_value})."
            )
        else:
            interpretation = (
                f"Artinya: Pola sebaran '{p.column}' cenderung ACAK (Moran's I = {moran_i:.3f}, p = {p_value})."
            )

        lag_z = w @ z
        quadrants = []
        for zi, lzi in zip(z, lag_z):
            if zi >= 0 and lzi >= 0:
                quadrants.append("High-High (Klaster Tinggi)")
            elif zi < 0 and lzi < 0:
                quadrants.append("Low-Low (Klaster Rendah)")
            elif zi >= 0 and lzi < 0:
                quadrants.append("High-Low (Pencilan Tinggi)")
            else:
                quadrants.append("Low-High (Pencilan Rendah)")

        gdf["local_moran_i"] = np.round(local_i, 4)
        gdf["klaster_lisa"] = quadrants
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        saved = ctx.save_layer(
            gdf,
            name=p.output_name or f"{in_name}_moran_{p.column}",
            style_overrides={"mode": "category", "column": "klaster_lisa"},
            extra_info={
                "morans_i": round(moran_i, 4),
                "z_score": round(z_score, 3),
                "p_value": p_value,
                "interpretation": interpretation,
            },
        )
        saved["analysis_summary"] = {
            "morans_i": round(moran_i, 4),
            "z_score": round(z_score, 3),
            "p_value": p_value,
            "interpretation": interpretation,
        }
        return saved


# 2. Getis-Ord Gi* Hotspot Analysis
class HotspotParams(BaseModel):
    input: LayerRef = Field(..., title="Layer masukan")
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    column: str = Field(..., title="Kolom angka", json_schema_extra={"column_of": "input"})
    distance_m: float = Field(3500.0, gt=100, title="Radius ketetanggaan (meter)")
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class HotspotGiStarTool(Tool):
    id = "stats.hotspot"
    name = "Peta Hotspot (Getis-Ord Gi*)"
    technical_name = "Getis-Ord Gi* Hotspot"
    group = "Statistik Spasial"
    level = "lanjut"
    description = "Mengidentifikasi zona Hotspot (konsentrasi nilai tinggi signifikan) dan Coldspot (konsentrasi nilai rendah signifikan)."
    illustration = "Hotspot (Z > 1.96) · Netral · Coldspot (Z < -1.96)"
    Params = HotspotParams

    def run(self, p: HotspotParams, ctx: JobContext):
        gdf = ctx.load_layer(p.input, only_selected=p.only_selected).copy()
        if p.column not in gdf.columns:
            raise PetaLabError("INVALID_COLUMN", f"Kolom '{p.column}' tidak ditemukan.")

        x = pd.to_numeric(gdf[p.column], errors="coerce").fillna(0.0).to_numpy(dtype=float)
        n = len(x)
        gdf_m = ctx.to_metric_crs(gdf)
        coords = np.column_stack([gdf_m.geometry.centroid.x, gdf_m.geometry.centroid.y])

        ctx.progress(45, f"Menghitung skor Z Getis-Ord Gi* (radius {p.distance_m:g} m)")
        dist_mat = np.linalg.norm(coords[:, None, :] - coords[None, :, :], axis=-1)
        w = (dist_mat <= p.distance_m).astype(float)

        x_bar = np.mean(x)
        s = np.std(x)
        gi_z = np.zeros(n, dtype=float)
        if s > 0 and n > 1:
            for i in range(n):
                wi = w[i]
                sum_w = np.sum(wi)
                num = np.sum(wi * x) - x_bar * sum_w
                den = s * np.sqrt((n * np.sum(wi ** 2) - (sum_w ** 2)) / max(1, n - 1))
                gi_z[i] = num / den if den > 1e-9 else 0.0

        categories = []
        for z in gi_z:
            if z >= 2.58:
                categories.append("Hotspot 99% (Sangat Tinggi)")
            elif z >= 1.96:
                categories.append("Hotspot 95% (Tinggi)")
            elif z >= 1.65:
                categories.append("Hotspot 90% (Cukup Tinggi)")
            elif z <= -2.58:
                categories.append("Coldspot 99% (Sangat Rendah)")
            elif z <= -1.96:
                categories.append("Coldspot 95% (Rendah)")
            elif z <= -1.65:
                categories.append("Coldspot 90% (Cukup Rendah)")
            else:
                categories.append("Tidak Signifikan (Netral)")

        gdf["gi_zscore"] = np.round(gi_z, 3)
        gdf["status_hotspot"] = categories
        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_layer(
            gdf,
            name=p.output_name or f"{in_name}_hotspot_{p.column}",
            style_overrides={"mode": "choropleth", "column": "gi_zscore", "palette": "coolwarm"},
        )


# 3. Spatial Interpolation (IDW / Radial Basis Kriging Approximation)
class InterpolateParams(BaseModel):
    points: LayerRef = Field(..., title="Layer titik sampel", json_schema_extra={"geom": ["point", "polygon"]})
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    column: str = Field(..., title="Kolom nilai yang diinterpolasi", json_schema_extra={"column_of": "points"})
    method: str = Field("idw", title="Metode interpolasi", json_schema_extra={"enum": ["idw", "kriging_rbf"]})
    power: float = Field(2.0, gt=0.5, le=5.0, title="Pangkat jarak IDW", json_schema_extra={"advanced": True})
    grid_size: int = Field(90, ge=30, le=250, title="Resolusi grid piksel", json_schema_extra={"advanced": True})
    output_name: str | None = Field(None, title="Nama layer raster hasil")


@register
class SpatialInterpolationTool(Tool):
    id = "stats.interpolate"
    name = "Isi Nilai di Antara Titik (Interpolasi)"
    technical_name = "IDW / Kriging Interpolation"
    group = "Statistik Spasial"
    level = "lanjut"
    description = "Membuat peta permukaan raster kontinu dengan menebak nilai di antara titik-titik pengukuran (misalnya curah hujan, suhu, kualitas udara)."
    illustration = "Titik Sampel ──► Raster Kontinu (IDW/Kriging)"
    Params = InterpolateParams

    def run(self, p: InterpolateParams, ctx: JobContext):
        gdf = ctx.load_layer(p.points, only_selected=p.only_selected)
        if p.column not in gdf.columns:
            raise PetaLabError("INVALID_COLUMN", f"Kolom '{p.column}' tidak ditemukan.")

        wgs = gdf.to_crs("EPSG:4326") if gdf.crs else gdf
        vals = pd.to_numeric(wgs[p.column], errors="coerce")
        valid_mask = vals.notna()
        wgs = wgs[valid_mask]
        z = vals[valid_mask].to_numpy(dtype=float)

        pts_x = wgs.geometry.centroid.x.to_numpy()
        pts_y = wgs.geometry.centroid.y.to_numpy()
        minx, miny, maxx, maxy = [float(x) for x in wgs.total_bounds]
        pad_x = max(0.008, (maxx - minx) * 0.08)
        pad_y = max(0.008, (maxy - miny) * 0.08)
        bbox = [minx - pad_x, miny - pad_y, maxx + pad_x, maxy + pad_y]

        w, h = int(p.grid_size), int(p.grid_size)
        xs = np.linspace(bbox[0], bbox[2], w)
        ys = np.linspace(bbox[3], bbox[1], h)
        gx, gy = np.meshgrid(xs, ys)

        ctx.progress(50, f"Menjalankan interpolasi {p.method.upper()} untuk '{p.column}'")
        if p.method == "kriging_rbf":
            from scipy.interpolate import Rbf
            rbf = Rbf(pts_x, pts_y, z, function="multiquadric", smooth=0.05)
            grid_z = rbf(gx, gy).astype(np.float32)
        else:
            # Vectorized IDW
            dx = gx[:, :, None] - pts_x[None, None, :]
            dy = gy[:, :, None] - pts_y[None, None, :]
            dist = np.maximum(np.hypot(dx, dy), 1e-7)
            weights = 1.0 / (dist ** p.power)
            grid_z = (np.sum(weights * z[None, None, :], axis=-1) / np.sum(weights, axis=-1)).astype(np.float32)

        ds = RasterDataset(
            data=grid_z[np.newaxis, :, :],
            bbox=bbox,
            crs="EPSG:4326",
            band_names=[f"Interpolasi_{p.column}"],
        )
        in_name = p.points.name or ctx.get_layer_meta(p.points)["name"]
        return ctx.save_raster(
            ds,
            name=p.output_name or f"{in_name}_{p.method}_{p.column}",
            style_overrides={"cmap": "viridis"},
        )


# 4. Spatial & Attribute Clustering (K-Means / DBSCAN)
class ClusteringToolParams(BaseModel):
    input: LayerRef = Field(..., title="Layer masukan")
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    algorithm: str = Field("kmeans", title="Algoritma", json_schema_extra={"enum": ["kmeans", "dbscan"]})
    n_clusters: int = Field(4, ge=2, le=15, title="Jumlah kelompok (untuk K-Means)")
    eps_m: float = Field(1500.0, gt=50, title="Jarak maksimum klaster meter (untuk DBSCAN)", json_schema_extra={"advanced": True})
    include_attributes: bool = Field(True, title="Libatkan semua kolom angka selain koordinat lokasi")
    output_name: str | None = Field(None, title="Nama layer hasil")


@register
class SpatialClusteringTool(Tool):
    id = "stats.clustering"
    name = "Pengelompokan Wilayah / Titik"
    technical_name = "Spatial K-Means / DBSCAN"
    group = "Statistik Spasial"
    level = "menengah"
    description = "Mengelompokkan objek secara otomatis berdasarkan kedekatan posisi geografis dan kemiripan nilai atribut."
    illustration = "•• •• ──► Klaster 1, Klaster 2, Klaster 3"
    Params = ClusteringToolParams

    def run(self, p: ClusteringToolParams, ctx: JobContext):
        gdf = ctx.load_layer(p.input, only_selected=p.only_selected).copy()
        gdf_m = ctx.to_metric_crs(gdf)
        coords = np.column_stack([gdf_m.geometry.centroid.x, gdf_m.geometry.centroid.y])

        ctx.progress(45, f"Menjalankan pengelompokan {p.algorithm.upper()}")
        if p.algorithm == "dbscan":
            labels = DBSCAN(eps=p.eps_m, min_samples=3).fit_predict(coords)
            gdf["klaster"] = [f"Klaster {lb + 1}" if lb >= 0 else "Pencilan (Noise)" for lb in labels]
        else:
            feat_list = [coords]
            if p.include_attributes:
                num_cols = [c for c in gdf.columns if c not in ("geometry", "_fid") and pd.api.types.is_numeric_dtype(gdf[c])]
                if num_cols:
                    num_mat = gdf[num_cols].fillna(gdf[num_cols].median()).to_numpy(dtype=float)
                    feat_list.append(num_mat)
            X = StandardScaler().fit_transform(np.hstack(feat_list))
            k = min(p.n_clusters, len(gdf))
            labels = KMeans(n_clusters=k, random_state=42, n_init=10).fit_predict(X)
            gdf["klaster"] = [f"Klaster {lb + 1}" for lb in labels]

        in_name = p.input.name or ctx.get_layer_meta(p.input)["name"]
        return ctx.save_layer(
            gdf,
            name=p.output_name or f"{in_name}_{p.algorithm}",
            style_overrides={"mode": "category", "column": "klaster"},
        )
