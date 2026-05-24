"""
Carve a held-out evaluation set from curated labels.

Only T1+T2 (sybil) and G1 (genuine) qualify - the only tiers strong enough
to be considered ground truth. Held-out set is NEVER used for training.
"""
from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd
import yaml

log = logging.getLogger(__name__)


def split_holdout(
    curated_path: Path,
    manifest_path: Path,
    out_holdout: Path,
    out_train: Path,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    df = pd.read_parquet(curated_path)
    with manifest_path.open("r", encoding="utf-8") as f:
        manifest = yaml.safe_load(f)
    hcfg = manifest["holdout"]

    seed = int(hcfg.get("random_seed", 42))
    size = int(hcfg["size_per_class"])
    s_tiers = set(hcfg["sybil_tiers"])
    g_tiers = set(hcfg["genuine_tiers"])

    sybil_pool = df[(df["label"] == 1) & (df["tier"].isin(s_tiers))]
    genuine_pool = df[(df["label"] == 0) & (df["tier"].isin(g_tiers))]

    n_s = min(size, len(sybil_pool))
    n_g = min(size, len(genuine_pool))
    if n_s < size:
        log.warning("Sybil holdout pool only has %d rows (wanted %d)", n_s, size)
    if n_g < size:
        log.warning("Genuine holdout pool only has %d rows (wanted %d)", n_g, size)

    sybil_holdout = sybil_pool.sample(n=n_s, random_state=seed) if n_s > 0 else sybil_pool
    genuine_holdout = genuine_pool.sample(n=n_g, random_state=seed) if n_g > 0 else genuine_pool

    holdout = pd.concat([sybil_holdout, genuine_holdout], ignore_index=True)
    holdout = holdout.sort_values(["chain", "address"]).reset_index(drop=True)

    holdout_keys = set(zip(holdout["address"], holdout["chain"], strict=False))
    train_mask = ~df.apply(lambda r: (r["address"], r["chain"]) in holdout_keys, axis=1)
    train = df[train_mask].copy().reset_index(drop=True)

    out_holdout.parent.mkdir(parents=True, exist_ok=True)
    holdout.to_parquet(out_holdout, index=False)
    train.to_parquet(out_train, index=False)

    log.info(
        "Holdout: %d sybil + %d genuine = %d. Train: %d",
        n_s,
        n_g,
        len(holdout),
        len(train),
    )
    return holdout, train


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    root = Path(__file__).resolve().parent / "labeled"
    split_holdout(
        curated_path=root / "labeled_addresses.parquet",
        manifest_path=root / "manifest.yaml",
        out_holdout=root / "holdout.parquet",
        out_train=root / "train.parquet",
    )
