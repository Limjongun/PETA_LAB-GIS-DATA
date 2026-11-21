import asyncio
from datetime import datetime, timezone
import traceback
from typing import Any, Callable
import uuid

import geopandas as gpd

from petalab.core.crs import from_metric_crs, to_metric_crs
from petalab.core.io_raster import RasterDataset, default_style_for_raster, load_raster_dataset, save_raster_dataset
from petalab.core.io_vector import default_style_for_geom, load_working_layer, save_working_layer
from petalab.db.repo import repo, slugify, utc_now_iso
from petalab.errors import PetaLabError


class JobCancelledError(Exception):
    pass


class JobContext:
    """
    Execution context passed to every geoprocessing tool and ML training job.
    Provides progress reporting, logging, cancellation checks, automatic UTM metric CRS
    conversion, and non-destructive layer loading/saving with lineage recording.
    """

    def __init__(
        self,
        job_id: str,
        project_id: str,
        tool_id: str,
        tool_name: str,
        params: dict[str, Any],
        selected_fids_by_layer: dict[str, list[int]] | None = None,
        on_update: Callable[[dict[str, Any]], None] | None = None,
        preview_mode: bool = False,
        preview_limit: int = 500,
    ):
        self.job_id = job_id
        self.project_id = project_id
        self.tool_id = tool_id
        self.tool_name = tool_name
        self.params = params
        self.selected_fids_by_layer = selected_fids_by_layer or {}
        self.on_update = on_update
        self.preview_mode = preview_mode
        self.preview_limit = preview_limit
        self._cancelled = False
        self.logs: list[str] = []
        self._metric_crs_cache: dict[int, Any] = {}
        self.preview_gdf: gpd.GeoDataFrame | None = None
        self.output_layers: list[dict[str, Any]] = []

    def cancel(self) -> None:
        self._cancelled = True

    def check_cancel(self) -> None:
        if self._cancelled:
            raise JobCancelledError("Proses dibatalkan oleh pengguna.")

    def progress(self, pct: float, message: str = "") -> None:
        self.check_cancel()
        if message:
            ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
            self.logs.append(f"[{ts}] ({int(pct)}%) {message}")
        if self.on_update:
            self.on_update({
                "job_id": self.job_id,
                "project_id": self.project_id,
                "tool_id": self.tool_id,
                "status": "running",
                "progress": round(float(pct), 1),
                "message": message,
                "logs": self.logs[-20:],
            })

    def log(self, message: str) -> None:
        ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
        self.logs.append(f"[{ts}] {message}")
        if self.on_update:
            self.on_update({
                "job_id": self.job_id,
                "project_id": self.project_id,
                "tool_id": self.tool_id,
                "status": "running",
                "message": message,
                "logs": self.logs[-20:],
            })

    def get_layer_meta(self, layer_ref: Any) -> dict[str, Any]:
        lid = layer_ref.id if hasattr(layer_ref, "id") else (layer_ref.get("id") if isinstance(layer_ref, dict) else str(layer_ref))
        return repo.get_layer(self.project_id, lid)

    def load_layer(self, layer_ref: Any, only_selected: bool = False) -> gpd.GeoDataFrame:
        meta = self.get_layer_meta(layer_ref)
        pdir = repo.get_project_dir(self.project_id)
        fpath = pdir / meta["path"]
        fids = self.selected_fids_by_layer.get(meta["id"]) if only_selected else None
        gdf = load_working_layer(fpath, only_selected_fids=fids)
        if not isinstance(gdf, gpd.GeoDataFrame):
            raise PetaLabError("NOT_VECTOR", f"Layer '{meta['name']}' bukan layer vektor.")
        if self.preview_mode and len(gdf) > self.preview_limit:
            gdf = gdf.head(self.preview_limit).copy()
        return gdf

    def load_raster(self, layer_ref: Any) -> RasterDataset:
        meta = self.get_layer_meta(layer_ref)
        if meta["kind"] != "raster":
            raise PetaLabError("NOT_RASTER", f"Layer '{meta['name']}' bukan layer raster.")
        pdir = repo.get_project_dir(self.project_id)
        return load_raster_dataset(pdir / meta["path"])

    def to_metric_crs(self, gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
        metric_gdf, orig_crs = to_metric_crs(gdf)
        self._metric_crs_cache[id(metric_gdf)] = orig_crs
        return metric_gdf

    def from_metric_crs(self, gdf: gpd.GeoDataFrame, like: gpd.GeoDataFrame | None = None) -> gpd.GeoDataFrame:
        target_crs = (like.crs if like is not None else None) or self._metric_crs_cache.get(id(gdf)) or "EPSG:4326"
        return from_metric_crs(gdf, target_crs)

    def save_layer(
        self,
        gdf: gpd.GeoDataFrame,
        name: str,
        style_overrides: dict[str, Any] | None = None,
        extra_info: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if self.preview_mode:
            self.preview_gdf = gdf
            return {"preview": True, "name": name, "feature_count": len(gdf)}

        pdir = repo.get_project_dir(self.project_id)
        safe_slug = slugify(name)
        rel_path = f"layers/{safe_slug}_{uuid.uuid4().hex[:6]}.parquet"
        meta = save_working_layer(gdf, pdir / rel_path)
        existing_count = len(repo.list_layers(self.project_id))
        style = default_style_for_geom(meta["geom_type"], existing_count)
        if style_overrides:
            style.update(style_overrides)

        lineage = {
            "tool": self.tool_id,
            "tool_name": self.tool_name,
            "params": self.params,
            "job_id": self.job_id,
            "created_at": utc_now_iso(),
            "extra": extra_info or {},
        }
        saved = repo.add_layer(self.project_id, {
            "name": name,
            "path": rel_path,
            **meta,
            "style": style,
            "lineage": lineage,
        })
        repo.add_history(
            self.project_id,
            action="process",
            title=f"{self.tool_name} → {name}",
            target_id=saved["id"],
            payload={"tool_id": self.tool_id, "params": self.params, "job_id": self.job_id},
            undo={"type": "delete_layer", "layer_id": saved["id"]},
        )
        self.output_layers.append(saved)
        return saved

    def save_raster(
        self,
        ds: RasterDataset,
        name: str,
        style_overrides: dict[str, Any] | None = None,
        extra_info: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if self.preview_mode:
            return {"preview": True, "name": name, "kind": "raster", "bands": ds.count}

        pdir = repo.get_project_dir(self.project_id)
        safe_slug = slugify(name)
        rel_path = f"layers/{safe_slug}_{uuid.uuid4().hex[:6]}.tif"
        meta = save_raster_dataset(ds, pdir / rel_path)
        style = default_style_for_raster(meta["raster_meta"])
        if style_overrides:
            style.update(style_overrides)

        lineage = {
            "tool": self.tool_id,
            "tool_name": self.tool_name,
            "params": self.params,
            "job_id": self.job_id,
            "created_at": utc_now_iso(),
            "extra": extra_info or {},
        }
        saved = repo.add_layer(self.project_id, {
            "name": name,
            "path": rel_path,
            **meta,
            "style": style,
            "lineage": lineage,
        })
        repo.add_history(
            self.project_id,
            action="process",
            title=f"{self.tool_name} → {name}",
            target_id=saved["id"],
            payload={"tool_id": self.tool_id, "params": self.params, "job_id": self.job_id},
            undo={"type": "delete_layer", "layer_id": saved["id"]},
        )
        self.output_layers.append(saved)
        return saved
