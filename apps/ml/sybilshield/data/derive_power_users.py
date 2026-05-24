"""
Derive G2 likely-genuine label.

Original approach used alchemy_getAssetTransfers which requires an Alchemy key.
Free RPC alternatives (Cloudflare, PublicNode) don't implement this method.

Current simpler heuristic (free-RPC-only): from G1 ENS veterans, keep those
who ALSO have an active ENS reverse record AND >=200 transactions. The
combination of (1) pre-2021 ENS registration, (2) reverse record set
(non-trivial setup step), and (3) substantial tx history is a strong
positive human signal.

When the user has an Alchemy key, swap this script for the full
behavior-classification version in git history (commit before this rewrite).

Output: apps/ml/sybilshield/data/labeled/raw/protocol-power-users.csv
"""
from __future__ import annotations

import argparse
import csv
import json
import logging
import sys
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import requests

log = logging.getLogger(__name__)

ENS_SUBGRAPH_URL = "https://api.thegraph.com/subgraphs/name/ensdomains/ens"
DEFAULT_RPC = "https://ethereum-rpc.publicnode.com"
MIN_TX = 200


@dataclass
class Checkpoint:
    processed: int = 0
    kept: list[str] = field(default_factory=list)


def _load_checkpoint(path: Path) -> Checkpoint:
    if not path.exists():
        return Checkpoint()
    with path.open("r", encoding="utf-8") as f:
        d = json.load(f)
    return Checkpoint(processed=d.get("processed", 0), kept=d.get("kept", []))


def _save_checkpoint(path: Path, cp: Checkpoint) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(asdict(cp), f)


def has_reverse_record(session: requests.Session, address: str) -> bool:
    """Check if address has an ENS reverse record (a name pointing back at it)."""
    query = (
        "query($addr: String!) { account(id: $addr) { domains(first: 1) { name } } }"
    )
    resp = session.post(
        ENS_SUBGRAPH_URL,
        json={"query": query, "variables": {"addr": address.lower()}},
        timeout=15,
    )
    if not resp.ok:
        return False
    try:
        data = resp.json()
        domains = (((data.get("data") or {}).get("account") or {}).get("domains")) or []
        return len(domains) > 0
    except Exception:
        return False


def fetch_tx_count(session: requests.Session, address: str, rpc_url: str = DEFAULT_RPC) -> int:
    resp = session.post(
        rpc_url,
        json={"jsonrpc": "2.0", "id": 1, "method": "eth_getTransactionCount", "params": [address, "latest"]},
        timeout=15,
    )
    if not resp.ok:
        raise RuntimeError(f"rpc status {resp.status_code}")
    data = resp.json()
    if "result" not in data:
        raise RuntimeError(f"rpc error: {data}")
    return int(data["result"], 16)


def derive(
    candidates_csv: Path,
    out_csv: Path,
    checkpoint_path: Path,
    limit: int | None = None,
    min_tx: int = MIN_TX,
    sleep_per_check: float = 0.5,
    session: requests.Session | None = None,
    fetch_reverse_fn: Any = None,
    fetch_count_fn: Any = None,
) -> int:
    session = session or requests.Session()
    fetch_reverse_fn = fetch_reverse_fn or has_reverse_record
    fetch_count_fn = fetch_count_fn or fetch_tx_count

    candidates: list[str] = []
    if candidates_csv.exists():
        with candidates_csv.open("r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            candidates = [r["address"].lower() for r in reader if r.get("address")]
    if not candidates:
        log.warning("no candidates at %s - run derive_ens_veterans first", candidates_csv)
        return 0

    cp = _load_checkpoint(checkpoint_path)
    kept = list(cp.kept)
    seen = set(kept)

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    write_header = not out_csv.exists()
    with out_csv.open("a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow(["address", "chain"])

        for i, addr in enumerate(candidates[cp.processed :], start=cp.processed):
            if limit is not None and len(kept) >= limit:
                break
            if addr in seen:
                continue
            try:
                tx_count = fetch_count_fn(session, addr)
            except Exception as e:
                log.warning("rpc failed for %s: %s", addr, e)
                cp.processed = i + 1
                continue
            if tx_count < min_tx:
                cp.processed = i + 1
                time.sleep(sleep_per_check)
                continue
            try:
                has_rev = fetch_reverse_fn(session, addr)
            except Exception as e:
                log.warning("subgraph reverse-check failed for %s: %s", addr, e)
                cp.processed = i + 1
                continue
            time.sleep(sleep_per_check)
            if has_rev:
                kept.append(addr)
                seen.add(addr)
                writer.writerow([addr, "ethereum"])
                f.flush()
            cp = Checkpoint(processed=i + 1, kept=kept)
            if i % 25 == 0:
                _save_checkpoint(checkpoint_path, cp)

        _save_checkpoint(checkpoint_path, cp)
    log.info("done: kept=%d of %d candidates", len(kept), len(candidates))
    return len(kept)


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--candidates",
        type=Path,
        default=Path("apps/ml/sybilshield/data/labeled/raw/ens-veterans.csv"),
    )
    p.add_argument(
        "--out",
        type=Path,
        default=Path("apps/ml/sybilshield/data/labeled/raw/protocol-power-users.csv"),
    )
    p.add_argument(
        "--checkpoint",
        type=Path,
        default=Path("apps/ml/sybilshield/data/labeled/raw/.checkpoints/power.json"),
    )
    p.add_argument("--limit", type=int, default=None)
    return p.parse_args(argv)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    args = _parse_args(sys.argv[1:])
    n = derive(args.candidates, args.out, args.checkpoint, limit=args.limit)
    print(f"wrote {n} addresses to {args.out}")
