"""
Refresh scaffold for the curated CEX hot-wallet list in known_exchanges.py.

The list in known_exchanges.py is hand-curated from public Etherscan labels +
Dune's `labels.cex_addresses`. This module documents how to regenerate it and
provides a `print_diff()` helper so a maintainer can see what a candidate list
would add/remove before editing the source file by hand.

We deliberately do NOT auto-write the .py module — exchange hot-wallet labels
need a human eyeball (deposit addresses rotate, some "exchange" labels are
actually market-maker or OTC desks we'd rather keep as cluster signal). This
keeps the curated set a reviewed artifact, not a scraped blob.

USAGE
-----
1. Pull candidate addresses from a public source. Two options:
   a) Dune query (needs a Dune API key):
        SELECT DISTINCT address, name
        FROM labels.cex_addresses
        WHERE blockchain = 'ethereum' AND category = 'hot_wallet'
   b) Etherscan label export (manual CSV download from the "Exchange" label).
2. Save the candidates as a CSV `address,label` to apps/ml/.../raw/cex.csv
3. Run:  python -m sybilshield.data.derive_known_exchanges --candidates raw/cex.csv
4. Review the printed diff, then hand-edit known_exchanges.py for anything
   that's clearly a long-lived hot wallet.
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path

from sybilshield.data.known_exchanges import KNOWN_EXCHANGES

ADDR_RE = re.compile(r"0x[0-9a-fA-F]{40}")


def load_candidates(path: Path) -> dict[str, str]:
    """Parse a `address,label` CSV into a lowercased {addr: label} map."""
    out: dict[str, str] = {}
    with path.open("r", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if not row:
                continue
            addr = row[0].strip().lower()
            if not ADDR_RE.fullmatch(addr):
                continue
            label = row[1].strip() if len(row) > 1 else ""
            out[addr] = label
    return out


def print_diff(candidates: dict[str, str]) -> None:
    cand = set(candidates)
    additions = sorted(cand - KNOWN_EXCHANGES)
    removals = sorted(KNOWN_EXCHANGES - cand)
    print(f"current curated set: {len(KNOWN_EXCHANGES)}")
    print(f"candidate set:       {len(cand)}")
    print(f"\n+ would ADD {len(additions)} (review before adding):")
    for a in additions:
        print(f'    "{a}": "{candidates[a] or "??"}",')
    print(f"\n- in curated but NOT in candidates ({len(removals)}) — keep unless stale:")
    for a in removals:
        print(f"    {a}")


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--candidates", type=Path, required=True, help="CSV of address,label")
    return p.parse_args(argv)


if __name__ == "__main__":
    args = _parse_args(sys.argv[1:])
    if not args.candidates.exists():
        print(f"candidates file not found: {args.candidates}", file=sys.stderr)
        sys.exit(1)
    print_diff(load_candidates(args.candidates))
