"""
Retraining orchestrator (Step 8.5).

Decides whether to retrain based on:
  - PSI drift on any of the top-N production features (vs training-time)
  - Drop in adversarial-set recall

If retraining is triggered, loads train/holdout parquet, calls `train_model`,
saves new artifact, and (optionally) writes a row to `model_versions` table.

Entry point: `python -m sybilshield.scoring.retrain --dry-run`
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pandas as pd

from sybilshield.eval.adversarial import evaluate_adversarial, generate_adversarial_set
from sybilshield.eval.drift import compute_psi
from sybilshield.features.combine import FEATURE_NAMES
from sybilshield.scoring.model import SybilModel
from sybilshield.scoring.train import train_model

log = logging.getLogger(__name__)


@dataclass
class RetrainDecision:
    should_retrain: bool
    triggered_by: list[str]
    drift_psi: dict[str, float]
    adversarial_recall: float | None
    prior_adversarial_recall: float | None
    new_model_version: str | None = None
    new_metrics: dict[str, float] | None = None


def _load_current_model(model_dir: Path) -> SybilModel | None:
    current = model_dir / "current.pkl"
    if not current.exists():
        log.info("no current model at %s - any retrain will be the first", current)
        return None
    return SybilModel.load(current)


def _load_training_distribution(model_dir: Path) -> pd.DataFrame | None:
    path = model_dir / "train_distribution.parquet"
    if not path.exists():
        log.warning("no training distribution snapshot at %s - drift check skipped", path)
        return None
    return pd.read_parquet(path)


def decide(
    current_model: SybilModel | None,
    train_dist: pd.DataFrame | None,
    prod_dist: pd.DataFrame | None,
    psi_threshold: float = 0.25,
    adversarial_recall_drop: float = 0.05,
) -> RetrainDecision:
    triggered: list[str] = []
    psi_by_feature: dict[str, float] = {}

    # No prior model: always train
    if current_model is None:
        return RetrainDecision(
            should_retrain=True,
            triggered_by=["no_existing_model"],
            drift_psi={},
            adversarial_recall=None,
            prior_adversarial_recall=None,
        )

    # PSI drift check
    if train_dist is not None and prod_dist is not None and len(prod_dist) > 0:
        top_features = FEATURE_NAMES[:10]
        for f in top_features:
            if f not in train_dist.columns or f not in prod_dist.columns:
                continue
            psi = compute_psi(train_dist[f].to_numpy(), prod_dist[f].to_numpy())
            psi_by_feature[f] = psi
            if psi > psi_threshold:
                triggered.append(f"drift:{f}={psi:.3f}")

    # Adversarial recall check
    prior_recall = current_model.artifact.metrics.adversarial_recall
    adv_batch = generate_adversarial_set(n_per_technique=50, seed=current_model.artifact.version.__hash__() & 0xFFFF)
    current_recall = evaluate_adversarial(current_model, adv_batch)
    if prior_recall > 0 and current_recall < prior_recall - adversarial_recall_drop:
        triggered.append(f"adversarial_drop:{prior_recall:.3f}->{current_recall:.3f}")

    return RetrainDecision(
        should_retrain=len(triggered) > 0,
        triggered_by=triggered,
        drift_psi=psi_by_feature,
        adversarial_recall=current_recall,
        prior_adversarial_recall=prior_recall,
    )


def main(
    model_dir: Path,
    train_path: Path | None,
    holdout_path: Path | None,
    prod_snapshot_path: Path | None,
    dry_run: bool = False,
    psi_threshold: float = 0.25,
    adversarial_recall_drop: float = 0.05,
) -> RetrainDecision:
    current = _load_current_model(model_dir)
    train_dist = _load_training_distribution(model_dir)
    prod_dist = (
        pd.read_parquet(prod_snapshot_path) if prod_snapshot_path and prod_snapshot_path.exists() else None
    )

    decision = decide(
        current_model=current,
        train_dist=train_dist,
        prod_dist=prod_dist,
        psi_threshold=psi_threshold,
        adversarial_recall_drop=adversarial_recall_drop,
    )

    log.info("decision: %s", asdict(decision))
    print(json.dumps(asdict(decision), indent=2, default=str))

    if dry_run or not decision.should_retrain:
        return decision
    if not train_path or not train_path.exists() or not holdout_path or not holdout_path.exists():
        log.warning("retrain triggered but training data missing - skipping training step")
        return decision

    # Real retrain
    train_df = pd.read_parquet(train_path)
    holdout_df = pd.read_parquet(holdout_path)

    # Synthesize feature columns if missing (for smoke tests with label-only parquet)
    for col in FEATURE_NAMES:
        if col not in train_df.columns:
            train_df[col] = 0.0
        if col not in holdout_df.columns:
            holdout_df[col] = 0.0

    model = train_model(
        train_features=train_df,
        train_labels=train_df["label"].to_numpy(),
        train_weights=train_df["sample_weight"].to_numpy() if "sample_weight" in train_df else np.ones(len(train_df)),
        holdout_features=holdout_df,
        holdout_labels=holdout_df["label"].to_numpy(),
        holdout_tiers=holdout_df["tier"].to_numpy() if "tier" in holdout_df else np.array(["G1"] * len(holdout_df)),
        version=f"v0.2.0-{datetime.now(tz=UTC).strftime('%Y%m%d-%H%M%S')}",
    )
    new_path = model_dir / "current.pkl"
    model_dir.mkdir(parents=True, exist_ok=True)
    model.save(new_path)
    log.info("saved new model: %s -> %s", model.artifact.version, new_path)

    decision.new_model_version = model.artifact.version
    decision.new_metrics = asdict(model.artifact.metrics)
    return decision


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--model-dir", type=Path, default=Path("apps/ml/sybilshield/data/models"))
    p.add_argument("--train", type=Path, default=Path("apps/ml/sybilshield/data/labeled/train.parquet"))
    p.add_argument("--holdout", type=Path, default=Path("apps/ml/sybilshield/data/labeled/holdout.parquet"))
    p.add_argument("--prod-snapshot", type=Path, default=None)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--psi-threshold", type=float, default=0.25)
    p.add_argument("--adversarial-drop", type=float, default=0.05)
    return p.parse_args(argv)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    args = _parse_args(sys.argv[1:])
    main(
        model_dir=args.model_dir,
        train_path=args.train,
        holdout_path=args.holdout,
        prod_snapshot_path=args.prod_snapshot,
        dry_run=args.dry_run,
        psi_threshold=args.psi_threshold,
        adversarial_recall_drop=args.adversarial_drop,
    )
