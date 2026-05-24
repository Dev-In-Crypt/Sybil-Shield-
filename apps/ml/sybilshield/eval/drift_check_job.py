"""
Weekly drift-check cron job. Computes PSI on production feature distributions
vs the training-time snapshot. Does NOT retrain - that's `retrain.py`'s job.

Entry: `python -m sybilshield.eval.drift_check_job`
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

import pandas as pd

from sybilshield.eval.drift import compute_psi
from sybilshield.features.combine import FEATURE_NAMES

log = logging.getLogger(__name__)


def run(
    train_dist_path: Path,
    prod_snapshot_path: Path,
    psi_warn: float = 0.10,
    psi_alert: float = 0.25,
) -> dict[str, dict[str, float]]:
    if not train_dist_path.exists():
        log.error("training distribution snapshot missing: %s", train_dist_path)
        return {}
    if not prod_snapshot_path.exists():
        log.error("production snapshot missing: %s", prod_snapshot_path)
        return {}

    train = pd.read_parquet(train_dist_path)
    prod = pd.read_parquet(prod_snapshot_path)

    result: dict[str, dict[str, float]] = {}
    for f in FEATURE_NAMES[:10]:
        if f not in train.columns or f not in prod.columns:
            continue
        psi = compute_psi(train[f].to_numpy(), prod[f].to_numpy())
        status = "ok"
        if psi >= psi_alert:
            status = "alert"
        elif psi >= psi_warn:
            status = "warn"
        result[f] = {"psi": psi, "status": status}

    alerts = [f for f, r in result.items() if r["status"] == "alert"]
    if alerts:
        log.warning("PSI ALERT on features: %s", alerts)
    print(json.dumps(result, indent=2))
    return result


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--train-dist", type=Path, default=Path("apps/ml/sybilshield/data/models/train_distribution.parquet"))
    p.add_argument("--prod-snapshot", type=Path, default=Path("apps/ml/sybilshield/data/models/prod_snapshot.parquet"))
    p.add_argument("--psi-warn", type=float, default=0.10)
    p.add_argument("--psi-alert", type=float, default=0.25)
    return p.parse_args(argv)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    args = _parse_args(sys.argv[1:])
    run(args.train_dist, args.prod_snapshot, args.psi_warn, args.psi_alert)
