"""Tests for retrain orchestrator and drift cron (Step 8.5)."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from sybilshield.eval.drift_check_job import run as drift_run
from sybilshield.features.combine import FEATURE_NAMES
from sybilshield.scoring.retrain import decide, main


def _make_train_holdout(tmp_path: Path) -> tuple[Path, Path]:
    rng = np.random.default_rng(7)
    n = 200
    rows = []
    for _ in range(n // 2):
        row = {f: rng.normal(0, 1) for f in FEATURE_NAMES}
        row["label"] = 1
        row["sample_weight"] = 3.0
        row["tier"] = "T1"
        rows.append(row)
    for _ in range(n // 2):
        row = {f: rng.normal(0, 1) for f in FEATURE_NAMES}
        # Slight separability so LightGBM can learn something
        row["total_tx_count"] = rng.normal(5, 1)
        row["label"] = 0
        row["sample_weight"] = 4.0
        row["tier"] = "G1"
        rows.append(row)
    df = pd.DataFrame(rows)
    train = tmp_path / "train.parquet"
    holdout = tmp_path / "holdout.parquet"
    df.iloc[:160].to_parquet(train, index=False)
    df.iloc[160:].to_parquet(holdout, index=False)
    return train, holdout


def test_decide_no_model_always_retrains() -> None:
    d = decide(current_model=None, train_dist=None, prod_dist=None)
    assert d.should_retrain
    assert d.triggered_by == ["no_existing_model"]


def test_retrain_main_on_synthetic_produces_artifact(tmp_path: Path) -> None:
    train, holdout = _make_train_holdout(tmp_path)
    model_dir = tmp_path / "models"
    decision = main(
        model_dir=model_dir,
        train_path=train,
        holdout_path=holdout,
        prod_snapshot_path=None,
        dry_run=False,
    )
    assert decision.should_retrain
    assert decision.new_model_version is not None
    assert (model_dir / "current.pkl").exists()


def test_drift_check_alerts_on_shift(tmp_path: Path) -> None:
    rng = np.random.default_rng(1)
    train = pd.DataFrame({f: rng.normal(0, 1, 1000) for f in FEATURE_NAMES[:10]})
    prod = pd.DataFrame({f: rng.normal(1.5, 1, 1000) for f in FEATURE_NAMES[:10]})  # shifted
    train_p = tmp_path / "train.parquet"
    prod_p = tmp_path / "prod.parquet"
    train.to_parquet(train_p)
    prod.to_parquet(prod_p)
    result = drift_run(train_p, prod_p, psi_warn=0.10, psi_alert=0.25)
    assert any(r["status"] == "alert" for r in result.values())


def test_drift_check_ok_when_distributions_match(tmp_path: Path) -> None:
    rng = np.random.default_rng(2)
    base = pd.DataFrame({f: rng.normal(0, 1, 2000) for f in FEATURE_NAMES[:10]})
    train_p = tmp_path / "t.parquet"
    prod_p = tmp_path / "p.parquet"
    base.iloc[:1000].to_parquet(train_p)
    base.iloc[1000:].to_parquet(prod_p)
    result = drift_run(train_p, prod_p, psi_warn=0.10, psi_alert=0.25)
    assert all(r["status"] != "alert" for r in result.values())
