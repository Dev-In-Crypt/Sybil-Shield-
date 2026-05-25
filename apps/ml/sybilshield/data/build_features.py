"""
Build feature matrix for the curated labeled set so we can actually train.

Uses MockProvider (synthetic on-chain data) when USE_MOCK_PROVIDERS=true.
Real production runs use AlchemyProvider against a paid Alchemy key.

Reads:  apps/ml/sybilshield/data/labeled/{train,holdout}.parquet
Writes: apps/ml/sybilshield/data/labeled/{train,holdout}_with_features.parquet

Important: for the synthetic-realistic seed, sybil addresses are mapped to
scripted/shared-funder scenarios and genuine addresses to the default genuine
scenario. This gives the model a learnable signal even on synthetic input.
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path

import pandas as pd

from sybilshield.features.combine import extract_all_features
from sybilshield.ingest import ingest_batch
from sybilshield.providers.base import OnChainProvider
from sybilshield.providers.mock import MockProvider

log = logging.getLogger(__name__)


def _make_provider(label_map: dict[str, int]) -> OnChainProvider:
    """
    Choose a provider:
      - USE_MOCK_PROVIDERS=true (default) → synthetic scenarios per label
        so the model has clean signal on a synthetic-only corpus.
      - USE_MOCK_PROVIDERS=false → real AlchemyProvider. Features extracted
        from on-chain data. Runtime inference also uses Alchemy, so the
        train and serve distributions match.
    """
    use_mock = os.environ.get("USE_MOCK_PROVIDERS", "true") == "true"
    if not use_mock and os.environ.get("ALCHEMY_API_KEY"):
        from sybilshield.providers.alchemy import AlchemyProvider
        rps = float(os.environ.get("ALCHEMY_RATE_LIMIT_RPS", "10"))
        log.info("build_features: using AlchemyProvider (rps=%s)", rps)
        return AlchemyProvider(rps=rps)
    log.info("build_features: using MockProvider with label-mapped scenarios")
    scenarios: dict[str, str] = {}
    sybil_addrs = [a for a, l in label_map.items() if l == 1]
    for i, addr in enumerate(sybil_addrs):
        # Half scripted, half shared-funder for diversity within the sybil class.
        scenarios[addr] = "sybil_scripted" if i % 2 == 0 else "sybil_shared_funder"
    genuine_addrs = [a for a, l in label_map.items() if l == 0]
    for addr in genuine_addrs:
        scenarios[addr] = "random_genuine"
    return MockProvider(scenarios=scenarios)


def build(in_path: Path, out_path: Path) -> int:
    df = pd.read_parquet(in_path)
    if len(df) == 0:
        log.warning("empty input %s", in_path)
        df.to_parquet(out_path, index=False)
        return 0

    label_map = dict(zip(df["address"].str.lower(), df["label"].astype(int), strict=False))
    provider = _make_provider(label_map)

    addresses = df["address"].str.lower().tolist()
    log.info("ingesting %d addresses via %s", len(addresses), type(provider).__name__)
    batch = ingest_batch(provider, addresses, "ethereum")
    feats = extract_all_features(batch)

    feature_rows: list[dict] = []
    for _, row in df.iterrows():
        addr = row["address"].lower()
        f = feats.get(addr, {})
        merged = {**row.to_dict(), **{k: v for k, v in f.items() if isinstance(v, (int, float, bool))}}
        feature_rows.append(merged)

    out = pd.DataFrame(feature_rows)
    out.to_parquet(out_path, index=False)
    log.info("wrote %d rows to %s (%d feature columns)", len(out), out_path, len(out.columns))
    return len(out)


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--labeled-dir",
        type=Path,
        default=Path("/app/apps/ml/sybilshield/data/labeled"),
    )
    return p.parse_args(argv)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    args = _parse_args(sys.argv[1:])
    # _make_provider() inside build() reads USE_MOCK_PROVIDERS + ALCHEMY_API_KEY
    # and picks the right backend.
    build(args.labeled_dir / "train.parquet", args.labeled_dir / "train_with_features.parquet")
    build(args.labeled_dir / "holdout.parquet", args.labeled_dir / "holdout_with_features.parquet")
