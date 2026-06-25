"""
Ingestion service: orchestrates fetching raw data per address from a provider,
deriving funding source, and writing into RawAddressData.
"""
from __future__ import annotations

import logging
from collections.abc import Callable

# KNOWN_EXCHANGES is the curated CEX hot-wallet + bridge set. Sourced from
# data/known_exchanges.py (single source of truth) and re-exported here so the
# existing `from sybilshield.ingest import KNOWN_EXCHANGES` imports keep working.
from sybilshield.data.known_exchanges import KNOWN_EXCHANGES  # noqa: F401  (re-export)
from sybilshield.providers.base import OnChainProvider
from sybilshield.types import RawAddressData

log = logging.getLogger(__name__)


def ingest_address(
    provider: OnChainProvider,
    address: str,
    chain: str,
) -> RawAddressData:
    """Fetch all data for an address and derive the funding-source fields."""
    address = address.lower()
    txs = provider.get_transactions(address, chain)
    balance = provider.get_balance_usd(address, chain)

    incoming = [t for t in txs if t.to_addr == address and t.value_wei > 0]
    incoming.sort(key=lambda t: t.timestamp)
    first_incoming = incoming[0] if incoming else None

    timestamps = [t.timestamp for t in txs]
    return RawAddressData(
        address=address,
        chain=chain,
        transactions=txs,
        funding_source=first_incoming.from_addr if first_incoming else None,
        funding_timestamp=first_incoming.timestamp if first_incoming else None,
        funding_amount_wei=first_incoming.value_wei if first_incoming else 0,
        first_tx_timestamp=min(timestamps) if timestamps else None,
        last_tx_timestamp=max(timestamps) if timestamps else None,
        total_tx_count=len(txs),
        balances_usd=balance,
    )


def ingest_batch(
    provider: OnChainProvider,
    addresses: list[str],
    chain: str,
    on_each: Callable[[int, int, RawAddressData], None] | None = None,
) -> list[RawAddressData]:
    """Sequential ingestion. Real worker uses BullMQ + parallel workers."""
    out = []
    for i, addr in enumerate(addresses):
        try:
            data = ingest_address(provider, addr, chain)
        except Exception as e:
            log.warning("ingest failed for %s: %s", addr, e)
            data = RawAddressData(address=addr.lower(), chain=chain)
        out.append(data)
        if on_each:
            on_each(i + 1, len(addresses), data)
    return out


def is_exchange_funded(funding_source: str | None) -> bool:
    if not funding_source:
        return False
    return funding_source.lower() in KNOWN_EXCHANGES
