"""
Built-in Offline Sample Data Generator ("Surabaya Spatial Lab").
Creates realistic spatial vector layers, a multi-band DEM + Satellite Raster,
and an economic CSV table so beginners can test every feature of PetaLab offline:
1. kecamatan_surabaya (31 polygons with population, density, NDVI, surface temp, flood risk)
2. sekolah_surabaya (120 school points across Surabaya with jenjang, siswa, akreditasi)
3. zona_banjir_surabaya (flood-prone zone polygons along Kalimas & East Coast)
4. jalan_utama_surabaya (major arterial road lines)
5. dem_citra_surabaya (Multi-band Raster: Band 1 Elevation DEM, Band 2 Red, Band 3 NIR, Band 4 Green)
6. data_ekonomi_kecamatan.csv (non-spatial table with slightly varied spelling for testing Join Wizard)
"""

from pathlib import Path
from typing import Any

import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import voronoi_diagram
from shapely.geometry import MultiPoint

from petalab.core.io_raster import RasterDataset, default_style_for_raster, save_raster_dataset
from petalab.core.io_vector import default_style_for_geom, save_working_layer
from petalab.db.repo import repo

KECAMATAN_SURABAYA = [
    ("Tegalsari", 112.738, -7.274, 92400, "Pusat"),
    ("Genteng", 112.746, -7.260, 56800, "Pusat"),
    ("Bubutan", 112.732, -7.251, 88200, "Pusat"),
    ("Simokerto", 112.752, -7.243, 84900, "Pusat"),
    ("Gubeng", 112.758, -7.278, 128500, "Timur"),
    ("Tambaksari", 112.765, -7.254, 214000, "Timur"),
    ("Mulyorejo", 112.789, -7.267, 89600, "Timur"),
    ("Sukolilo", 112.793, -7.294, 115200, "Timur"),
    ("Rungkut", 112.788, -7.322, 121800, "Timur"),
    ("Gunung Anyar", 112.787, -7.339, 62400, "Timur"),
    ("Tenggilis Mejoyo", 112.762, -7.321, 59800, "Timur"),
    ("Wonokromo", 112.739, -7.298, 148000, "Selatan"),
    ("Wonocolo", 112.742, -7.318, 79500, "Selatan"),
    ("Wiyung", 112.695, -7.313, 74200, "Selatan"),
    ("Karang Pilang", 112.687, -7.336, 73800, "Selatan"),
    ("Jambangan", 112.718, -7.324, 53400, "Selatan"),
    ("Gayungan", 112.728, -7.335, 44200, "Selatan"),
    ("Dukuh Pakis", 112.708, -7.292, 58900, "Selatan"),
    ("Sawahan", 112.722, -7.276, 189500, "Selatan"),
    ("Sukomanunggal", 112.698, -7.269, 102400, "Barat"),
    ("Tandes", 112.678, -7.261, 89300, "Barat"),
    ("Asemrowo", 112.697, -7.241, 47600, "Barat"),
    ("Benowo", 112.634, -7.238, 69800, "Barat"),
    ("Pakal", 112.615, -7.246, 59400, "Barat"),
    ("Lakarsantri", 112.648, -7.305, 63100, "Barat"),
    ("Sambikerep", 112.655, -7.278, 67200, "Barat"),
    ("Krembangan", 112.722, -7.232, 109500, "Utara"),
    ("Pabean Cantian", 112.736, -7.224, 71800, "Utara"),
    ("Semampir", 112.748, -7.221, 176400, "Utara"),
    ("Kenjeran", 112.775, -7.225, 178900, "Utara"),
    ("Bulak", 112.788, -7.238, 45600, "Utara"),
]


def seed_sample_project(project_id: str = "banjir-surabaya") -> dict[str, Any]:
    """Creates or refreshes the built-in 'Surabaya Spatial Lab' project with rich sample datasets."""
    existing = [p["id"] for p in repo.list_projects()]
    if project_id in existing:
        proj = repo.get_project(project_id)
        if len(proj.get("layers", [])) >= 4:
            return proj

    repo.create_project(
        name="Analisis Spasial & Banjir Surabaya (Contoh)",
        description="Proyek contoh bawaan PetaLab: 31 Kecamatan Surabaya, 120 Sekolah, Zona Banjir, Jaringan Jalan, Raster DEM/Citra, dan Tabel Ekonomi.",
        basemap="osm_standard",
        center=[112.735, -7.275],
        zoom=11.6,
        project_id=project_id,
    )
    pdir = repo.get_project_dir(project_id)
    rng = np.random.default_rng(42)

    # 1. Generate 31 Kecamatan Surabaya Polygons via clipped Voronoi cells around actual centroids
    boundary = Polygon([
        (112.595, -7.355),
        (112.818, -7.355),
        (112.818, -7.215),
        (112.765, -7.202),
        (112.615, -7.212),
        (112.595, -7.265),
    ])
    pts = [Point(lon, lat) for _, lon, lat, _, _ in KECAMATAN_SURABAYA]
    v_diag = voronoi_diagram(MultiPoint(pts), envelope=boundary)
    cells = [g.intersection(boundary) for g in v_diag.geoms]

    kec_rows = []
    for idx, (name, lon, lat, pop, wilayah) in enumerate(KECAMATAN_SURABAYA):
        pt = Point(lon, lat)
        poly = next((c for c in cells if c.contains(pt)), cells[idx % len(cells)])
        # Calculate realistic metrics
        dist_center = np.hypot((lon - 112.74) * 111.0, (lat - (-7.26)) * 111.0)
        dist_coast = max(0.4, (112.815 - lon) * 111.0)
        ndvi = round(float(np.clip(0.16 + 0.032 * dist_center + rng.normal(0, 0.04), 0.08, 0.62)), 3)
        elev_m = round(float(np.clip(2.0 + (112.78 - lon) * 45.0 + rng.normal(0, 1.5), 1.2, 32.0)), 1)
        suhu_c = round(float(34.8 - 5.2 * ndvi - 0.08 * elev_m + rng.normal(0, 0.35)), 2)
        luas_km2 = round(float(poly.area * (111.32 ** 2)), 2)
        kepadatan = round(float(pop / max(1.0, luas_km2)), 1)
        skor_banjir = round(float(np.clip(85 - 2.2 * elev_m - 35 * ndvi + (12.0 / dist_coast) + rng.normal(0, 4), 15, 96)), 1)
        status_rawan = "Tinggi" if skor_banjir >= 65 else ("Sedang" if skor_banjir >= 45 else "Rendah")

        kec_rows.append({
            "_fid": idx + 1,
            "kode_kec": f"3578{idx + 1:02d}",
            "kecamatan": name,
            "wilayah": wilayah,
            "penduduk": int(pop),
            "luas_km2": luas_km2,
            "kepadatan": kepadatan,
            "ndvi_rata": ndvi,
            "elevasi_m": elev_m,
            "suhu_permukaan_c": suhu_c,
            "skor_rawan_banjir": skor_banjir,
            "kategori_banjir": status_rawan,
            "geometry": poly,
        })

    kec_gdf = gpd.GeoDataFrame(kec_rows, geometry="geometry", crs="EPSG:4326")
    kec_path = pdir / "layers" / "kecamatan_surabaya.parquet"
    kec_meta = save_working_layer(kec_gdf, kec_path)
    kec_style = default_style_for_geom("polygon", 0)
    kec_style.update({
        "mode": "choropleth",
        "column": "kepadatan",
        "palette": "viridis",
        "classes": 5,
        "method": "quantile",
        "opacity": 0.72,
    })
    kec_layer = repo.add_layer(project_id, {
        "id": "lyr_kecamatan_sby",
        "name": "kecamatan_surabaya",
        "path": "layers/kecamatan_surabaya.parquet",
        **kec_meta,
        "style": kec_style,
        "lineage": {"tool": "sample_data", "tool_name": "Data Contoh Bawaan", "description": "31 Kecamatan Kota Surabaya"},
    })

    # 2. Generate Zona Banjir Surabaya (Polygons)
    banjir_polys = [
        ("Genangan Kalimas Hilir", "Tinggi", 85, Polygon([(112.728, -7.245), (112.752, -7.245), (112.752, -7.218), (112.728, -7.218)])),
        ("Rawan Rob Pantai Timur", "Tinggi", 90, Polygon([(112.782, -7.335), (112.815, -7.335), (112.815, -7.235), (112.782, -7.235)])),
        ("Cekungan Wonokromo - Gubeng", "Sedang", 65, Polygon([(112.735, -7.308), (112.768, -7.308), (112.768, -7.272), (112.735, -7.272)])),
        ("Lembah Tandes - Sukomanunggal", "Sedang", 60, Polygon([(112.668, -7.275), (112.705, -7.275), (112.705, -7.248), (112.668, -7.248)])),
    ]
    banjir_gdf = gpd.GeoDataFrame(
        [
            {"_fid": i + 1, "nama_zona": n, "tingkat_bahaya": t, "kedalaman_cm": d, "geometry": g}
            for i, (n, t, d, g) in enumerate(banjir_polys)
        ],
        geometry="geometry",
        crs="EPSG:4326",
    )
    banjir_path = pdir / "layers" / "zona_banjir_surabaya.parquet"
    banjir_meta = save_working_layer(banjir_gdf, banjir_path)
    banjir_style = default_style_for_geom("polygon", 4)
    banjir_style.update({"fillColor": "#ef4444", "color": "#dc2626", "opacity": 0.45})
    repo.add_layer(project_id, {
        "id": "lyr_zona_banjir_sby",
        "name": "zona_banjir_surabaya",
        "path": "layers/zona_banjir_surabaya.parquet",
        **banjir_meta,
        "style": banjir_style,
        "lineage": {"tool": "sample_data", "tool_name": "Data Contoh Bawaan", "description": "Area Rawan Genangan & Rob Surabaya"},
    })

    # 3. Generate 120 Titik Sekolah Surabaya
    jenjang_choices = ["SD", "SMP", "SMA", "SMK"]
    sekolah_rows = []
    for i in range(120):
        kec_row = kec_rows[i % len(kec_rows)]
        c = kec_row["geometry"].centroid
        jx = float(c.x + rng.normal(0, 0.011))
        jy = float(c.y + rng.normal(0, 0.011))
        pt = Point(jx, jy)
        if not boundary.contains(pt):
            pt = c
        jenjang = jenjang_choices[i % 4]
        siswa = int(rng.integers(180, 960))
        guru = max(12, int(siswa / rng.integers(16, 24)))
        akreditasi = "A" if i % 5 != 0 else "B"
        sekolah_rows.append({
            "_fid": i + 1,
            "nama_sekolah": f"{jenjang}N {kec_row['kecamatan']} {(i // len(kec_rows)) + 1}",
            "jenjang": jenjang,
            "kecamatan": kec_row["kecamatan"],
            "siswa": siswa,
            "guru": guru,
            "akreditasi": akreditasi,
            "geometry": pt,
        })
    sekolah_gdf = gpd.GeoDataFrame(sekolah_rows, geometry="geometry", crs="EPSG:4326")
    sekolah_path = pdir / "layers" / "sekolah_surabaya.parquet"
    sekolah_meta = save_working_layer(sekolah_gdf, sekolah_path)
    sekolah_style = default_style_for_geom("point", 1)
    sekolah_style.update({"mode": "category", "column": "jenjang", "pointRadius": 6})
    repo.add_layer(project_id, {
        "id": "lyr_sekolah_sby",
        "name": "sekolah_surabaya",
        "path": "layers/sekolah_surabaya.parquet",
        **sekolah_meta,
        "style": sekolah_style,
        "lineage": {"tool": "sample_data", "tool_name": "Data Contoh Bawaan", "description": "120 Titik Fasilitas Sekolah Surabaya"},
    })

    # 4. Generate Jalan Utama Surabaya (LineStrings)
    jalan_lines = [
        ("Jl. Ahmad Yani - Darmo - Basuki Rahmat", "Arteri Primer", 6, LineString([(112.728, -7.348), (112.736, -7.295), (112.741, -7.265), (112.738, -7.232)])),
        ("Jl. Ir. Soekarno (MERR)", "Arteri Primer", 6, LineString([(112.785, -7.338), (112.782, -7.295), (112.780, -7.255), (112.776, -7.228)])),
        ("Jl. Mayjen Sungkono - HR Muhammad", "Arteri Sekunder", 4, LineString([(112.662, -7.285), (112.702, -7.289), (112.736, -7.292)])),
        ("Jl. Raya Dupak - Tandes - Benowo", "Arteri Primer", 4, LineString([(112.620, -7.242), (112.675, -7.255), (112.725, -7.248)])),
        ("Jl. Kenjeran - Kapas Krampung", "Kolektor", 4, LineString([(112.742, -7.246), (112.768, -7.245), (112.796, -7.242)])),
    ]
    jalan_gdf = gpd.GeoDataFrame(
        [
            {"_fid": i + 1, "nama_jalan": n, "kelas_jalan": k, "jumlah_lajur": l, "geometry": g}
            for i, (n, k, l, g) in enumerate(jalan_lines)
        ],
        geometry="geometry",
        crs="EPSG:4326",
    )
    jalan_path = pdir / "layers" / "jalan_utama_surabaya.parquet"
    jalan_meta = save_working_layer(jalan_gdf, jalan_path)
    jalan_style = default_style_for_geom("line", 2)
    jalan_style.update({"color": "#f59e0b", "strokeColor": "#f59e0b", "strokeWidth": 3.0})
    repo.add_layer(project_id, {
        "id": "lyr_jalan_sby",
        "name": "jalan_utama_surabaya",
        "path": "layers/jalan_utama_surabaya.parquet",
        **jalan_meta,
        "style": jalan_style,
        "lineage": {"tool": "sample_data", "tool_name": "Data Contoh Bawaan", "description": "Jaringan Koridor Jalan Utama Surabaya"},
    })

    # 5. Generate Multi-Band Raster: DEM + Red + NIR + Green (for NDVI, Slope, Hillshade, Zonal Stats, Pixel ML)
    width, height = 120, 90
    bbox_r = [112.595, -7.355, 112.818, -7.202]
    xs = np.linspace(bbox_r[0], bbox_r[2], width)
    ys = np.linspace(bbox_r[3], bbox_r[1], height)
    gx, gy = np.meshgrid(xs, ys)

    # Band 1: Digital Elevation Model (higher in West Bukit Darmo/Lakarsantri, lower in East Coast)
    dem = (
        2.5
        + 24.0 * np.exp(-(((gx - 112.66) / 0.055) ** 2 + ((gy - (-7.295)) / 0.045) ** 2))
        + 14.0 * np.clip((112.79 - gx) / 0.20, 0, 1)
        + 1.8 * np.sin(gx * 90) * np.cos(gy * 90)
    ).astype(np.float32)

    # Band 2 (Red) & Band 3 (NIR) to produce realistic NDVI across urban center vs mangrove east coast & west hills
    urban_core = np.exp(-(((gx - 112.742) / 0.05) ** 2 + ((gy - (-7.265)) / 0.045) ** 2))
    mangrove_east = np.exp(-(((gx - 112.805) / 0.025) ** 2 + ((gy - (-7.285)) / 0.05) ** 2))
    red_band = np.clip(0.18 + 0.14 * urban_core - 0.08 * mangrove_east, 0.04, 0.45).astype(np.float32)
    nir_band = np.clip(0.32 - 0.12 * urban_core + 0.25 * mangrove_east + 0.004 * dem, 0.08, 0.72).astype(np.float32)
    green_band = np.clip((red_band + nir_band) * 0.45, 0.05, 0.55).astype(np.float32)

    raster_ds = RasterDataset(
        data=np.stack([dem, red_band, nir_band, green_band], axis=0),
        bbox=bbox_r,
        crs="EPSG:4326",
        nodata=-9999.0,
        band_names=["Elevasi_DEM_m", "Band_Red_B4", "Band_NIR_B8", "Band_Green_B3"],
    )
    tif_path = pdir / "layers" / "dem_citra_surabaya.tif"
    rmeta = save_raster_dataset(raster_ds, tif_path)
    rstyle = default_style_for_raster(rmeta["raster_meta"])
    repo.add_layer(project_id, {
        "id": "lyr_dem_sby",
        "name": "dem_citra_surabaya",
        "path": "layers/dem_citra_surabaya.tif",
        **rmeta,
        "style": rstyle,
        "lineage": {
            "tool": "sample_data",
            "tool_name": "Data Contoh Bawaan",
            "description": "Raster Multi-band: Band 1 DEM (m), Band 2 Red, Band 3 NIR, Band 4 Green",
        },
    })

    # 6. Non-spatial Table for testing 3-Step Join Wizard (with intentional spelling variations!)
    ekonomi_rows = []
    for idx, (name, _, _, pop, _) in enumerate(KECAMATAN_SURABAYA):
        # Introduce realistic spelling variations on 2 rows ("Suko Manunggal" vs "Sukomanunggal", "Karangpilang" vs "Karang Pilang")
        join_name = name
        if name == "Sukomanunggal":
            join_name = "Suko Manunggal"
        elif name == "Karang Pilang":
            join_name = "Karangpilang"
        ekonomi_rows.append({
            "_fid": idx + 1,
            "nama_kecamatan": join_name,
            "jumlah_umkm": int(pop * 0.042 + rng.integers(100, 650)),
            "pendapatan_rata_juta": round(float(rng.uniform(4.2, 9.8)), 2),
            "anggaran_drainase_miliar": round(float(rng.uniform(8.5, 34.0)), 2),
        })
    ekon_df = pd.DataFrame(ekonomi_rows)
    ekon_csv_source = pdir / "sources" / "data_ekonomi_kecamatan.csv"
    ekon_df.drop(columns=["_fid"]).to_csv(ekon_csv_source, index=False, encoding="utf-8-sig")
    ekon_parquet = pdir / "layers" / "tabel_ekonomi_kecamatan.parquet"
    ekon_meta = save_working_layer(ekon_df, ekon_parquet)
    repo.add_layer(project_id, {
        "id": "lyr_tabel_ekonomi",
        "name": "tabel_ekonomi_kecamatan",
        "path": "layers/tabel_ekonomi_kecamatan.parquet",
        "source_path": "sources/data_ekonomi_kecamatan.csv",
        **ekon_meta,
        "style": {},
        "lineage": {
            "tool": "sample_data",
            "tool_name": "Data Contoh Bawaan",
            "description": "Tabel Ekonomi & UMKM per Kecamatan (siap di-Join ke layer kecamatan_surabaya)",
        },
    })

    repo.add_history(
        project_id,
        action="import",
        title="Memuat Proyek & Data Contoh Surabaya Spatial Lab",
        target_id=kec_layer["id"],
        payload={"layers_seeded": 6},
    )

    return repo.get_project(project_id)
