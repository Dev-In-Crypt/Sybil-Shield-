"""
Generate a synthetic-realistic sybil seed for bootstrapping the first model.

Output: apps/ml/sybilshield/data/labeled/raw/{layerzero-amnesty,arbitrum-foundation-sybil,
hop-protocol-sybil,linea-filtered}.csv

WARNING: This is NOT real labeled data. It is a placeholder so the model training
pipeline can run end-to-end. Replace these CSVs with real downloads before
making claims about precision/recall to customers. See README "What's left for
production" item 1.

The synthetic addresses are deterministic and clearly identifiable (deterministic
hash from index + tier) so they can be distinguished from real on-chain data.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import logging
import sys
from pathlib import Path

log = logging.getLogger(__name__)


def _addr(tag: str, idx: int) -> str:
    h = hashlib.sha256(f"SYBILSHIELD_SYNTHETIC::{tag}::{idx}".encode()).hexdigest()[:40]
    return "0x" + h


def generate(out_dir: Path, sizes: dict[str, int]) -> dict[str, int]:
    out_dir.mkdir(parents=True, exist_ok=True)
    written: dict[str, int] = {}
    for source_id, count in sizes.items():
        path = out_dir / f"{source_id}.csv"
        with path.open("w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(["address", "chain"])
            for i in range(count):
                w.writerow([_addr(source_id, i), "ethereum"])
        written[source_id] = count
        log.info("wrote %s rows to %s", count, path)
    return written


DEFAULT_SIZES = {
    "layerzero-amnesty": 2000,         # T1 - high confidence
    "hop-protocol-sybil": 500,         # T2 - high confidence
    "arbitrum-foundation-sybil": 5000,  # T4 - low-confidence, weight as such
    "linea-filtered": 8000,            # T4
}


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--out-dir",
        type=Path,
        default=Path("apps/ml/sybilshield/data/labeled/raw"),
    )
    p.add_argument("--small", action="store_true", help="Generate small set for tests/smoke")
    return p.parse_args(argv)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    args = _parse_args(sys.argv[1:])
    sizes = (
        {k: max(50, v // 50) for k, v in DEFAULT_SIZES.items()} if args.small else DEFAULT_SIZES
    )
    n = generate(args.out_dir, sizes)
    print(f"generated synthetic sybil seed: {n}")
