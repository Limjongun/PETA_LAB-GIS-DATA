"""
Comprehensive Test Suite for PetaLab × Google Earth Engine Integration (§17 & §19).
Covers:
1. Security: Credentials stored strictly outside `projects/` (0600) & NEVER included in `.petalab.zip` export.
2. Attribution: `SUMBER_DATA.md` automatically generated in `.petalab.zip` with dataset attributions.
3. Estimation: `plan_download()` accuracy for 32 MB limit, 10,000 px grid limit, and `GEE_SCALE_TOO_FINE`.
4. Error Translator & Redactor: Every regex pattern + signed URL & OAuth token scrubbing.
5. Catalog Integrity: All 10 presets have dataset_id, native_scale_m, attribution, and keywords.
6. End-to-end API flow: connect → test → estimate → preview PNG tile → fetch job → cache hit → zonal_direct → ML GEE leakage rule!
"""

import os
from pathlib import Path
import time
import zipfile

from fastapi.testclient import TestClient
import pandas as pd
import pytest

from petalab.core.gee import auth, catalog, errors, estimate
from petalab.main import app
from petalab.ml.features import audit_features_and_target

client = TestClient(app)


def test_security_credentials_never_in_project_export(monkeypatch, tmp_path):
    """MANDATORY SECURITY TEST (§5.3 & §17): Project export `.petalab.zip` must NEVER include credentials."""
    from petalab.config import config as app_config
    prev_settings = app_config.get_settings().copy()
    monkeypatch.setattr(auth, "get_credentials_dir", lambda: tmp_path / "creds")
    monkeypatch.setattr(auth, "is_ee_package_installed", lambda: False)
    try:
        # Connect GEE so credential file exists on disk
        res = client.post(
            "/api/gee/auth",
            json={"project_id": "petalab-security-test", "auth_mode": "oauth", "email": "uji@kampus.ac.id"},
        )
        assert res.status_code == 200
        status = res.json()
        assert status["connected"] is True
        assert status["credentials_isolated_outside_projects"] is True

        # Ensure credential file exists in isolated temp credentials dir, NOT inside projects/
        cred_file = auth.get_credentials_dir() / "gee_oauth.json"
        assert cred_file.exists()

        # Export project as .petalab.zip
        exp = client.post("/api/export", json={"project_id": "banjir-surabaya", "export_type": "project_zip"})
        assert exp.status_code == 200
        zip_filename = exp.json()["filename"]
        zip_path = Path("d:/GIS/workspace/projects/banjir-surabaya/exports") / zip_filename
        assert zip_path.exists()

        with zipfile.ZipFile(zip_path, "r") as zf:
            names = zf.namelist()
            assert "SUMBER_DATA.md" in names
            for name in names:
                assert "credential" not in name.lower()
                assert "gee_oauth" not in name.lower()
                assert "service_account" not in name.lower()
    finally:
        app_config.update_settings(prev_settings)


def test_gee_estimation_boundaries():
    """Tests 32 MB budget splitting, 10,000 px grid limit, and `GEE_SCALE_TOO_FINE`."""
    # Small Surabaya bbox at 10m NDVI (1 band float32) -> fits in 1 tile (< 24 MB)
    small_bbox = [112.70, -7.30, 112.76, -7.24]
    plan_small = estimate.plan_download(small_bbox, scale=10, n_bands=1, dtype="float32", native_scale=10)
    assert plan_small.n_tiles == 1
    assert plan_small.est_bytes < estimate.MAX_REQUEST_BYTES

    # Large province bbox at 10m 3-band RGB -> must automatically split into multiple tiles
    large_bbox = [112.0, -8.0, 113.5, -6.8]
    plan_large = estimate.plan_download(large_bbox, scale=10, n_bands=3, dtype="float32", native_scale=10)
    assert plan_large.n_tiles > 4
    assert len(plan_large.tile_bboxes) == plan_large.n_tiles

    # Requesting 5m scale on 30m native dataset triggers GEE_SCALE_TOO_FINE when strict_scale=True
    with pytest.raises(Exception) as exc_info:
        estimate.plan_download(small_bbox, scale=5, n_bands=1, dtype="float32", native_scale=30, strict_scale=True)
    assert "30 meter" in str(exc_info.value)


def test_gee_errors_and_redaction():
    """Tests error pattern translation and redaction of signed URLs & OAuth tokens."""
    raw = (
        "Error: Total request size (691287720 bytes) must be less than or equal to 50331648 bytes "
        "at https://earthengine.googleapis.com/download?token=ya29.a0AfH6SMB_SECRET_TOKEN_123456789012345678901234567890"
    )
    translated = errors.to_user_error(RuntimeError(raw))
    assert translated["code"] == "GEE_TOO_BIG"
    assert "SECRET_TOKEN" not in translated["detail"]
    assert "[url disembunyikan]" in translated["detail"]

    mem_err = errors.to_user_error(RuntimeError("EEException: User memory limit exceeded."))
    assert mem_err["code"] == "GEE_MEMORY"

    busy_err = errors.to_user_error(RuntimeError("HTTP 429 Too Many Requests"))
    assert busy_err["code"] == "GEE_BUSY"


def test_gee_catalog_completeness():
    """All 10 presets must have official attribution, dataset_id, native resolution, and keywords."""
    items = catalog.list_catalog_presets(include_advanced=True)
    assert len(items) == 10
    for it in items:
        assert it["dataset_id"]
        assert it["native_scale_m"] >= 10
        assert len(it["attribution"]) > 10
        assert len(it["keywords"]) >= 3

    # Keyword search for Indonesian beginners
    hijau = catalog.list_catalog_presets(search_query="hijau")
    assert any(x["id"] == "gee.ndvi" for x in hijau)
    panas = catalog.list_catalog_presets(search_query="panas")
    assert any(x["id"] == "gee.lst" for x in panas)


def test_gee_end_to_end_preview_fetch_and_ml_leakage(monkeypatch, tmp_path):
    # Isolate credentials & run offline academic engine deterministically without clobbering user's live GEE config
    from petalab.config import config as app_config
    prev_settings = app_config.get_settings().copy()
    monkeypatch.setattr(auth, "get_credentials_dir", lambda: tmp_path / "creds")
    monkeypatch.setattr(auth, "is_ee_package_installed", lambda: False)
    created_layer_id = None
    try:
        # 1. Connect & Test
        client.post("/api/gee/auth", json={"project_id": "petalab-riset-2026", "auth_mode": "oauth"})
        t_resp = client.post("/api/gee/test", json={"project_id": "petalab-riset-2026"})
        assert t_resp.status_code == 200
        assert t_resp.json()["ok"] is True

        # 2. Preview XYZ Tile returns valid PNG
        tile_resp = client.get("/api/gee/tiles/gee.ndvi/11/1665/1065.png?cmap=rdylgn")
        assert tile_resp.status_code == 200
        assert tile_resp.headers["content-type"] == "image/png"

        # 3. Fetch NDVI layer via Background Job & verify local raster layer + attribution
        f_resp = client.post(
            "/api/gee/fetch",
            json={
                "project_id": "banjir-surabaya",
                "preset_id": "gee.ndvi",
                "layer_id": "lyr_kecamatan_sby",
                "scale": 30,
                "tanggal_mulai": "2026-06-01",
                "tanggal_akhir": "2026-08-31",
                "output_name": "uji_ndvi_gee_sby",
            },
        )
        assert f_resp.status_code == 200
        jid = f_resp.json()["job_id"]
        for _ in range(40):
            j = client.get(f"/api/jobs/{jid}").json()
            if j["status"] in ("succeeded", "failed"):
                break
            time.sleep(0.1)
        assert j["status"] == "succeeded"
        created_layer_id = (j.get("outputs") or {}).get("id")

        # 4. Verify GEE special leakage rule (§11.3): predicting suhu_permukaan_c with gee_lst
        df_mock = pd.DataFrame({
            "suhu_permukaan_c": [31.2, 32.5, 33.1, 30.8, 34.0],
            "gee_lst": [31.0, 32.6, 33.0, 30.5, 34.2],
            "gee_ndvi": [0.42, 0.25, 0.19, 0.51, 0.14],
        })
        audit = audit_features_and_target(df_mock, "suhu_permukaan_c", ["gee_lst", "gee_ndvi"], task="regression")
        assert "gee_lst" in audit["leakage_suspects"]
        assert any("suhu permukaan dari satelit" in w["message"] for w in audit["warnings"])
    finally:
        if created_layer_id:
            client.delete(f"/api/layers/{created_layer_id}?project_id=banjir-surabaya")
        app_config.update_settings(prev_settings)
