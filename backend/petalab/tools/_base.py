import importlib
import importlib.util
import logging
from pathlib import Path
from typing import Any, Type

from pydantic import BaseModel

from petalab.config import config
from petalab.errors import PetaLabError
from petalab.jobs.context import JobContext

logger = logging.getLogger("petalab.tools")


class LayerRef(BaseModel):
    id: str
    name: str = ""


class Tool:
    id: str = ""
    name: str = ""
    technical_name: str = ""
    group: str = "Vektor: Dasar"
    level: str = "pemula"  # pemula | menengah | lanjut
    requires: list[str] = []
    description: str = ""
    illustration: str = "point -> polygon"
    Params: Type[BaseModel] = BaseModel

    def run(self, p: Any, ctx: JobContext) -> dict[str, Any]:
        raise NotImplementedError

    def to_python(self, p: Any) -> str:
        return "# Kode Python GeoPandas"

    @classmethod
    def to_schema_dict(cls) -> dict[str, Any]:
        raw_schema = cls.Params.model_json_schema()
        fields = []
        props = raw_schema.get("properties", {})
        required = set(raw_schema.get("required", []))
        for fname, fmeta in props.items():
            fields.append({
                "name": fname,
                "title": fmeta.get("title", fname),
                "type": "layer" if (fmeta.get("$ref") or "LayerRef" in str(fmeta)) else fmeta.get("type", "string"),
                "default": fmeta.get("default"),
                "required": fname in required,
                "enum": fmeta.get("enum"),
                "geom": fmeta.get("geom"),
                "kind": fmeta.get("kind", "vector"),
                "advanced": bool(fmeta.get("advanced", False)),
                "column_of": fmeta.get("column_of"),
                "description": fmeta.get("description", ""),
            })
        return {
            "id": cls.id,
            "name": cls.name,
            "technical_name": cls.technical_name,
            "group": cls.group,
            "level": cls.level,
            "requires": getattr(cls, "requires", []),
            "description": cls.description,
            "illustration": cls.illustration,
            "fields": fields,
            "json_schema": raw_schema,
        }


TOOL_REGISTRY: dict[str, Tool] = {}


def register(cls: Type[Tool]) -> Type[Tool]:
    instance = cls()
    TOOL_REGISTRY[cls.id] = instance
    return cls


def load_all_tools() -> dict[str, Tool]:
    tools_dir = Path(__file__).parent
    for py_file in sorted(tools_dir.glob("*.py")):
        if py_file.name.startswith("_"):
            continue
        mod_name = f"petalab.tools.{py_file.stem}"
        try:
            importlib.import_module(mod_name)
        except Exception:
            logger.exception("Gagal memuat modul tool '%s'", mod_name)

    # Also auto-load custom user plugins from ~/PetaLab/plugins/*.py
    plugins_dir = config.workspace_dir / "plugins"
    if plugins_dir.exists():
        for plugin_file in sorted(plugins_dir.glob("*.py")):
            try:
                spec = importlib.util.spec_from_file_location(f"petalab_plugin_{plugin_file.stem}", plugin_file)
                if spec and spec.loader:
                    mod = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(mod)
            except Exception:
                logger.exception("Gagal memuat plugin kustom '%s'", plugin_file.name)

    return TOOL_REGISTRY


def get_tool(tool_id: str) -> Tool:
    if not TOOL_REGISTRY:
        load_all_tools()
    tool = TOOL_REGISTRY.get(tool_id)
    if not tool:
        raise PetaLabError("TOOL_NOT_FOUND", f"Tool '{tool_id}' tidak ditemukan di katalog.")
    return tool
