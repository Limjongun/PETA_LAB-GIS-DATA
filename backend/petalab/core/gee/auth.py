"""
Credential Storage, Security Guard, & Lazy Initialization for Google Earth Engine (§3 & §5).
HARD SECURITY RULE:
- Credentials are stored ONLY in `<workspace>/credentials/` (OUTSIDE `<workspace>/projects/`).
- Files are created with `os.chmod(path, 0o600)` immediately after writing.
- Tokens are NEVER returned to the frontend or written to logs.
"""

import importlib.util
import json
import os
from pathlib import Path
import shutil
import stat
from typing import Any

from petalab.config import config
from petalab.core.gee.errors import redact, to_user_error
from petalab.db.repo import utc_now_iso
from petalab.errors import PetaLabError


def get_credentials_dir() -> Path:
    cdir = config.workspace_dir / "credentials"
    cdir.mkdir(parents=True, exist_ok=True)
    try:
        os.chmod(cdir, 0o700)
    except Exception:
        pass
    return cdir


def get_cache_dir() -> Path:
    cache_dir = config.workspace_dir / "cache" / "gee"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir


def is_ee_package_installed() -> bool:
    return importlib.util.find_spec("ee") is not None


def _write_secure_credential_file(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    try:
        os.chmod(path, stat.S_IRUSR | stat.S_IWUSR)  # 0o600
    except Exception:
        pass


def get_status() -> dict[str, Any]:
    """Returns safe public GEE connection & cache status (never exposes tokens or private keys)."""
    cdir = get_credentials_dir()
    oauth_file = cdir / "gee_oauth.json"
    sa_file = cdir / "gee_service_account.json"
    installed = is_ee_package_installed()

    connected = False
    auth_mode = None
    email = None
    project_id = config.get_settings().get("gee_project_id", "")
    tier = "Community (Akademik & Riset Nonkomersial)"
    engine_mode = "not_connected"

    active_file = sa_file if sa_file.exists() else (oauth_file if oauth_file.exists() else None)
    if active_file is not None:
        try:
            data = json.loads(active_file.read_text(encoding="utf-8"))
            connected = True
            auth_mode = data.get("auth_mode", "oauth")
            email = data.get("email", "peneliti@akademik.ac.id")
            project_id = data.get("project_id") or project_id
            tier = data.get("tier", tier)
            engine_mode = data.get("engine_mode", "live" if installed else "local_ academic_engine")
        except Exception:
            connected = False

    cache_dir = get_cache_dir()
    cache_files = [f for f in cache_dir.rglob("*") if f.is_file()]
    cache_bytes = sum(f.stat().st_size for f in cache_files)
    cache_entries = len([d for d in cache_dir.iterdir() if d.is_dir()]) if cache_dir.exists() else 0

    return {
        "package_installed": installed,
        "connected": connected,
        "auth_mode": auth_mode,
        "email": email,
        "project_id": project_id,
        "tier": tier,
        "engine_mode": engine_mode,
        "cache_bytes": cache_bytes,
        "cache_entries": cache_entries,
        "credentials_isolated_outside_projects": not str(cdir.resolve()).startswith(
            str((config.workspace_dir / "projects").resolve())
        ),
        "quota_url": "https://console.cloud.google.com/iam-admin/quotas",
        "signup_url": "https://code.earthengine.google.com/register",
    }


def connect_account(
    project_id: str,
    auth_mode: str = "oauth",
    email: str | None = None,
    service_account_json: dict[str, Any] | str | None = None,
) -> dict[str, Any]:
    """
    Connects Google Earth Engine account via OAuth or Service Account JSON.
    Stores credential metadata strictly in `<workspace>/credentials/` with 0600 permissions.
    """
    pid = (project_id or "").strip()
    if not pid:
        raise PetaLabError(
            "GEE_NOT_REGISTERED",
            message="Masukkan ID Project Google Cloud terlebih dahulu (contoh: petalab-riset-2026).",
        )

    cdir = get_credentials_dir()
    installed = is_ee_package_installed()
    engine_mode = "local_academic_engine"

    if auth_mode == "service_account" and service_account_json:
        if isinstance(service_account_json, str):
            try:
                sa_data = json.loads(service_account_json)
            except Exception as e:
                raise PetaLabError("GEE_INVALID_SA", f"Format file JSON Service Account tidak valid: {e}")
        else:
            sa_data = dict(service_account_json)

        sa_email = sa_data.get("client_email") or email or f"service-account@{pid}.iam.gserviceaccount.com"
        if installed and "private_key" in sa_data:
            try:
                import ee
                creds = ee.ServiceAccountCredentials(sa_email, key_data=json.dumps(sa_data))
                ee.Initialize(credentials=creds, project=pid)
                engine_mode = "live_ee"
            except Exception:
                engine_mode = "local_academic_engine"

        target_file = cdir / "gee_service_account.json"
        _write_secure_credential_file(
            target_file,
            {
                "auth_mode": "service_account",
                "project_id": pid,
                "email": sa_email,
                "tier": "Contributor / Service Account",
                "engine_mode": engine_mode,
                "connected_at": utc_now_iso(),
                "private_key_redacted": True,
            },
        )
    else:
        user_email = (email or "").strip() or f"peneliti@{pid}.ac.id"
        if installed:
            try:
                import ee
                ee.Initialize(project=pid)
                engine_mode = "live_ee"
            except Exception:
                engine_mode = "local_academic_engine"

        target_file = cdir / "gee_oauth.json"
        _write_secure_credential_file(
            target_file,
            {
                "auth_mode": "oauth",
                "project_id": pid,
                "email": user_email,
                "tier": "Community (Akademik Nonkomersial)",
                "engine_mode": engine_mode,
                "connected_at": utc_now_iso(),
            },
        )

    # Save non-secret project_id in settings.json
    config.update_settings({"gee_project_id": pid})
    return get_status()


def disconnect_account() -> dict[str, Any]:
    """Physically deletes credential files from `<workspace>/credentials/` (§5.3)."""
    cdir = get_credentials_dir()
    for fname in ("gee_oauth.json", "gee_service_account.json"):
        fpath = cdir / fname
        if fpath.exists():
            try:
                fpath.unlink()
            except Exception:
                pass
    return get_status()


def ensure_initialized() -> dict[str, Any]:
    st = get_status()
    if not st["connected"]:
        raise PetaLabError("GEE_NOT_CONNECTED")
    return st


def test_connection(project_id: str | None = None) -> dict[str, Any]:
    st = get_status()
    pid = project_id or st.get("project_id")
    if not pid:
        raise PetaLabError(
            "GEE_NOT_REGISTERED",
            message="Isi ID Project Google Cloud terlebih dahulu sebelum menguji koneksi.",
        )
    if is_ee_package_installed():
        try:
            import ee
            ee.Initialize(project=pid)
            # Mark active session as live_ee if credentials worked!
            cdir = get_credentials_dir()
            oauth_file = cdir / "gee_oauth.json"
            if oauth_file.exists():
                d = json.loads(oauth_file.read_text(encoding="utf-8"))
                d["engine_mode"] = "live_ee"
                d["project_id"] = pid
                _write_secure_credential_file(oauth_file, d)
            info = ee.Image("USGS/SRTMGL1_003").getInfo()
            return {
                "ok": True,
                "mode": "live_ee",
                "project_id": pid,
                "message": f"Terhubung LIVE langsung ke server Google Earth Engine (Project: {pid}).",
                "sample_asset": info.get("id", "USGS/SRTMGL1_003"),
            }
        except Exception as e:
            err = to_user_error(e)
            return {
                "ok": False,
                "mode": "needs_oauth",
                "project_id": pid,
                "error": err,
                "message": (
                    f"Paket earthengine-api terpasang untuk Project '{pid}', namun login OAuth Google belum selesai. "
                    "Klik 'Login Akun Google (OAuth)' atau jalankan `earthengine authenticate`."
                ),
            }

    return {
        "ok": True,
        "mode": "local_academic_engine",
        "project_id": pid,
        "message": (
            f"Koneksi Katalog Bumi aktif untuk Project '{pid}' (Mode Engine Lokal). "
            "Pasang `earthengine-api` dan login OAuth Google untuk menarik citra live dari server Google."
        ),
    }


def has_live_ee_ready() -> tuple[bool, str]:
    """Checks if `earthengine-api` is installed and initialized with real Google OAuth credentials."""
    st = get_status()
    pid = st.get("project_id") or config.get_settings().get("gee_project_id") or ""
    if not pid or not is_ee_package_installed():
        return False, pid
    try:
        import ee
        ee.Initialize(project=pid)
        return True, pid
    except Exception:
        return False, pid


def clear_gee_cache() -> dict[str, Any]:
    cache_dir = get_cache_dir()
    if cache_dir.exists():
        shutil.rmtree(cache_dir, ignore_errors=True)
    cache_dir.mkdir(parents=True, exist_ok=True)
    return {"cleared": True, "cache_bytes": 0}
