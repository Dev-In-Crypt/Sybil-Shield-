"""
Production-grade retrain orchestrator that:

1. Reads curated `train.parquet` + `holdout.parquet`
2. Samples a larger balanced corpus across sybil tiers (T1/T2/T4) + all
   available genuine labels
3. Builds features from on-chain provider (AlchemyProvider when
   USE_MOCK_PROVIDERS=false)
4. Generates an adversarial training augmentation set (5 evasion techniques)
   AND a held-out adversarial evaluation set with a different seed - so we
   can honestly measure adversarial_recall
5. Trains LightGBM with `is_unbalance=True` to handle class imbalance, using
   tier-weighted sample weights (real labels) and 1.0 for adversarial samples
6. Persists `current.pkl` under the ml_models volume so the inference service
   loads it on next request
7. Prints a metrics block and the path of the saved artifact

Run: `python -m sybilshield.scoring.retrain_full --sybil 280 --genuine 140 --adv 25`
where --adv is per-technique (5 techniques × N).
"""
from __future__ import annotations

import argparse
import logging
import sys
from dataclasses import asdict
from pathlib import Path

import numpy as np
import pandas as pd

from sybilshield.data.build_features import _make_provider
from sybilshield.eval.adversarial import (
    evaluate_adversarial,
    generate_adversarial_set,
)
from sybilshield.features.combine import FEATURE_NAMES, extract_all_features
from sybilshield.ingest import ingest_batch
from sybilshield.scoring.train import train_model

log = logging.getLogger(__name__)


def _sample_balanced(
    train_df: pd.DataFrame,
    n_sybil: int,
    n_genuine: int,
    seed: int = 42,
) -> pd.DataFrame:
    sybil_pool = train_df[train_df["label"] == 1]
    gen_pool = train_df[train_df["label"] == 0]
    n_sybil = min(n_sybil, len(sybil_pool))
    n_genuine = min(n_genuine, len(gen_pool))
    log.info("sybil pool=%d → taking %d", len(sybil_pool), n_sybil)
    log.info("genuine pool=%d → taking %d", len(gen_pool), n_genuine)

    # Stratify sybil across tiers so we don't end up 100% T4 (single-detector)
    parts: list[pd.DataFrame] = []
    tier_counts = sybil_pool["tier"].value_counts()
    log.info("sybil tier distribution: %s", tier_counts.to_dict())
    total_pool = len(sybil_pool)
    for tier, count in tier_counts.items():
        share = max(1, int(round(n_sybil * count / total_pool)))
        share = min(share, count)
        parts.append(sybil_pool[sybil_pool["tier"] == tier].sample(share, random_state=seed))
    sybil_take = pd.concat(parts).head(n_sybil)
    gen_take = gen_pool.sample(n_genuine, random_state=seed)
    out = pd.concat([sybil_take, gen_take]).sample(frac=1.0, random_state=seed).reset_index(drop=True)
    log.info("balanced sample: %d total (%d sybil / %d genuine)", len(out), len(sybil_take), len(gen_take))
    return out


def _augment_with_adversarial(
    train_df: pd.DataFrame,
    train_feats: pd.DataFrame,
    n_per_technique: int,
    seed: int,
) -> pd.DataFrame:
    """Append adversarial sybil samples to the training set with tier='ADV'."""
    adv_batch = generate_adversarial_set(n_per_technique=n_per_technique, seed=seed)
    log.info("adversarial: %d synthetic sybil patterns (seed=%d)", len(adv_batch), seed)
    adv_feats_dict = extract_all_features(adv_batch)
    adv_rows = []
    for raw in adv_batch:
        f = adv_feats_dict.get(raw.address, {})
        row = {
            "address": raw.address,
            "chain": "ethereum",
            "label": 1,
            "tier": "ADV",
            "confidence": 0.85,
            "sample_weight": 1.5,
            "sources": "adversarial_synthetic",
        }
        # Merge numeric features
        for k, v in f.items():
            if isinstance(v, (int, float, bool)) and k in FEATURE_NAMES:
                row[k] = v
        adv_rows.append(row)
    adv_df = pd.DataFrame(adv_rows)
    # Align columns with train_feats
    for col in train_feats.columns:
        if col not in adv_df.columns:
            adv_df[col] = 0
    adv_df = adv_df[train_feats.columns]
    merged = pd.concat([train_feats, adv_df], ignore_index=True)
    log.info("post-augmentation: %d training rows (+%d adversarial)", len(merged), len(adv_df))
    return merged


def _build(
    in_df: pd.DataFrame,
    out_path: Path,
) -> pd.DataFrame:
    label_map = dict(zip(in_df["address"].str.lower(), in_df["label"].astype(int), strict=False))
    provider = _make_provider(label_map)
    addrs = in_df["address"].str.lower().tolist()
    log.info("ingesting %d addresses via %s", len(addrs), type(provider).__name__)
    batch = ingest_batch(provider, addrs, "ethereum")
    feats = extract_all_features(batch)
    rows: list[dict] = []
    for _, r in in_df.iterrows():
        addr = r["address"].lower()
        f = feats.get(addr, {})
        merged = {**r.to_dict(), **{k: v for k, v in f.items() if isinstance(v, (int, float, bool))}}
        rows.append(merged)
    out = pd.DataFrame(rows)
    out.to_parquet(out_path, index=False)
    log.info("wrote %d rows → %s (%d cols)", len(out), out_path, len(out.columns))
    return out


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--sybil", type=int, default=280)
    p.add_argument("--genuine", type=int, default=140)
    p.add_argument("--adv", type=int, default=25, help="adversarial per technique (5 techniques)")
    p.add_argument(
        "--labeled-dir",
        type=Path,
        default=Path("/app/apps/ml/sybilshield/data/labeled"),
    )
    p.add_argument(
        "--model-out",
        type=Path,
        default=Path("/app/apps/ml/sybilshield/data/models/current.pkl"),
    )
    p.add_argument("--version", default="v0.4.0-alchemy-adv")
    args = p.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    base: Path = args.labeled_dir
    train_full = pd.read_parquet(base / "train.parquet")
    holdout = pd.read_parquet(base / "holdout.parquet")
    log.info("train.parquet rows=%d, holdout.parquet rows=%d", len(train_full), len(holdout))

    # 1. Balanced sample
    train_sample = _sample_balanced(train_full, args.sybil, args.genuine, seed=42)
    train_sample.to_parquet(base / "train.parquet", index=False)

    # 2. Build features (Alchemy)
    train_feats = _build(train_sample, base / "train_with_features.parquet")
    hold_feats = _build(holdout, base / "holdout_with_features.parquet")

    # 3. Augment with adversarial (seed=42)
    train_feats = _augment_with_adversarial(
        train_sample, train_feats, n_per_technique=args.adv, seed=42,
    )

    # 4. Train
    log.info("training LightGBM on %d samples...", len(train_feats))
    model = train_model(
        train_features=train_feats,
        train_labels=train_feats["label"].to_numpy(),
        train_weights=train_feats["sample_weight"].to_numpy(),
        holdout_features=hold_feats,
        holdout_labels=hold_feats["label"].to_numpy(),
        holdout_tiers=hold_feats["tier"].to_numpy(),
        manifest_path=base / "manifest.yaml",
        version=args.version,
    )

    # 5. Adversarial evaluation with a DIFFERENT seed (held-out evasion patterns)
    adv_eval = generate_adversarial_set(n_per_technique=20, seed=9999)
    eval_recall = evaluate_adversarial(model, adv_eval)
    log.info("adversarial_recall (seed=9999, 100 patterns): %.4f", eval_recall)
    # Manually mutate the artifact's adversarial_recall metric so it's
    # persisted alongside the trained model.
    try:
        model.artifact.metrics.adversarial_recall = float(eval_recall)
    except Exception as e:
        log.warning("could not update adversarial_recall in metrics: %s", e)

    # 6. Save
    args.model_out.parent.mkdir(parents=True, exist_ok=True)
    model.save(args.model_out)
    log.info("saved model: %s", args.model_out)

    print()
    print("=" * 60)
    print("RETRAIN COMPLETE")
    print("=" * 60)
    for k, v in asdict(model.artifact.metrics).items():
        print(f"  {k:30s} {v}")
    print(f"\nartifact path: {args.model_out}")
    print(f"version:       {args.version}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
