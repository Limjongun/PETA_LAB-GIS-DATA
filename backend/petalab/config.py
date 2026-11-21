import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import secrets
from typing import Any

DEFAULT_WORKSPACE = Path(os.environ.get("PETALAB_WORKSPACE", Path(__file__).resolve().parents[2] / "workspace"))


class AppConfig:
    def __init__(self, workspace_dir: Path | None = None):
        self.workspace_dir: Path = (workspace_dir or DEFAULT_WORKSPACE).resolve()
        self.host: str = os.environ.get("PETALAB_HOST", "127.0.0.1")
        self.port: int = int(os.environ.get("PETALAB_PORT", "8765"))
        self.session_token: str = os.environ.get("PETALAB_TOKEN", secrets.token_urlsafe(24))
        self.max_upload_mb: int = 500
        self.max_workers: int = min(4, max(1, (os.cpu_count() or 2) - 1))
        self.ensure_dirs()
        self._setup_logging()

    def ensure_dirs(self) -> None:
        self.workspace_dir.mkdir(parents=True, exist_ok=True)
        (self.workspace_dir / "logs").mkdir(parents=True, exist_ok=True)
        (self.workspace_dir / "projects").mkdir(parents=True, exist_ok=True)
        (self.workspace_dir / "plugins").mkdir(parents=True, exist_ok=True)
        settings_path = self.workspace_dir / "settings.json"
        if not settings_path.exists():
            default_settings = {
                "language": "id",
                "theme": "light",
                "mode": "pemula",
                "unit": "metric",
                "number_format": "id-ID",
                "default_crs": "EPSG:4326",
                "basemap": "osm_standard",
                "custom_tile_url": "",
                "offline_mode": False,
                "max_workers": self.max_workers,
                "ram_limit_mb": 4096,
                "use_gpu": False,
                "allow_lan": False,
            }
            settings_path.write_text(json.dumps(default_settings, indent=2), encoding="utf-8")

    def _setup_logging(self) -> None:
        log_file = self.workspace_dir / "logs" / "petalab.log"
        logger = logging.getLogger("petalab")
        if not logger.handlers:
            logger.setLevel(logging.INFO)
            handler = RotatingFileHandler(log_file, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8")
            formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
            handler.setFormatter(formatter)
            logger.addHandler(handler)

    def get_settings(self) -> dict[str, Any]:
        settings_path = self.workspace_dir / "settings.json"
        if settings_path.exists():
            try:
                return json.loads(settings_path.read_text(encoding="utf-8"))
            except Exception:
                pass
        return {"language": "id", "theme": "light", "mode": "pemula", "default_crs": "EPSG:4326"}

    def update_settings(self, updates: dict[str, Any]) -> dict[str, Any]:
        current = self.get_settings()
        current.update(updates)
        settings_path = self.workspace_dir / "settings.json"
        tmp = settings_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(current, indent=2), encoding="utf-8")
        os.replace(tmp, settings_path)
        return current

    def safe_resolve(self, relative_or_child: str | Path, base: Path | None = None) -> Path:
        root = (base or self.workspace_dir).resolve()
        target = (root / relative_or_child).resolve()
        if not str(target).startswith(str(root)):
            raise ValueError(f"Akses path di luar workspace ditolak: {relative_or_child}")
        return target


config = AppConfig()
