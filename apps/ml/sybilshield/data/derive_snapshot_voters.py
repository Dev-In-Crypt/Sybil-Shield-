"""
Derive G2 genuine label: addresses that voted on >=5 Snapshot.org proposals
across >=3 unique spaces. Snapshot is a public off-chain governance platform —
voting requires holding the space's token / NFT, so prolific voters are
strongly human-correlated. Crucial: this gives us genuine signal WITHOUT
needing the ENS subgraph (which now requires a Graph API key).

Data source: https://hub.snapshot.org/graphql (free, no auth, rate-limited to
about 60 req/min — we sleep accordingly).

Output: apps/ml/sybilshield/data/labeled/raw/snapshot-voters.csv
       address,chain
       0xabc...,ethereum
"""
from __future__ import annotations

import argparse
import csv
import logging
import sys
import time
from collections import defaultdict
from pathlib import Path

import requests

log = logging.getLogger(__name__)

SNAPSHOT_URL = "https://hub.snapshot.org/graphql"
PAGE_SIZE = 1000
MIN_VOTES = 5
MIN_SPACES = 3
SLEEP_BETWEEN_PAGES = 1.2  # sec, polite


def fetch_votes_page(
    session: requests.Session,
    skip: int,
    page_size: int = PAGE_SIZE,
    created_gt: int = 1690000000,  # ~2023-07-22 onward
) -> list[dict]:
    query = """
    query($first: Int!, $skip: Int!, $cg: Int!) {
      votes(
        first: $first
        skip: $skip
        orderBy: "created"
        orderDirection: desc
        where: { created_gt: $cg }
      ) {
        voter
        space { id }
      }
    }
    """
    resp = session.post(
        SNAPSHOT_URL,
        json={"query": query, "variables": {"first": page_size, "skip": skip, "cg": created_gt}},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if "errors" in data:
        raise RuntimeError(f"snapshot errors: {data['errors']}")
    return data.get("data", {}).get("votes", [])


def derive(
    out_csv: Path,
    target_keep: int = 2000,
    max_pages: int = 30,
    session: requests.Session | None = None,
) -> int:
    """
    Walks Snapshot vote pages, aggregates by voter, keeps only voters with
    >=MIN_VOTES across >=MIN_SPACES until target_keep is reached or pages
    exhausted.
    """
    session = session or requests.Session()
    session.headers.update({"User-Agent": "SybilShield-Research/0.1"})

    # voter -> {spaces: set, votes: count}
    by_voter: dict[str, dict] = defaultdict(lambda: {"spaces": set(), "votes": 0})

    for page_n in range(max_pages):
        skip = page_n * PAGE_SIZE
        try:
            page = fetch_votes_page(session, skip)
        except requests.HTTPError as e:
            log.warning("page %d failed (%s); backing off 10s", page_n, e)
            time.sleep(10)
            continue
        if not page:
            log.info("page %d empty, stopping", page_n)
            break

        for v in page:
            voter = (v.get("voter") or "").lower()
            space = ((v.get("space") or {}).get("id") or "").lower()
            if not voter.startswith("0x") or len(voter) != 42:
                continue
            if not space:
                continue
            by_voter[voter]["spaces"].add(space)
            by_voter[voter]["votes"] += 1

        qualified = sum(
            1 for d in by_voter.values()
            if d["votes"] >= MIN_VOTES and len(d["spaces"]) >= MIN_SPACES
        )
        log.info(
            "page %d: +%d votes, %d unique voters, %d qualified so far",
            page_n, len(page), len(by_voter), qualified,
        )
        if qualified >= target_keep:
            break
        time.sleep(SLEEP_BETWEEN_PAGES)

    # Filter + emit
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    kept = 0
    with out_csv.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["address", "chain"])
        for voter, d in by_voter.items():
            if d["votes"] >= MIN_VOTES and len(d["spaces"]) >= MIN_SPACES:
                writer.writerow([voter, "ethereum"])
                kept += 1
                if kept >= target_keep:
                    break

    log.info("done: kept=%d (target=%d)", kept, target_keep)
    return kept


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--out",
        type=Path,
        default=Path("/app/apps/ml/sybilshield/data/labeled/raw/snapshot-voters.csv"),
    )
    p.add_argument("--target", type=int, default=2000)
    p.add_argument("--max-pages", type=int, default=30)
    return p.parse_args(argv)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    args = _parse_args(sys.argv[1:])
    n = derive(args.out, target_keep=args.target, max_pages=args.max_pages)
    sys.exit(0 if n > 0 else 2)
