"""
Ingestion service: orchestrates fetching raw data per address from a provider,
deriving funding source, and writing into RawAddressData.
"""
from __future__ import annotations

import logging
from collections.abc import Callable

from sybilshield.providers.base import OnChainProvider
from sybilshield.types import RawAddressData

log = logging.getLogger(__name__)

# Heuristic: known exchange / aggregator addresses. In production this list
# is sourced from Etherscan labels + curated by analysts.
KNOWN_EXCHANGES: set[str] = {
    "0x28c6c06298d514db089934071355e5743bf21d60",  # binance
    "0x21a31ee1afc51d94c2efccaa2092ad1028285549",  # binance 15
    "0xdfd5293d8e347dfe59e90efd55b2956a1343963d",  # binance 16
    "0x56eddb7aa87536c09ccc2793473599fd21a8b17f",  # binance 17
    "0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43",  # coinbase
    "0x71660c4005ba85c37ccec55d0c4493e66fe775d3",  # coinbase 1
    "0x503828976d22510aad0201ac7ec88293211d23da",  # coinbase 2
    "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740",  # coinbase 3
    "0x3cd751e6b0078be393132286c442345e5dc49699",  # coinbase 4
    "0x59a5208b32e627891c389ebafc644145224006e8",  # huobi
    "0xab5c66752a9e8167967685f1450532fb96d5d24f",  # huobi 2
    "0xfe9e8709d3215310075d67e3ed32a380ccf451c8",  # bitfinex
}


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
