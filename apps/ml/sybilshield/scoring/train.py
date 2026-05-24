"""Train LightGBM model with tier-weighted samples and honest holdout evaluation."""
from __future__ import annotations

import hashlib
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from sybilshield.features.combine import FEATURE_NAMES
from sybilshield.scoring.model import (
    ModelArtifact,
    ModelMetrics,
    SybilModel,
    feature_schema_hash,
)

log = logging.getLogger(__name__)


def train_model(
    train_features: pd.DataFrame,
    train_labels: np.ndarray,
    train_weights: np.ndarray,
    holdout_features: pd.DataFrame,
    holdout_labels: np.ndarray,
    holdout_tiers: np.ndarray,  # 'T1'|'T2'|'G1' tags for FPR-on-G1 metric
    manifest_path: Path | None = None,
    version: str | None = None,
) -> SybilModel:
    """
    Train LightGBM. Weights are confidence weights from the tier system.
    Metrics are computed on T1+T2+G1 holdout only - never against T4 detector
    outputs.
    """
    import lightgbm as lgb
    from sklearn.metrics import (
        f1_score,
        precision_score,
        recall_score,
        roc_auc_score,
    )
    from sklearn.model_selection import train_test_split

    X = train_features[FEATURE_NAMES].values
    y = train_labels.astype(int)
    w = train_weights.astype(float)

    X_tr, X_val, y_tr, y_val, w_tr, w_val = train_test_split(
        X, y, w, test_size=0.2, stratify=y, random_state=42
    )

    model = lgb.LGBMClassifier(
        n_estimators=500,
        max_depth=8,
        learning_rate=0.05,
        num_leaves=63,
        min_child_samples=20,
        subsample=0.8,
        colsample_bytree=0.8,
        class_weight="balanced",
        random_state=42,
        verbose=-1,
    )
    model.fit(
        X_tr, y_tr,
        sample_weight=w_tr,
        eval_set=[(X_val, y_val)],
        eval_sample_weight=[w_val],
        callbacks=[lgb.early_stopping(50, verbose=False)],
    )

    # Evaluate on honest holdout
    X_h = holdout_features[FEATURE_NAMES].values
    y_h = holdout_labels.astype(int)
    prob_h = model.predict_proba(X_h)[:, 1]
    pred_h = (prob_h >= 0.70).astype(int)

    metrics = ModelMetrics(
        precision_at_70=float(precision_score(y_h, pred_h, zero_division=0)),
        recall_at_70=float(recall_score(y_h, pred_h, zero_division=0)),
        f1_at_70=float(f1_score(y_h, pred_h, zero_division=0)),
        roc_auc=float(roc_auc_score(y_h, prob_h)) if len(set(y_h)) > 1 else 0.0,
        n_train=len(X_tr),
        n_holdout_sybil=int((y_h == 1).sum()),
        n_holdout_genuine=int((y_h == 0).sum()),
    )

    # FPR specifically on G1 verified-genuine (customer-visible FP rate)
    g1_mask = (holdout_tiers == "G1") & (y_h == 0)
    if g1_mask.sum() > 0:
        g1_fp = int((pred_h[g1_mask] == 1).sum())
        metrics.fpr_at_70_on_G1 = g1_fp / int(g1_mask.sum())

    log.info("Holdout metrics: %s", metrics)

    manifest_hash = ""
    if manifest_path and manifest_path.exists():
        manifest_hash = hashlib.sha256(manifest_path.read_bytes()).hexdigest()[:16]

    artifact = ModelArtifact(
        version=version or f"v0.1.0-{datetime.now(tz=UTC).strftime('%Y%m%d-%H%M%S')}",
        feature_names=list(FEATURE_NAMES),
        feature_schema_hash=feature_schema_hash(),
        training_manifest_hash=manifest_hash,
        metrics=metrics,
        trained_at=datetime.now(tz=UTC).isoformat(),
        model_bytes=b"",
    )

    return SybilModel(model, artifact)
