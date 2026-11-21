from pathlib import Path
import time

from fastapi.testclient import TestClient
import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import Point, Polygon

from petalab.core.validate import validate_and_clean_geodataframe
from petalab.main import app

client = TestClient(app)


def test_health_check():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["gdal_ok"] is True
    assert data["duckdb_ok"] is True
    assert data["ml_ok"] is True


def test_projects_and_sample_seeding():
    resp = client.post("/api/projects/sample")
    assert resp.status_code == 200
    proj = resp.json()
    assert proj["id"] == "banjir-surabaya"
    layers = proj["layers"]
    assert len(layers) >= 6
    names = {l["name"] for l in layers}
    assert "kecamatan_surabaya" in names
    assert "sekolah_surabaya" in names
    assert "zona_banjir_surabaya" in names
    assert "dem_citra_surabaya" in names
    assert "tabel_ekonomi_kecamatan" in names


def test_weird_data_validation_and_autofix():
    # Self-intersecting bowtie polygon + missing CRS + numeric string column + swapped lat/lon coordinates
    bowtie = Polygon([(112.70, -7.25), (112.75, -7.30), (112.75, -7.25), (112.70, -7.30)])
    assert not bowtie.is_valid
    raw_gdf = gpd.GeoDataFrame(
        {"nama": ["A"], "angka_teks": ["1250,5"], "geometry": [bowtie]},
        geometry="geometry",
        crs=None,
    )
    cleaned, report = validate_and_clean_geodataframe(raw_gdf, "uji_aneh", auto_fix_geometry=True)
    assert cleaned.crs is not None
    assert cleaned.geometry.iloc[0].is_valid
    assert pd.api.types.is_numeric_dtype(cleaned["angka_teks"])
    assert report["invalid_geometry_count"] == 1
    codes = {w["code"] for w in report["warnings"]}
    assert "CRS_MISSING" in codes
    assert "GEOM_INVALID" in codes


def test_tools_registry_and_buffer_clip_properties():
    resp = client.get("/api/tools")
    assert resp.status_code == 200
    tools = resp.json()
    assert len(tools) >= 24
    tool_ids = {t["id"] for t in tools}
    assert "vector.buffer" in tool_ids
    assert "vector.clip" in tool_ids
    assert "analysis.count_points" in tool_ids
    assert "raster.zonal_stats" in tool_ids
    assert "raster.index" in tool_ids
    assert "stats.morans_i" in tool_ids

    # Preview Buffer tool on sekolah_surabaya
    prev_resp = client.post(
        "/api/tools/vector.buffer/preview",
        json={
            "project_id": "banjir-surabaya",
            "params": {
                "input": {"id": "lyr_sekolah_sby", "name": "sekolah_surabaya"},
                "distance": 300,
                "unit": "m",
                "dissolve": False,
            },
        },
    )
    assert prev_resp.status_code == 200
    pdata = prev_resp.json()
    assert pdata["geojson"] is not None
    assert len(pdata["geojson"]["features"]) == 120
    assert "estimate_utm_crs" in pdata["python_code"]


def test_selection_table_calculator_and_fuzzy_join():
    # 1. Attribute Selection via Visual Query Builder
    sel_resp = client.post(
        "/api/layers/lyr_kecamatan_sby/select",
        json={
            "mode": "attribute",
            "rules": [{"column": "penduduk", "operator": "gt", "value": 100000}],
            "logic": "AND",
        },
    )
    assert sel_resp.status_code == 200
    sdata = sel_resp.json()
    assert sdata["count"] > 5

    # 2. Select by Location (Schools within Flood Zones)
    loc_resp = client.post(
        "/api/layers/lyr_sekolah_sby/select",
        json={
            "mode": "location",
            "reference_layer_id": "lyr_zona_banjir_sby",
            "relation": "within",
        },
    )
    assert loc_resp.status_code == 200
    assert loc_resp.json()["count"] >= 1

    # 3. Field Calculator Preview (Beginner Template: density)
    calc_resp = client.post(
        "/api/layers/lyr_kecamatan_sby/calculate",
        json={
            "target_column": "kepadatan_uji",
            "mode": "template",
            "template": "density",
            "param_col_a": "penduduk",
            "preview_only": True,
        },
    )
    assert calc_resp.status_code == 200
    assert len(calc_resp.json()["preview_rows"]) == 5

    # 4. 3-Step Table Join Wizard with Fuzzy Normalization ('Suko Manunggal' -> 'Sukomanunggal')
    join_unnorm = client.post(
        "/api/join",
        json={
            "project_id": "banjir-surabaya",
            "left_layer_id": "lyr_kecamatan_sby",
            "right_layer_id": "lyr_tabel_ekonomi",
            "left_key": "kecamatan",
            "right_key": "nama_kecamatan",
            "normalize_text": False,
            "preview_only": True,
        },
    ).json()
    assert join_unnorm["matched_count"] == 29
    assert join_unnorm["unmatched_count"] == 2

    join_norm = client.post(
        "/api/join",
        json={
            "project_id": "banjir-surabaya",
            "left_layer_id": "lyr_kecamatan_sby",
            "right_layer_id": "lyr_tabel_ekonomi",
            "left_key": "kecamatan",
            "right_key": "nama_kecamatan",
            "normalize_text": True,
            "preview_only": True,
        },
    ).json()
    assert join_norm["matched_count"] == 31


def test_raster_tile_and_dashboard_stats():
    tile_resp = client.get("/tiles/raster/lyr_dem_sby/11/1665/1065.png?cmap=terrain")
    assert tile_resp.status_code == 200
    assert tile_resp.headers["content-type"] == "image/png"

    stats_resp = client.get("/api/layers/lyr_kecamatan_sby/stats?column=kepadatan")
    assert stats_resp.status_code == 200
    st = stats_resp.json()
    assert st["kpi"]["feature_count"] == 31
    assert len(st["top_n"]) == 10
    assert len(st["histogram"]["bins"]) >= 5


def test_spatial_ml_cv_and_training():
    # 1. Spatial Block CV Map Preview
    cv_resp = client.post(
        "/api/models/cv_preview",
        json={
            "project_id": "banjir-surabaya",
            "layer_id": "lyr_kecamatan_sby",
            "block_size_m": 4000,
            "n_splits": 5,
        },
    )
    assert cv_resp.status_code == 200
    assert len(cv_resp.json()["geojson"]["features"]) >= 5

    # 2. Train Spatial Regression Model via Background Job
    train_resp = client.post(
        "/api/models/train",
        json={
            "project_id": "banjir-surabaya",
            "params": {
                "model_name": "Prediksi_Suhu_Surabaya",
                "task": "regression",
                "algorithm": "seimbang",
                "layer_id": "lyr_kecamatan_sby",
                "target_column": "suhu_permukaan_c",
                "feature_columns": ["ndvi_rata", "elevasi_m", "kepadatan"],
                "cv_method": "spatial_block",
                "n_splits": 4,
                "block_size_m": 4000,
            },
        },
    )
    assert train_resp.status_code == 200
    job_id = train_resp.json()["job_id"]

    # Wait for background job completion
    for _ in range(40):
        j = client.get(f"/api/jobs/{job_id}").json()
        if j["status"] in ("succeeded", "failed"):
            break
        time.sleep(0.15)
    assert j["status"] == "succeeded"

    models_list = client.get("/api/models?project_id=banjir-surabaya").json()
    assert len(models_list) >= 1
    mid = models_list[0]["id"]
    nb_resp = client.get(f"/api/models/{mid}/notebook?project_id=banjir-surabaya")
    assert nb_resp.status_code == 200
    assert "cells" in nb_resp.json()["notebook"]

    # Clean up prediction layer generated during test so sample workspace stays tidy
    pred_lid = (j.get("outputs") or {}).get("prediction_layer_id") or (models_list[0].get("card") or {}).get("prediction_layer_id")
    if pred_lid:
        client.delete(f"/api/layers/{pred_lid}?project_id=banjir-surabaya")


def test_create_csv_dataset_from_captured_points():
    # 1. Create a brand-new CSV dataset from scratch with explicit long & lat columns
    pts = [
        {
            "nama": "Pos Pantau A",
            "kategori": "Hulu",
            "pasangan_grup": "Pasangan 1",
            "peran": "Titik A",
            "long": 112.7521,
            "lat": -7.2575,
            "jarak_m": 1245.5,
        },
        {
            "nama": "Pos Pantau B",
            "kategori": "Hilir",
            "pasangan_grup": "Pasangan 1",
            "peran": "Titik B",
            "long": 112.7615,
            "lat": -7.2632,
            "jarak_m": 1245.5,
        },
    ]
    res1 = client.post(
        "/api/datasets/create_csv",
        json={
            "project_id": "banjir-surabaya",
            "dataset_name": "uji_survei_titik",
            "points": pts,
            "csv_delimiter": ";",
            "pair_mode": True,
        },
    )
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["row_count"] == 2
    assert d1["csv_filename"] == "uji_survei_titik.csv"
    assert d1["xlsx_filename"] == "uji_survei_titik.xlsx"
    lid1 = d1["layer"]["id"]

    # Verify physical CSV (semicolon Excel ID) and native Excel (.xlsx) download endpoints
    dl1 = client.get(d1["csv_download_url"])
    assert dl1.status_code == 200
    csv_text1 = dl1.content.decode("utf-8-sig")
    header1 = csv_text1.splitlines()[0].split(";")
    assert "long" in header1
    assert "lat" in header1
    assert "catatan" not in header1  # empty unused column cleanly omitted
    assert "Pos Pantau A" in csv_text1

    dl_xlsx = client.get(d1["xlsx_download_url"])
    assert dl_xlsx.status_code == 200
    assert dl_xlsx.content[:2] == b"PK"  # valid OpenXML .xlsx archive

    # 2. Create a new CSV dataset joining captured long & lat onto an existing table layer
    res2 = client.post(
        "/api/datasets/create_csv",
        json={
            "project_id": "banjir-surabaya",
            "dataset_name": "uji_join_ekonomi_titik",
            "points": pts,
            "join_table_layer_id": "lyr_tabel_ekonomi",
        },
    )
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["row_count"] == 2
    lid2 = d2["layer"]["id"]

    dl2 = client.get(d2["csv_download_url"])
    assert dl2.status_code == 200
    csv_text2 = dl2.content.decode("utf-8-sig")
    header2 = csv_text2.splitlines()[0].split(",")
    assert "long" in header2
    assert "lat" in header2
    assert "nama_kecamatan" in header2

    # Cleanup test layers from sample project
    client.delete(f"/api/layers/{lid1}?project_id=banjir-surabaya")
    client.delete(f"/api/layers/{lid2}?project_id=banjir-surabaya")


def test_p0_regressions_all_tools_404_guard_and_honest_osm():
    # 1. All 43 tools (including all 11 GEE tools in gee_tools.py) must be registered cleanly
    tools_resp = client.get("/api/tools")
    assert tools_resp.status_code == 200
    tool_ids = {t["id"] for t in tools_resp.json()}
    assert len(tool_ids) >= 43
    assert "gee.ndvi" in tool_ids
    assert "gee.zonal_direct" in tool_ids

    # 2. Non-existent /api/... routes must return 404 JSON, never 200 OK index.html
    nf_resp = client.get("/api/tidak_ada_sama_sekali")
    assert nf_resp.status_code == 404
    assert nf_resp.json()["code"] == "NOT_FOUND"

    # 3. OSM Overpass must NOT fabricate fake data silently when unreachable (offline sandbox)
    from petalab.api.osm import _fetch_or_synthesize_osm
    from petalab.errors import PetaLabError

    with pytest.raises(PetaLabError) as exc_info:
        _fetch_or_synthesize_osm('way["highway"]', "line", "jalan", [112.74, -7.27, 112.75, -7.26])
    assert exc_info.value.code in ("OSM_UNAVAILABLE", "OSM_OVERPASS_ERROR")


def test_p1_security_token_duckdb_guard_and_unified_excel_export():
    from petalab.config import config as app_config

    # 1. Python console MUST reject requests without valid local session token (403)
    unauth = client.post(
        "/api/python/console",
        json={"project_id": "banjir-surabaya", "code": "print(1 + 1)"},
    )
    assert unauth.status_code == 403
    assert unauth.json()["code"] == "UNAUTHORIZED_CONSOLE"

    # Valid token succeeds
    auth_ok = client.post(
        "/api/python/console",
        headers={"X-PetaLab-Token": app_config.session_token},
        json={"project_id": "banjir-surabaya", "code": "print(21 * 2)"},
    )
    assert auth_ok.status_code == 200
    assert "42" in auth_ok.json()["output"]

    # 2. DuckDB SQL sandbox must block file-reading & env functions
    for bad_expr in ["read_csv_auto('/etc/passwd')", "getenv('PATH')", "1=1; DROP TABLE x"]:
        r = client.post(
            "/api/layers/lyr_kecamatan_sby/select",
            json={"mode": "attribute", "sql_where": bad_expr},
        )
        assert r.status_code == 400
        assert r.json()["code"] == "UNSAFE_SQL"

    # 3. Unified export supports semicolon CSV (Excel Indonesia) and styled native Excel (.xlsx) with long & lat
    exp_csv = client.post(
        "/api/export",
        json={
            "project_id": "banjir-surabaya",
            "export_type": "layer",
            "layer_id": "lyr_sekolah_sby",
            "format": "csv",
            "csv_delimiter": ";",
        },
    )
    assert exp_csv.status_code == 200
    csv_dl = client.get(exp_csv.json()["download_url"])
    assert csv_dl.status_code == 200
    cols = csv_dl.content.decode("utf-8-sig").splitlines()[0].split(";")
    assert "long" in cols and "lat" in cols

    exp_xlsx = client.post(
        "/api/export",
        json={
            "project_id": "banjir-surabaya",
            "export_type": "layer",
            "layer_id": "lyr_sekolah_sby",
            "format": "xlsx",
        },
    )
    assert exp_xlsx.status_code == 200
    xlsx_dl = client.get(exp_xlsx.json()["download_url"])
    assert xlsx_dl.status_code == 200
    assert xlsx_dl.content[:2] == b"PK"


def test_segment_lonlat_two_columns_swap_autofix_and_heatmap():
    # Create a small point CSV layer with swapped Indonesian coords & bobot column
    csv_res = client.post(
        "/api/datasets/create_csv",
        json={
            "project_id": "banjir-surabaya",
            "dataset_name": "uji_segmen_jkt",
            "points": [
                {"nama": "A", "long": 106.81, "lat": -6.20, "kategori": "10"},
                {"nama": "B", "long": 106.92, "lat": -6.21, "kategori": "20"},
                {"nama": "C", "long": 106.82, "lat": -6.32, "kategori": "30"},
                {"nama": "D", "long": 106.95, "lat": -6.35, "kategori": "40"},
            ],
        },
    )
    assert csv_res.status_code == 200
    src_lid = csv_res.json()["layer"]["id"]

    # Intentionally pass swapped lon_column="lat", lat_column="long" to test Indonesia swap auto-fix + Quadrant segmentation + Heatmap style!
    seg_res = client.post(
        f"/api/layers/{src_lid}/segment_lonlat",
        json={
            "project_id": "banjir-surabaya",
            "lon_column": "lat",
            "lat_column": "long",
            "auto_fix_indonesia": True,
            "segment_mode": "quadrant",
            "create_zone_layer": True,
            "view_as_heatmap": True,
        },
    )
    assert seg_res.status_code == 200
    sdata = seg_res.json()
    assert sdata["accuracy"]["valid_points"] == 4
    assert sdata["accuracy"]["swapped_detected"] is True
    assert sdata["accuracy"]["swapped_applied"] is True
    assert sdata["accuracy"]["utm_crs"] == "EPSG:32748"
    assert "Jabodetabek" in sdata["accuracy"]["region_hint"]
    assert sdata["point_layer"]["style"]["mode"] == "heatmap"
    assert sdata["zone_layer"] is not None
    assert len(sdata["segment_summary"]) >= 2

    # Cleanup temporary layers
    client.delete(f"/api/layers/{src_lid}?project_id=banjir-surabaya")
    client.delete(f"/api/layers/{sdata['point_layer']['id']}?project_id=banjir-surabaya")
    client.delete(f"/api/layers/{sdata['zone_layer']['id']}?project_id=banjir-surabaya")




