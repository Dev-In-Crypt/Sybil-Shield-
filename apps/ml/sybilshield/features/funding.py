"""Funding-source features for a single address."""
from __future__ import annotations

from collections import Counter

from sybilshield.ingest import KNOWN_EXCHANGES
from sybilshield.types import RawAddressData


def extract_funding_features(
    data: RawAddressData,
    same_funder_counts: dict[str, int] | None = None,
) -> dict[str, float | int | str | bool | None]:
    """
    Returns features about how the address was funded.

    `same_funder_counts` (optional): pre-computed dict of funder -> count of
    addresses in the analysis set funded by that funder. Used to compute
    `same_funder_count` (a critical Sybil signal).
    """
    funder = data.funding_source
    is_exchange = bool(funder and funder.lower() in KNOWN_EXCHANGES)

    same_funder = 0
    if funder and same_funder_counts is not None:
        same_funder = same_funder_counts.get(funder.lower(), 0)

    return {
        "funding_source": funder or "",
        "funding_source_is_exchange": is_exchange,
        "funding_source_is_contract": False,  # would require code-at-address check
        "funding_amount_eth": data.funding_amount_wei / 1e18,
        "funding_timestamp": data.funding_timestamp or 0,
        "same_funder_count": same_funder,
        "funding_chain_depth": 0,  # multi-hop tracing — Phase 3
    }


def compute_same_funder_counts(data_list: list[RawAddressData]) -> dict[str, int]:
    """Pre-compute funder -> #addresses-they-funded across the analysis batch."""
    counter = Counter[str]()
    for d in data_list:
        if d.funding_source and d.funding_source.lower() not in KNOWN_EXCHANGES:
            counter[d.funding_source.lower()] += 1
    return dict(counter)
