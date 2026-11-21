"""
Prediction & Jupyter Notebook Exporter for trained PetaLab Spatial ML models.
Supports predicting onto any vector layer or raster layer (windowed block-by-block),
and generating a clean `.ipynb` Jupyter Notebook reproducing the workflow.
"""

import json
from pathlib import Path
from typing import Any

import geopandas as gpd
import joblib
import numpy as np
import pandas as pd

from petalab.core.io_raster import RasterDataset, load_raster_dataset
from petalab.core.io_vector import load_working_layer
from petalab.db.repo import repo
from petalab.errors import PetaLabError
from petalab.jobs.context import JobContext


def predict_with_model(
    model_id: str,
    target_layer_id: str,
    output_name: str | None,
    ctx: JobContext,
) -> dict[str, Any]:
    project_id = ctx.project_id
    pdir = repo.get_project_dir(project_id)
    model_info = repo.get_model(project_id, model_id)
    target_meta = repo.get_layer(project_id, target_layer_id)
    pipe_or_bundle = joblib.load(pdir / model_info["path"])
    card = model_info.get("card", {})
    feature_cols: list[str] = card.get("feature_columns", [])

    if target_meta["kind"] == "raster":
        ds = load_raster_dataset(pdir / target_meta["path"])
        ctx.progress(45, "Menjalankan prediksi model per blok piksel raster")
        flat = np.nan_to_num(ds.data.reshape(ds.count, -1).T, nan=0.0)
        if isinstance(pipe_or_bundle, dict) and "model" in pipe_or_bundle:
            clf = pipe_or_bundle["model"]
            c2i = pipe_or_bundle.get("class_to_int", {})
            raw_preds = clf.predict(flat[:, : len(feature_cols)])
            pred_arr = np.array([c2i.get(v, 1) for v in raw_preds], dtype=np.float32).reshape(ds.height, ds.width)
        else:
            df_in = pd.DataFrame(flat[:, : len(feature_cols)], columns=feature_cols[: ds.count])
            for missing_c in feature_cols:
                if missing_c not in df_in.columns:
                    df_in[missing_c] = 0.0
            preds = pipe_or_bundle.predict(df_in[feature_cols])
            pred_arr = np.asarray(preds, dtype=np.float32).reshape(ds.height, ds.width)

        out_ds = RasterDataset(
            data=pred_arr[np.newaxis, :, :],
            bbox=ds.bbox,
            crs=ds.crs,
            nodata=ds.nodata,
            band_names=[f"Prediksi_{model_info['name']}"],
        )
        return ctx.save_raster(out_ds, name=output_name or f"pred_{target_meta['name']}")

    # Vector prediction
    gdf = load_working_layer(pdir / target_meta["path"]).copy()
    ctx.progress(45, f"Menjalankan prediksi model '{model_info['name']}' pada {len(gdf)} fitur")
    for fc in feature_cols:
        if fc not in gdf.columns:
            gdf[fc] = 0.0

    X = gdf[feature_cols]
    if isinstance(pipe_or_bundle, dict) and "model" in pipe_or_bundle:
        X_num = X.apply(pd.to_numeric, errors="coerce")
        X_sc = pipe_or_bundle["scaler"].transform(pipe_or_bundle["imputer"].transform(X_num))
        preds = pipe_or_bundle["model"].predict(X_sc)
        gdf["prediksi_klaster"] = [f"Kelompok {int(p) + 1}" for p in preds]
        col_out = "prediksi_klaster"
        style_ov = {"mode": "category", "column": col_out}
    else:
        preds = pipe_or_bundle.predict(X)
        col_out = f"pred_{card.get('target_column', 'nilai')}"
        if model_info["task"] == "regression":
            gdf[col_out] = np.round(np.asarray(preds, dtype=float), 4)
            style_ov = {"mode": "choropleth", "column": col_out, "palette": "viridis"}
        else:
            gdf[col_out] = [str(p) for p in preds]
            style_ov = {"mode": "category", "column": col_out}

    return ctx.save_layer(
        gdf,
        name=output_name or f"{target_meta['name']}_prediksi",
        style_overrides=style_ov,
    )


def export_model_notebook(project_id: str, model_id: str) -> dict[str, Any]:
    """Generates a ready-to-run Jupyter Notebook (.ipynb) for the trained model."""
    pdir = repo.get_project_dir(project_id)
    model_info = repo.get_model(project_id, model_id)
    card = model_info.get("card", {})
    metrics = model_info.get("metrics", {})
    feat_list = card.get("feature_columns", [])
    target_col = card.get("target_column", "target")

    nb = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {"display_name": "Python 3 (PetaLab)", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.11"},
        },
        "cells": [
            {
                "cell_type": "markdown",
                "metadata": {},
                "source": [
                    f"# Notebook Reproduksi Model Spasial — **{model_info['name']}**\n",
                    f"*Diekspor otomatis dari **PetaLab GIS Web** · Tugas: `{model_info['task']}` · Algoritma: `{model_info['algorithm']}`*\n\n",
                    f"> **Rapor Model:** {metrics.get('narrative', '')}\n",
                ],
            },
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": [
                    "import geopandas as gpd\n",
                    "import pandas as pd\n",
                    "import joblib\n",
                    "from sklearn.model_selection import cross_validate\n\n",
                    f'# 1. Muat layer data latih dan model tersimpan\n',
                    f'gdf = gpd.read_parquet("../layers/{card.get("train_layer_name", "kecamatan_surabaya")}.parquet")\n',
                    f'pipeline = joblib.load("../{model_info["path"]}")\n',
                    f'features = {json.dumps(feat_list)}\n',
                    f'target = "{target_col}"\n',
                    "gdf[features + [target]].head()",
                ],
            },
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": [
                    "# 2. Jalankan prediksi dan tampilkan peta hasil\n",
                    "X = gdf[features]\n",
                    'gdf["prediksi"] = pipeline.predict(X)\n',
                    'gdf.plot(column="prediksi", legend=True, cmap="viridis", figsize=(9, 6))',
                ],
            },
        ],
    }
    nb_path = pdir / "exports" / f"{model_info['name'].replace(' ', '_')}_notebook.ipynb"
    nb_path.parent.mkdir(parents=True, exist_ok=True)
    nb_path.write_text(json.dumps(nb, indent=2), encoding="utf-8")
    return {"path": str(nb_path), "filename": nb_path.name, "notebook": nb}
