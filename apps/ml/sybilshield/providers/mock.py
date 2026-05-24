"""
Mock provider for offline tests and local development.

Deterministic synthetic data: address hash seeds a small transaction history.
Specific address patterns can be configured to produce 'sybil-like' or
'genuine-like' shapes used by the unit tests.
"""
from __future__ import annotations

import hashlib
import random

from sybilshield.providers.base import OnChainProvider
from sybilshield.types import Transaction


def _seed(address: str) -> int:
    return int(hashlib.sha256(address.encode()).hexdigest()[:12], 16)


def _hash_addr(seed_str: str) -> str:
    h = hashlib.sha256(seed_str.encode()).hexdigest()
    return "0x" + h[:40]


class MockProvider(OnChainProvider):
    """Generates deterministic synthetic on-chain data."""

    def __init__(self, scenarios: dict[str, str] | None = None) -> None:
        super().__init__()
        # Map address -> scenario name. Default: "random_genuine".
        self.scenarios: dict[str, str] = scenarios or {}

    def get_transactions(self, address: str, chain: str, max_count: int = 1000) -> list[Transaction]:
        self.quota.requests_made += 2  # mimic 2 calls (in + out)
        self.quota.cu_consumed += 300

        address = address.lower()
        scenario = self.scenarios.get(address, "random_genuine")
        rng = random.Random(_seed(address))

        if scenario == "sybil_scripted":
            return self._scripted_pattern(address, chain, rng)
        if scenario == "sybil_shared_funder":
            funder = self.scenarios.get(f"{address}:funder", _hash_addr("shared-funder"))
            return self._shared_funder_pattern(address, chain, rng, funder)
        if scenario == "empty":
            return []
        return self._genuine_pattern(address, chain, rng)

    def get_balance_usd(self, address: str, chain: str) -> float:
        self.quota.requests_made += 1
        self.quota.cu_consumed += 30
        rng = random.Random(_seed(address) ^ 0xBEEF)
        return round(rng.uniform(0, 5000), 2)

    # ---------- scenario implementations ----------

    def _genuine_pattern(self, address: str, chain: str, rng: random.Random) -> list[Transaction]:
        """Diverse activity over 1-3 years with irregular timing."""
        n_txs = rng.randint(40, 200)
        base_ts = 1_650_000_000 + rng.randint(0, 30_000_000)
        txs: list[Transaction] = []
        # Funding from random EOA (genuine pattern: funded once long ago)
        funder = _hash_addr(f"genuine-funder-{rng.randint(0, 10_000)}")
        txs.append(
            Transaction(
                tx_hash=_hash_addr(f"{address}-fund"),
                from_addr=funder,
                to_addr=address,
                value_wei=int(rng.uniform(0.01, 0.5) * 1e18),
                timestamp=base_ts,
                chain=chain,
                category="external",
            ),
        )
        cur = base_ts + rng.randint(3600, 86400 * 7)
        contracts = [_hash_addr(f"contract-{i}") for i in range(15)]
        for i in range(n_txs):
            contract = rng.choice(contracts)
            # Irregular gaps: log-normal-ish
            gap = int(rng.expovariate(1 / (86400 * 3)))
            cur += max(60, gap)
            outgoing = rng.random() > 0.4
            txs.append(
                Transaction(
                    tx_hash=_hash_addr(f"{address}-{i}"),
                    from_addr=address if outgoing else contract,
                    to_addr=contract if outgoing else address,
                    value_wei=int(rng.uniform(0.001, 1.5) * 1e18),
                    timestamp=cur,
                    chain=chain,
                    category="external" if rng.random() > 0.3 else "erc20",
                ),
            )
        return txs

    def _scripted_pattern(self, address: str, chain: str, rng: random.Random) -> list[Transaction]:
        """
        Identical sequence of contracts at near-uniform intervals.
        Pattern is deliberately deterministic across addresses (fixed n_txs,
        fixed start window) so cluster detectors can group them.
        """
        n_txs = 20
        # All scripted wallets share an activity window (typical Sybil farm batch).
        base_ts = 1_700_000_000 + rng.randint(0, 3600)
        funder = _hash_addr("sybil-master-funder")
        sequence = [_hash_addr(f"sybil-step-{i}") for i in range(4)]
        txs: list[Transaction] = [
            Transaction(
                tx_hash=_hash_addr(f"{address}-fund"),
                from_addr=funder,
                to_addr=address,
                value_wei=int(0.05 * 1e18),  # uniform funding amount
                timestamp=base_ts,
                chain=chain,
                category="external",
            ),
        ]
        # Tight inter-tx spacing including the first action after funding.
        cur = base_ts + rng.randint(28, 32)
        for i in range(n_txs):
            step = sequence[i % len(sequence)]
            cur += rng.randint(28, 32)  # ~30s apart (script)
            txs.append(
                Transaction(
                    tx_hash=_hash_addr(f"{address}-s-{i}"),
                    from_addr=address,
                    to_addr=step,
                    value_wei=int(0.01 * 1e18),
                    timestamp=cur,
                    chain=chain,
                    category="external",
                ),
            )
        return txs

    def _shared_funder_pattern(
        self, address: str, chain: str, rng: random.Random, funder: str
    ) -> list[Transaction]:
        base_ts = 1_700_000_000 + rng.randint(0, 3600)  # all within 1h
        txs = self._scripted_pattern(address, chain, rng)
        # Replace funding tx with shared funder
        txs[0] = Transaction(
            tx_hash=_hash_addr(f"{address}-fund"),
            from_addr=funder,
            to_addr=address,
            value_wei=int(0.05 * 1e18),
            timestamp=base_ts,
            chain=chain,
            category="external",
        )
        return txs
