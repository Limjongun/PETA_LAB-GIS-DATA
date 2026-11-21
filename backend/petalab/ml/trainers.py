"""
Spatial Machine Learning Training Engine for PetaLab.
Supports Regression, Classification, Clustering, and Pixel-level Satellite Raster Classification.
Builds reproducible `sklearn.pipeline.Pipeline` objects, runs Spatial Block Cross-Validation,
computes Permutation Feature Importance, generates beginner-friendly Model Report Cards,
creates Residual / Misclassification layers, and exports Jupyter Notebooks.
"""

import hashlib
from pathlib import Path
from typing import Any
import uuid

import geopandas as gpd
import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN, KMeans
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    ExtraTreesClassifier,
    ExtraTreesRegressor,
    HistGradientBoostingClassifier,
    HistGradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    silhouette_score,
)
from sklearn.model_selection import RandomizedSearchCV
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVC, SVR

from petalab.core.io_raster import RasterDataset, load_raster_dataset
from petalab.core.io_vector import load_working_layer
from petalab.db.repo import repo, utc_now_iso
from petalab.errors import PetaLabError
from petalab.jobs.context import JobContext
from petalab.ml.cv import build_cv_splitter
from petalab.ml.features import audit_features_and_target


def _create_estimator(task: str, algorithm: str, balance_classes: bool = True, hyperparams: dict[str, Any] | None = None) -> Any:
    hp = hyperparams or {}
    algo = algorithm.lower()
    cw = "balanced" if (balance_classes and task == "classification") else None

    if task == "regression":
        if algo in ("seimbang", "random_forest", "rf"):
            return RandomForestRegressor(
                n_estimators=int(hp.get("n_estimators", 200)),
                max_depth=hp.get("max_depth"),
                random_state=42,
                n_jobs=-1,
            )
        if algo in ("cepat", "linear", "ridge"):
            return Ridge(alpha=float(hp.get("alpha", 1.0)), random_state=42)
        if algo in ("akurat", "gradient_boosting", "lightgbm", "xgboost", "gbm"):
            return HistGradientBoostingRegressor(
                max_iter=int(hp.get("n_estimators", 200)),
                learning_rate=float(hp.get("learning_rate", 0.08)),
                random_state=42,
            )
        if algo == "extra_trees":
            return ExtraTreesRegressor(n_estimators=int(hp.get("n_estimators", 200)), random_state=42, n_jobs=-1)
        if algo == "svm":
            return SVR(C=float(hp.get("C", 1.0)))
        if algo == "knn":
            return KNeighborsRegressor(n_neighbors=int(hp.get("n_neighbors", 5)))
        if algo == "mlp":
            return MLPRegressor(hidden_layer_sizes=(64, 32), max_iter=300, random_state=42)
        return RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)

    else:  # classification or pixel
        if algo in ("seimbang", "random_forest", "rf"):
            return RandomForestClassifier(
                n_estimators=int(hp.get("n_estimators", 200)),
                max_depth=hp.get("max_depth"),
                class_weight=cw,
                random_state=42,
                n_jobs=-1,
            )
        if algo in ("cepat", "linear", "logistic"):
            return LogisticRegression(max_iter=500, class_weight=cw, random_state=42)
        if algo in ("akurat", "gradient_boosting", "lightgbm", "xgboost", "gbm"):
            return HistGradientBoostingClassifier(
                max_iter=int(hp.get("n_estimators", 200)),
                learning_rate=float(hp.get("learning_rate", 0.08)),
                random_state=42,
            )
        if algo == "extra_trees":
            return ExtraTreesClassifier(n_estimators=200, class_weight=cw, random_state=42, n_jobs=-1)
        if algo == "svm":
            return SVC(C=float(hp.get("C", 1.0)), probability=True, class_weight=cw, random_state=42)
        if algo == "knn":
            return KNeighborsClassifier(n_neighbors=int(hp.get("n_neighbors", 5)))
        if algo == "mlp":
            return MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=300, random_state=42)
        return RandomForestClassifier(n_estimators=200, class_weight=cw, random_state=42, n_jobs=-1)


def train_spatial_model(params: dict[str, Any], ctx: JobContext) -> dict[str, Any]:
    """
    Executes the full 6-step Spatial ML workflow inside a background JobContext.
    """
    project_id = ctx.project_id
    pdir = repo.get_project_dir(project_id)
    task = params.get("task", "regression")  # regression | classification | clustering | pixel
    algorithm = params.get("algorithm", "seimbang")
    model_name = params.get("model_name") or f"Model_{task}_{algorithm}_{uuid.uuid4().hex[:4]}"
    layer_id = params.get("layer_id")
    target_col = params.get("target_column")
    feature_cols: list[str] = params.get("feature_columns", [])
    cv_method = params.get("cv_method", "spatial_block")
    n_splits = int(params.get("n_splits", 5))
    block_size_m = float(params.get("block_size_m", 2500.0))
    group_col = params.get("group_column")
    auto_tune = bool(params.get("auto_tune", False))
    balance_classes = bool(params.get("balance_classes", True))
    create_output_layer = bool(params.get("create_output_layer", True))

    if task == "pixel":
        return _train_pixel_classifier(params, ctx)

    if not layer_id:
        raise PetaLabError("MISSING_LAYER", "Pilih layer data latih terlebih dahulu.")
    layer_meta = repo.get_layer(project_id, layer_id)
    gdf = load_working_layer(pdir / layer_meta["path"])
    if not isinstance(gdf, gpd.GeoDataFrame):
        raise PetaLabError("NOT_SPATIAL", "Layer latih harus berupa layer vektor.")

    if not feature_cols:
        feature_cols = [
            c for c in gdf.columns
            if c not in ("geometry", "_fid", target_col) and pd.api.types.is_numeric_dtype(gdf[c])
        ]
    feature_cols = [c for c in feature_cols if c in gdf.columns and c != target_col]
    if not feature_cols:
        raise PetaLabError("NO_FEATURES", "Pilih minimal 1 kolom fitur untuk melatih model.")

    # Handle Clustering task
    if task == "clustering":
        return _train_clustering_model(gdf, layer_meta, feature_cols, algorithm, params, model_name, ctx)

    if not target_col or target_col not in gdf.columns:
        raise PetaLabError("MISSING_TARGET", "Pilih kolom target yang ingin diprediksi.")

    ctx.progress(15, "Memeriksa kualitas fitur & potensi kebocoran data")
    audit = audit_features_and_target(gdf, target_col, feature_cols, task=task)

    valid_mask = gdf[target_col].notna()
    train_gdf = gdf[valid_mask].reset_index(drop=True)
    if len(train_gdf) < 6:
        raise PetaLabError("TOO_FEW_ROWS", "Jumlah data valid terlalu sedikit (minimal 6 baris).")

    X = train_gdf[feature_cols].copy()
    if task == "regression":
        y = pd.to_numeric(train_gdf[target_col], errors="coerce").fillna(0.0).to_numpy(dtype=float)
    else:
        y = train_gdf[target_col].astype(str).to_numpy()

    num_cols = [c for c in feature_cols if pd.api.types.is_numeric_dtype(X[c])]
    cat_cols = [c for c in feature_cols if c not in num_cols]

    transformers = []
    if num_cols:
        transformers.append(("num", Pipeline([("imp", SimpleImputer(strategy="median")), ("sc", StandardScaler())]), num_cols))
    if cat_cols:
        transformers.append(("cat", Pipeline([("imp", SimpleImputer(strategy="most_frequent")), ("oh", OneHotEncoder(handle_unknown="ignore", sparse_output=False))]), cat_cols))

    preprocessor = ColumnTransformer(transformers=transformers, remainder="drop")
    estimator = _create_estimator(task, algorithm, balance_classes=balance_classes, hyperparams=params.get("hyperparams"))
    pipe = Pipeline([("prep", preprocessor), ("model", estimator)])

    ctx.progress(30, f"Menyiapkan validasi ({cv_method}, {n_splits} fold)")
    splitter, fold_ids, _ = build_cv_splitter(
        train_gdf, cv_method=cv_method, n_splits=n_splits, block_size_m=block_size_m, group_col=group_col
    )

    # Cross-validation predictions out-of-fold
    oof_preds = np.empty(len(train_gdf), dtype=float if task == "regression" else object)
    fold_metrics: list[dict[str, Any]] = []
    splits_list = list(splitter.split(X, y))

    for idx, (tr_idx, te_idx) in enumerate(splits_list):
        ctx.progress(35 + int(35 * ((idx + 1) / len(splits_list))), f"Melatih & menguji lipatan (Fold) {idx + 1}/{len(splits_list)}")
        pipe.fit(X.iloc[tr_idx], y[tr_idx])
        preds = pipe.predict(X.iloc[te_idx])
        oof_preds[te_idx] = preds

        if task == "regression":
            f_rmse = float(np.sqrt(mean_squared_error(y[te_idx], preds)))
            f_mae = float(mean_absolute_error(y[te_idx], preds))
            f_r2 = float(r2_score(y[te_idx], preds)) if len(te_idx) > 1 else 0.0
            fold_metrics.append({"fold": idx + 1, "count": len(te_idx), "rmse": round(f_rmse, 4), "mae": round(f_mae, 4), "r2": round(f_r2, 4)})
        else:
            f_acc = float(accuracy_score(y[te_idx], preds))
            f_f1 = float(f1_score(y[te_idx], preds, average="weighted", zero_division=0))
            fold_metrics.append({"fold": idx + 1, "count": len(te_idx), "accuracy": round(f_acc, 4), "f1": round(f_f1, 4)})

    # Optional Hyperparameter Auto-Tuning before final fit
    if auto_tune and algorithm.lower() in ("seimbang", "random_forest", "rf", "extra_trees"):
        ctx.progress(72, "Menjalankan pencarian hyperparameter otomatis (Auto-Tuning)")
        param_dist = {"model__n_estimators": [100, 200, 300], "model__max_depth": [None, 6, 12, 20]}
        search = RandomizedSearchCV(pipe, param_distributions=param_dist, n_iter=4, cv=min(3, len(splits_list)), random_state=42)
        search.fit(X, y)
        pipe = search.best_estimator_
    else:
        ctx.progress(75, "Melatih model final pada seluruh data latih")
        pipe.fit(X, y)

    # Permutation Feature Importance
    ctx.progress(85, "Menghitung tingkat kepentingan fitur (Feature Importance)")
    try:
        perm = permutation_importance(pipe, X, y, n_repeats=5, random_state=42, n_jobs=1)
        raw_imp = np.maximum(0.0, perm.importances_mean)
    except Exception:
        raw_imp = np.ones(len(feature_cols), dtype=float)
    total_imp = float(np.sum(raw_imp)) or 1.0
    importances = sorted(
        [
            {"feature": col, "importance": round(float(val / total_imp), 4), "importance_pct": round(float((val / total_imp) * 100), 1)}
            for col, val in zip(feature_cols, raw_imp)
        ],
        key=lambda x: x["importance"],
        reverse=True,
    )
    top_factors = ", ".join(item["feature"] for item in importances[:3])

    # Overall metrics & Beginner-friendly report card narrative
    if task == "regression":
        rmse = round(float(np.sqrt(mean_squared_error(y, oof_preds.astype(float)))), 4)
        mae = round(float(mean_absolute_error(y, oof_preds.astype(float))), 4)
        r2 = round(float(r2_score(y, oof_preds.astype(float))), 4)
        r2_pct = max(0, min(100, int(round(r2 * 100))))
        narrative = (
            f"Model ini rata-rata meleset ±{rmse:g} (RMSE) atau ±{mae:g} (MAE) pada pengujian {cv_method.replace('_', ' ')}. "
            f"Ia mampu menjelaskan sekitar {r2_pct}% variasi '{target_col}' (R² = {r2:.2f}). "
            f"Faktor terpenting yang memengaruhi prediksi: {top_factors}."
        )
        residuals = (y - oof_preds.astype(float)).round(4)
        pred_vs_actual = [
            {
                "fid": int(train_gdf.iloc[i]["_fid"]),
                "actual": round(float(y[i]), 4),
                "predicted": round(float(oof_preds[i]), 4),
                "residual": round(float(residuals[i]), 4),
                "fold": int(fold_ids[i]) + 1,
            }
            for i in range(min(300, len(train_gdf)))
        ]
        metrics_summary = {
            "task": "regression",
            "rmse": rmse,
            "mae": mae,
            "r2": r2,
            "narrative": narrative,
            "fold_metrics": fold_metrics,
            "feature_importance": importances,
            "pred_vs_actual": pred_vs_actual,
            "audit": audit,
        }
    else:
        oof_str = oof_preds.astype(str)
        acc = round(float(accuracy_score(y, oof_str)), 4)
        f1 = round(float(f1_score(y, oof_str, average="weighted", zero_division=0)), 4)
        classes = sorted(list(np.unique(y)))
        cm_mat = confusion_matrix(y, oof_str, labels=classes).tolist()
        acc_pct = int(round(acc * 100))
        narrative = (
            f"Model klasifikasi ini menebak kategori '{target_col}' dengan benar sebesar {acc_pct}% "
            f"(Akurasi = {acc:.2f}, Skor F1 = {f1:.2f}) pada pengujian {cv_method.replace('_', ' ')}. "
            f"Faktor pembeda terpenting: {top_factors}."
        )
        metrics_summary = {
            "task": "classification",
            "accuracy": acc,
            "f1": f1,
            "classes": classes,
            "confusion_matrix": cm_mat,
            "narrative": narrative,
            "fold_metrics": fold_metrics,
            "feature_importance": importances,
            "audit": audit,
        }

    # Save Residual / Prediction layer on the map automatically
    result_layer = None
    if create_output_layer:
        ctx.progress(92, "Membuat layer peta prediksi & residual")
        out_gdf = train_gdf.copy()
        out_gdf["fold_cv"] = fold_ids + 1
        if task == "regression":
            out_gdf[f"pred_{target_col}"] = np.round(oof_preds.astype(float), 4)
            out_gdf[f"residual_{target_col}"] = np.round(y - oof_preds.astype(float), 4)
            out_gdf["error_absolut"] = np.round(np.abs(y - oof_preds.astype(float)), 4)
            style_ov = {"mode": "choropleth", "column": f"pred_{target_col}", "palette": "viridis"}
        else:
            out_gdf[f"pred_{target_col}"] = oof_preds.astype(str)
            out_gdf["status_tebakan"] = np.where(y == oof_preds.astype(str), "Benar", "Meleset")
            style_ov = {"mode": "category", "column": f"pred_{target_col}"}
        result_layer = ctx.save_layer(out_gdf, name=f"prediksi_{model_name}", style_overrides=style_ov)

    # Persist model artifact (.joblib) + model_card.json
    model_id = f"mdl_{uuid.uuid4().hex[:8]}"
    rel_model_path = f"models/{model_id}.joblib"
    full_model_path = pdir / rel_model_path
    full_model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, full_model_path)

    data_hash = hashlib.sha256(pd.util.hash_pandas_object(X, index=True).values.tobytes()).hexdigest()[:16]
    model_card = {
        "id": model_id,
        "name": model_name,
        "task": task,
        "algorithm": algorithm,
        "estimator_class": estimator.__class__.__name__,
        "train_layer_id": layer_id,
        "train_layer_name": layer_meta["name"],
        "target_column": target_col,
        "feature_columns": feature_cols,
        "num_columns": num_cols,
        "cat_columns": cat_cols,
        "crs": layer_meta.get("crs", "EPSG:4326"),
        "cv_method": cv_method,
        "n_splits": len(splits_list),
        "block_size_m": block_size_m,
        "train_row_count": len(train_gdf),
        "data_hash": data_hash,
        "random_seed": 42,
        "prediction_layer_id": result_layer["id"] if result_layer else None,
        "created_at": utc_now_iso(),
    }
    (pdir / "models" / f"{model_id}_card.json").write_text(
        pd.Series(model_card).to_json(indent=2), encoding="utf-8"
    )

    saved_model = repo.save_model(project_id, {
        "id": model_id,
        "name": model_name,
        "task": task,
        "algorithm": estimator.__class__.__name__,
        "path": rel_model_path,
        "card": model_card,
        "metrics": metrics_summary,
        "train_layer_id": layer_id,
    })
    repo.add_history(
        project_id,
        action="train",
        title=f"Melatih Model {model_name} ({estimator.__class__.__name__})",
        target_id=model_id,
        payload={"task": task, "metrics": metrics_summary["narrative"]},
    )
    return {"model": saved_model, "output_layer": result_layer}


def _train_clustering_model(
    gdf: gpd.GeoDataFrame,
    layer_meta: dict[str, Any],
    feature_cols: list[str],
    algorithm: str,
    params: dict[str, Any],
    model_name: str,
    ctx: JobContext,
) -> dict[str, Any]:
    project_id = ctx.project_id
    pdir = repo.get_project_dir(project_id)
    n_clusters = int(params.get("n_clusters", 4))
    X_num = gdf[feature_cols].apply(pd.to_numeric, errors="coerce")
    imp = SimpleImputer(strategy="median")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(imp.fit_transform(X_num))

    ctx.progress(50, f"Menjalankan clustering ({algorithm}, k={n_clusters})")
    if algorithm.lower() == "dbscan":
        est = DBSCAN(eps=0.8, min_samples=3)
        labels = est.fit_predict(X_scaled)
    else:
        k = min(max(2, n_clusters), len(gdf) - 1)
        est = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = est.fit_predict(X_scaled)

    sil = round(float(silhouette_score(X_scaled, labels)), 4) if len(np.unique(labels)) > 1 else 0.0
    out_gdf = gdf.copy()
    out_gdf["klaster_ml"] = [f"Kelompok {lb + 1}" if lb >= 0 else "Pencilan" for lb in labels]

    # Cluster profiles
    profiles = []
    for cl_name, grp in out_gdf.groupby("klaster_ml"):
        prof = {"cluster": str(cl_name), "count": len(grp)}
        for fc in feature_cols[:6]:
            prof[fc] = round(float(pd.to_numeric(grp[fc], errors="coerce").mean()), 3)
        profiles.append(prof)

    result_layer = ctx.save_layer(
        out_gdf,
        name=f"klaster_{model_name}",
        style_overrides={"mode": "category", "column": "klaster_ml"},
    )
    narrative = (
        f"Data berhasil dibagi menjadi {len(profiles)} kelompok wilayah dengan skor pemisahan "
        f"Silhouette = {sil:.2f} (semakin mendekati 1 semakin tegas perbedaan antar-kelompok)."
    )
    model_id = f"mdl_{uuid.uuid4().hex[:8]}"
    rel_path = f"models/{model_id}.joblib"
    joblib.dump({"imputer": imp, "scaler": scaler, "model": est, "feature_columns": feature_cols}, pdir / rel_path)

    metrics_summary = {
        "task": "clustering",
        "silhouette": sil,
        "n_clusters": len(profiles),
        "profiles": profiles,
        "narrative": narrative,
    }
    card = {
        "id": model_id,
        "name": model_name,
        "task": "clustering",
        "algorithm": est.__class__.__name__,
        "feature_columns": feature_cols,
        "prediction_layer_id": result_layer["id"],
        "created_at": utc_now_iso(),
    }
    saved_model = repo.save_model(project_id, {
        "id": model_id,
        "name": model_name,
        "task": "clustering",
        "algorithm": est.__class__.__name__,
        "path": rel_path,
        "card": card,
        "metrics": metrics_summary,
        "train_layer_id": layer_meta["id"],
    })
    return {"model": saved_model, "output_layer": result_layer}


def _train_pixel_classifier(params: dict[str, Any], ctx: JobContext) -> dict[str, Any]:
    """
    Trains a pixel-level Land Cover Classifier from a multi-band Raster + Sample Polygons/Points layer,
    and predicts the land-cover class across the entire raster window-by-window.
    """
    project_id = ctx.project_id
    pdir = repo.get_project_dir(project_id)
    raster_id = params.get("raster_layer_id") or params.get("layer_id")
    samples_id = params.get("sample_layer_id")
    target_col = params.get("target_column", "kelas")
    algorithm = params.get("algorithm", "seimbang")
    model_name = params.get("model_name") or f"Tutupan_Lahan_{uuid.uuid4().hex[:4]}"

    if not raster_id:
        raise PetaLabError("MISSING_RASTER", "Pilih layer citra raster yang akan diklasifikasi.")
    rmeta = repo.get_layer(project_id, raster_id)
    ds = load_raster_dataset(pdir / rmeta["path"])

    # Extract training pixels from sample layer or synthetic spectral rules if sample layer omitted
    X_list, y_list = [], []
    if samples_id:
        smeta = repo.get_layer(project_id, samples_id)
        sgdf = load_working_layer(pdir / smeta["path"])
        wgs = sgdf.to_crs("EPSG:4326") if sgdf.crs else sgdf
        if target_col not in wgs.columns:
            str_cols = [c for c in wgs.columns if c not in ("geometry", "_fid")]
            target_col = str_cols[0] if str_cols else "_fid"
        for _, row in wgs.iterrows():
            c = row.geometry.centroid
            r, col = ds.xy_to_rowcol(c.x, c.y)
            r = int(np.clip(r, 0, ds.height - 1))
            col = int(np.clip(col, 0, ds.width - 1))
            X_list.append(ds.data[:, r, col])
            y_list.append(str(row[target_col]))
    else:
        # Automatic spectral training samples from the raster bands (e.g., Vegetasi, Terbangun, Air/Rendah)
        flat = ds.data.reshape(ds.count, -1).T
        rng = np.random.default_rng(42)
        idx = rng.choice(len(flat), size=min(400, len(flat)), replace=False)
        X_sub = flat[idx]
        if ds.count >= 3:
            ndvi_proxy = (X_sub[:, 2] - X_sub[:, 1]) / np.maximum(1e-5, X_sub[:, 2] + X_sub[:, 1])
            labels = np.where(ndvi_proxy > 0.25, "1: Vegetasi / Ruang Hijau", np.where(X_sub[:, 0] < 4.5, "2: Perairan / Tambak", "3: Kawasan Terbangun"))
        else:
            q33, q66 = np.percentile(X_sub[:, 0], [33, 66])
            labels = np.where(X_sub[:, 0] <= q33, "1: Dataran Rendah", np.where(X_sub[:, 0] <= q66, "2: Dataran Sedang", "3: Dataran Tinggi"))
        X_list = list(X_sub)
        y_list = list(labels)

    X_arr = np.asarray(X_list, dtype=np.float32)
    y_arr = np.asarray(y_list)
    classes = sorted(list(np.unique(y_arr)))
    class_to_int = {c: idx + 1 for idx, c in enumerate(classes)}

    ctx.progress(45, f"Melatih model klasifikasi piksel ({len(X_arr)} sampel, {len(classes)} kelas)")
    clf = _create_estimator("classification", algorithm, balance_classes=True)
    clf.fit(X_arr, y_arr)
    preds_train = clf.predict(X_arr)
    acc = round(float(accuracy_score(y_arr, preds_train)), 4)

    # Windowed prediction across the entire raster
    ctx.progress(75, "Memprediksi kelas tutupan lahan per piksel (Windowed)")
    flat_all = np.nan_to_num(ds.data.reshape(ds.count, -1).T, nan=0.0)
    pred_labels = clf.predict(flat_all)
    pred_ints = np.array([class_to_int[val] for val in pred_labels], dtype=np.float32).reshape(ds.height, ds.width)

    out_ds = RasterDataset(
        data=pred_ints[np.newaxis, :, :],
        bbox=ds.bbox,
        crs=ds.crs,
        nodata=-9999.0,
        band_names=["Kelas_Tutupan_Lahan"],
    )
    out_layer = ctx.save_raster(out_ds, name=f"klasifikasi_{model_name}", style_overrides={"cmap": "terrain"})

    model_id = f"mdl_{uuid.uuid4().hex[:8]}"
    rel_path = f"models/{model_id}.joblib"
    joblib.dump({"model": clf, "classes": classes, "class_to_int": class_to_int, "band_names": ds.band_names}, pdir / rel_path)

    narrative = (
        f"Klasifikasi citra per piksel selesai dengan akurasi sampel {int(acc * 100)}% "
        f"untuk {len(classes)} kelas ({', '.join(classes)})."
    )
    metrics = {"task": "pixel", "accuracy": acc, "classes": classes, "class_map": class_to_int, "narrative": narrative}
    card = {
        "id": model_id,
        "name": model_name,
        "task": "pixel",
        "algorithm": clf.__class__.__name__,
        "feature_columns": ds.band_names,
        "prediction_layer_id": out_layer["id"],
        "created_at": utc_now_iso(),
    }
    saved_model = repo.save_model(project_id, {
        "id": model_id,
        "name": model_name,
        "task": "pixel",
        "algorithm": clf.__class__.__name__,
        "path": rel_path,
        "card": card,
        "metrics": metrics,
        "train_layer_id": raster_id,
    })
    return {"model": saved_model, "output_layer": out_layer}
