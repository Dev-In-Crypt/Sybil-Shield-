"""
Derive G2 genuine label: addresses that voted on major DAO governors via
on-chain VoteCast events. Uses Alchemy `eth_getLogs` directly (no subgraph
dependency) which is the only third-party we already rely on at runtime.

Targeted governors (all use Compound's GovernorBravo VoteCast signature):
  - Uniswap V2 GovernorBravo  0x408ED6354d4973f66138C91495F2f2FCbd8724C3
  - Compound GovernorBravo    0xc0Da02939E1441F497fd74F78cE7Decb17B66529
  - ENS Governor              0x323A76393544d5ecca80cd6ef2A560C6a395b7E3

Genuine criterion: voted on >=2 distinct proposals across >=1 governor.
Anyone voting on real DAO proposals holds the governance token and engaged
with on-chain governance — strongly human-correlated.

Output: apps/ml/sybilshield/data/labeled/raw/governance-voters.csv
"""
from __future__ import annotations

import argparse
import csv
import logging
import os
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Iterable

import requests

log = logging.getLogger(__name__)

# VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 votes, string reason)
VOTE_CAST_TOPIC = "0xb8e138887d0aa13bab447e82de9d5c1777041ecd21ca36ba824ff1e6c07ddda4"

GOVERNORS = [
    {"name": "uniswap", "addr": "0x408ED6354d4973f66138C91495F2f2FCbd8724C3", "from_block": 0xCA5800},
    {"name": "compound", "addr": "0xc0Da02939E1441F497fd74F78cE7Decb17B66529", "from_block": 0x9C2BAD},
    {"name": "ens", "addr": "0x323A76393544d5ecca80cd6ef2A560C6a395b7E3", "from_block": 0xDDF45F},
]

BLOCK_STEP = 50_000  # publicnode/Cloudflare allow ~50K block window per call

# Public RPC by default — Alchemy free tier limits eth_getLogs to 10 blocks
# per call, which makes all-time scans impractical. publicnode.com permits
# wider ranges and doesn't require auth.
PUBLIC_RPC = "https://ethereum-rpc.publicnode.com"


def rpc_url() -> str:
    return os.environ.get("GOVERNANCE_RPC_URL", PUBLIC_RPC)


def fetch_logs_range(
    session: requests.Session,
    url: str,
    governor_addr: str,
    from_block: int,
    to_block: int,
) -> list[dict]:
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_getLogs",
        "params": [
            {
                "address": governor_addr,
                "topics": [VOTE_CAST_TOPIC],
                "fromBlock": hex(from_block),
                "toBlock": hex(to_block),
            }
        ],
    }
    resp = session.post(url, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"alchemy: {data['error']}")
    return data.get("result", [])


def latest_block(session: requests.Session, url: str) -> int:
    r = session.post(
        url,
        json={"jsonrpc": "2.0", "id": 1, "method": "eth_blockNumber", "params": []},
        timeout=30,
    )
    r.raise_for_status()
    return int(r.json()["result"], 16)


def derive(
    out_csv: Path,
    target_keep: int = 2000,
    min_proposals: int = 2,
    block_range: int | None = None,
) -> int:
    session = requests.Session()
    url = rpc_url()
    head = latest_block(session, url)
    log.info("rpc=%s head_block=%d", url, head)

    # voter -> set of (governor_name, proposal_topic)
    by_voter: dict[str, set] = defaultdict(set)

    for g in GOVERNORS:
        if block_range:
            start = max(head - block_range, g["from_block"])
        else:
            start = g["from_block"]
        log.info("governor=%s scanning %d..%d", g["name"], start, head)
        b = start
        while b < head:
            to = min(b + BLOCK_STEP, head)
            try:
                logs = fetch_logs_range(session, url, g["addr"], b, to)
            except requests.HTTPError as e:
                log.warning("eth_getLogs failed (%s) -> halving step", e)
                if BLOCK_STEP > 1000:
                    to = b + 5000
                    logs = fetch_logs_range(session, url, g["addr"], b, to)
                else:
                    raise
            for lg in logs:
                topics = lg.get("topics", [])
                if len(topics) < 2:
                    continue
                # topics[1] is the indexed voter (left-padded 32-byte address)
                voter_hex = topics[1]
                voter = "0x" + voter_hex[-40:].lower()
                # proposal id is in data[0:32]; just use the tx log index pair
                # as a unique-proposal token to avoid full ABI decoding here
                proposal_key = (g["name"], lg.get("transactionHash", "") + lg.get("logIndex", ""))
                # actually use proposalId from data field
                data_hex = lg.get("data", "0x")
                if len(data_hex) >= 66:
                    proposal_key = (g["name"], data_hex[2:66])
                by_voter[voter].add(proposal_key)
            b = to + 1
            qualified = sum(1 for s in by_voter.values() if len(s) >= min_proposals)
            log.info(
                "  governor=%s block %d/%d: %d unique voters, %d qualified",
                g["name"], to, head, len(by_voter), qualified,
            )
            if qualified >= target_keep:
                break
            time.sleep(0.15)
        if sum(1 for s in by_voter.values() if len(s) >= min_proposals) >= target_keep:
            break

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    kept = 0
    with out_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["address", "chain"])
        for voter, proposals in by_voter.items():
            if len(proposals) >= min_proposals:
                w.writerow([voter, "ethereum"])
                kept += 1
                if kept >= target_keep:
                    break
    log.info("done: kept=%d / target=%d", kept, target_keep)
    return kept


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--out",
        type=Path,
        default=Path("/app/apps/ml/sybilshield/data/labeled/raw/governance-voters.csv"),
    )
    p.add_argument("--target", type=int, default=1000)
    p.add_argument("--min-proposals", type=int, default=2)
    p.add_argument(
        "--block-range",
        type=int,
        default=None,
        help="if set, only scan last N blocks instead of all-time per governor",
    )
    return p.parse_args(argv)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    args = _parse_args(sys.argv[1:])
    n = derive(args.out, target_keep=args.target, min_proposals=args.min_proposals, block_range=args.block_range)
    sys.exit(0 if n > 0 else 2)
