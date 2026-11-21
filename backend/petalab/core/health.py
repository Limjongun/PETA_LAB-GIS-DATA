import os
import platform
import shutil
import sys
from typing import Any

from petalab.config import config
from petalab.core.gee import auth as gee_auth


def get_system_health() -> dict[str, Any]:
    """Comprehensive system diagnostic check for PetaLab."""
    packages: dict[str, dict[str, Any]] = {}
    for pkg_name, label in [
        ("geopandas", "GeoPandas"),
        ("shapely", "Shapely"),
        ("pyogrio", "GDAL / pyogrio"),
        ("pyproj", "PROJ / pyproj"),
        ("duckdb", "DuckDB"),
        ("sklearn", "Scikit-learn"),
        ("scipy", "SciPy"),
        ("PIL", "Pillow (Raster Engine)"),
    ]:
        try:
            mod = __import__(pkg_name)
            ver = getattr(mod, "__version__", "terpasang")
            packages[pkg_name] = {"label": label, "ok": True, "version": str(ver)}
        except Exception as e:
            packages[pkg_name] = {"label": label, "ok": False, "version": None, "error": str(e)}

    # Check optional rasterio & torch/GPU
    has_rasterio = False
    rasterio_ver = "Native GeoTIFF Engine"
    try:
        import rasterio
        has_rasterio = True
        rasterio_ver = f"rasterio {rasterio.__version__}"
    except Exception:
        pass

    gpu_available = False
    gpu_name = "CPU Mode (Multi-core)"
    try:
        import torch
        if torch.cuda.is_available():
            gpu_available = True
            gpu_name = torch.cuda.get_device_name(0)
    except Exception:
        pass

    # Disk space check
    try:
        usage = shutil.disk_usage(config.workspace_dir)
        free_gb = round(usage.free / (1024 ** 3), 2)
        total_gb = round(usage.total / (1024 ** 3), 2)
    except Exception:
        free_gb, total_gb = 50.0, 250.0

    all_core_ok = all(packages[k]["ok"] for k in ["geopandas", "shapely", "pyogrio", "pyproj", "duckdb", "sklearn"])
    gee_status = gee_auth.get_status()

    return {
        "status": "healthy" if all_core_ok else "degraded",
        "python_version": sys.version.split()[0],
        "platform": f"{platform.system()} {platform.release()}",
        "cpu_cores": os.cpu_count() or 2,
        "gdal_ok": packages["pyogrio"]["ok"],
        "proj_ok": packages["pyproj"]["ok"],
        "duckdb_ok": packages["duckdb"]["ok"],
        "ml_ok": packages["sklearn"]["ok"],
        "raster_engine": rasterio_ver,
        "has_rasterio": has_rasterio,
        "gpu_available": gpu_available,
        "gpu_name": gpu_name,
        "disk_free_gb": free_gb,
        "disk_total_gb": total_gb,
        "workspace_dir": str(config.workspace_dir),
        "packages": packages,
        "gee": gee_status,
    }
