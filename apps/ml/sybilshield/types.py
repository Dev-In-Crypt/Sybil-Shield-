"""Shared types for the ML pipeline."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

Chain = Literal[
    "ethereum", "arbitrum", "optimism", "base", "polygon", "bsc", "avalanche", "linea"
]


@dataclass
class Transaction:
    tx_hash: str
    from_addr: str
    to_addr: str
    value_wei: int
    timestamp: int  # unix seconds
    chain: str
    category: str  # external | erc20 | erc721 | internal
    token_address: str | None = None
    block_number: int | None = None

    def __post_init__(self) -> None:
        self.from_addr = (self.from_addr or "").lower()
        self.to_addr = (self.to_addr or "").lower()


@dataclass
class RawAddressData:
    address: str
    chain: str
    transactions: list[Transaction] = field(default_factory=list)
    funding_source: str | None = None
    funding_timestamp: int | None = None
    funding_amount_wei: int = 0
    first_tx_timestamp: int | None = None
    last_tx_timestamp: int | None = None
    total_tx_count: int = 0
    balances_usd: float = 0.0


@dataclass
class Cluster:
    id: str
    method: str  # "funding" | "behavior" | "graph" | "cross_chain" | "multi"
    addresses: list[str]
    size: int
    confidence: float
    evidence: str
    chain: str | None = None
