"""
Derive G1 verified-genuine label: addresses owning ENS names registered
before 2021-06-01 with confirmed continuous activity.

Data sources (all free, no key required):
  - ENS subgraph at https://api.thegraph.com/subgraphs/name/ensdomains/ens
  - Cloudflare ETH RPC at https://cloudflare-eth.com (eth_getTransactionCount)

Output: apps/ml/sybilshield/data/labeled/raw/ens-veterans.csv

Resumable via checkpoint JSON. Rate-limited to be polite to free endpoints.
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
# Cloudflare-eth has blocked eth_getTransactionCount; publicnode works as of 2026-05.
DEFAULT_RPC = "https://ethereum-rpc.publicnode.com"
CUTOFF_TIMESTAMP = 1622505600  # 2021-06-01 UTC

DEFAULT_MIN_TX = 50
PAGE_SIZE = 1000


@dataclass
class Checkpoint:
    last_skip: int = 0
    kept: list[str] = field(default_factory=list)
    rejected: int = 0


def _load_checkpoint(path: Path) -> Checkpoint:
    if not path.exists():
        return Checkpoint()
    with path.open("r", encoding="utf-8") as f:
        d = json.load(f)
    return Checkpoint(last_skip=d.get("last_skip", 0), kept=d.get("kept", []), rejected=d.get("rejected", 0))


def _save_checkpoint(path: Path, cp: Checkpoint) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(asdict(cp), f)


def fetch_ens_registrations(
    session: requests.Session,
    skip: int,
    page_size: int = PAGE_SIZE,
) -> list[dict[str, Any]]:
    """Page of ENS registrations with registrationDate < cutoff."""
    query = """
    query($skip: Int!, $first: Int!, $cutoff: BigInt!) {
      registrations(
        first: $first
        skip: $skip
        orderBy: registrationDate
        orderDirection: desc
        where: { registrationDate_lt: $cutoff }
      ) {
        domain { owner { id } }
      }
    }
    """
    resp = session.post(
        ENS_SUBGRAPH_URL,
        json={"query": query, "variables": {"skip": skip, "first": page_size, "cutoff": str(CUTOFF_TIMESTAMP)}},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if "errors" in data:
        raise RuntimeError(f"subgraph errors: {data['errors']}")
    return data.get("data", {}).get("registrations", [])


def fetch_tx_count(session: requests.Session, address: str) -> int:
    """Call eth_getTransactionCount via Cloudflare ETH RPC."""
    resp = session.post(
        DEFAULT_RPC,
        json={"jsonrpc": "2.0", "id": 1, "method": "eth_getTransactionCount", "params": [address, "latest"]},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    if "result" not in data:
        raise RuntimeError(f"rpc error: {data}")
    return int(data["result"], 16)


def derive(
    out_csv: Path,
    checkpoint_path: Path,
    limit: int | None = None,
    min_tx: int = DEFAULT_MIN_TX,
    sleep_subgraph: float = 1.0,
    sleep_rpc: float = 0.35,
    session: requests.Session | None = None,
    fetch_registrations: Any = None,
    fetch_count: Any = None,
) -> int:
    """
    Returns: number of addresses written.

    `fetch_registrations` and `fetch_count` are injectable for tests.
    """
    session = session or requests.Session()
    fetch_registrations = fetch_registrations or fetch_ens_registrations
    fetch_count = fetch_count or fetch_tx_count

    cp = _load_checkpoint(checkpoint_path)
    kept: list[str] = list(cp.kept)
    rejected: int = cp.rejected
    skip = cp.last_skip
    seen: set[str] = set(kept)

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    write_header = not out_csv.exists()
    with out_csv.open("a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow(["address", "chain"])

        while True:
            if limit is not None and len(kept) >= limit:
                break
            page = fetch_registrations(session, skip)
            if not page:
                break
            for reg in page:
                owner = ((reg.get("domain") or {}).get("owner") or {}).get("id")
                if not owner:
                    continue
                addr = owner.lower()
                if not addr.startswith("0x") or len(addr) != 42:
                    continue
                if addr in seen:
                    continue
                seen.add(addr)
                try:
                    tx_count = fetch_count(session, addr)
                except Exception as e:
                    log.warning("rpc failed for %s: %s", addr, e)
                    continue
                time.sleep(sleep_rpc)
                if tx_count >= min_tx:
                    kept.append(addr)
                    writer.writerow([addr, "ethereum"])
                    f.flush()
                else:
                    rejected += 1
                if limit is not None and len(kept) >= limit:
                    break
            skip += len(page)
            cp = Checkpoint(last_skip=skip, kept=kept, rejected=rejected)
            _save_checkpoint(checkpoint_path, cp)
            time.sleep(sleep_subgraph)
            if len(page) < PAGE_SIZE:
                break

    log.info("done: kept=%d rejected=%d", len(kept), rejected)
    return len(kept)


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--out", type=Path, default=Path("apps/ml/sybilshield/data/labeled/raw/ens-veterans.csv"))
    p.add_argument(
        "--checkpoint",
        type=Path,
        default=Path("apps/ml/sybilshield/data/labeled/raw/.checkpoints/ens.json"),
    )
    p.add_argument("--limit", type=int, default=None)
    p.add_argument("--min-tx", type=int, default=DEFAULT_MIN_TX)
    return p.parse_args(argv)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    args = _parse_args(sys.argv[1:])
    n = derive(args.out, args.checkpoint, limit=args.limit, min_tx=args.min_tx)
    print(f"wrote {n} addresses to {args.out}")
