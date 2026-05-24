"""Provider interface — abstracts away Alchemy / self-hosted node / mock."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from sybilshield.types import Transaction


@dataclass
class ProviderQuota:
    requests_made: int = 0
    cu_consumed: int = 0


class OnChainProvider(ABC):
    """Fetches on-chain data for addresses. Implementations: Alchemy, SelfHostedNode, Mock."""

    quota: ProviderQuota

    def __init__(self) -> None:
        self.quota = ProviderQuota()

    @abstractmethod
    def get_transactions(
        self,
        address: str,
        chain: str,
        max_count: int = 1000,
    ) -> list[Transaction]:
        """Return all transactions for `address` on `chain`, both directions."""

    @abstractmethod
    def get_balance_usd(self, address: str, chain: str) -> float:
        """Return current USD balance estimate for the address."""

    def reset_quota(self) -> None:
        self.quota = ProviderQuota()
