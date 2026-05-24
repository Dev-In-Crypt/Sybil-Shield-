"""Alchemy provider — real on-chain data fetcher.

CU costs (approximate, as of 2026):
  alchemy_getAssetTransfers: 150 CU per call
  alchemy_getTokenBalances:   26 CU per call
At Scale tier (1500 CU/sec sustained ≈ 10 req/sec) so we throttle accordingly.
"""
from __future__ import annotations

import logging
import os
import time
from collections import deque
from typing import Any

import requests

from sybilshield.providers.base import OnChainProvider
from sybilshield.types import Transaction

log = logging.getLogger(__name__)

CHAIN_TO_NETWORK = {
    "ethereum": "eth-mainnet",
    "arbitrum": "arb-mainnet",
    "optimism": "opt-mainnet",
    "base": "base-mainnet",
    "polygon": "polygon-mainnet",
    "bsc": "bnb-mainnet",
    "avalanche": "avax-mainnet",
    "linea": "linea-mainnet",
}


class RateLimiter:
    def __init__(self, rps: float) -> None:
        self.rps = rps
        self.window = deque[float]()

    def wait(self) -> None:
        now = time.monotonic()
        while self.window and now - self.window[0] > 1.0:
            self.window.popleft()
        if len(self.window) >= self.rps:
            sleep = 1.0 - (now - self.window[0])
            if sleep > 0:
                time.sleep(sleep)
        self.window.append(time.monotonic())


class AlchemyProvider(OnChainProvider):
    def __init__(self, api_key: str | None = None, rps: float = 10.0) -> None:
        super().__init__()
        self.api_key = api_key or os.environ.get("ALCHEMY_API_KEY", "")
        if not self.api_key:
            raise ValueError("ALCHEMY_API_KEY not set")
        self.limiter = RateLimiter(rps)
        self.session = requests.Session()

    def _url(self, chain: str) -> str:
        network = CHAIN_TO_NETWORK.get(chain)
        if not network:
            raise ValueError(f"unsupported chain: {chain}")
        return f"https://{network}.g.alchemy.com/v2/{self.api_key}"

    def _rpc(self, chain: str, method: str, params: list[Any]) -> Any:
        self.limiter.wait()
        self.quota.requests_made += 1
        # rough CU accounting
        self.quota.cu_consumed += 150 if "getAssetTransfers" in method else 50
        resp = self.session.post(
            self._url(chain),
            json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            raise RuntimeError(f"alchemy error: {data['error']}")
        return data["result"]

    def get_transactions(self, address: str, chain: str, max_count: int = 1000) -> list[Transaction]:
        address = address.lower()
        out: list[Transaction] = []
        for direction in ("from", "to"):
            params = [
                {
                    "fromBlock": "0x0",
                    "toBlock": "latest",
                    "category": ["external", "erc20"],
                    "withMetadata": True,
                    "maxCount": hex(max_count),
                    "order": "asc",
                    ("fromAddress" if direction == "from" else "toAddress"): address,
                }
            ]
            try:
                result = self._rpc(chain, "alchemy_getAssetTransfers", params)
            except Exception as e:
                log.warning("alchemy fetch failed for %s/%s: %s", address, direction, e)
                continue
            for t in result.get("transfers", []):
                ts = int(
                    time.mktime(time.strptime(t["metadata"]["blockTimestamp"][:19], "%Y-%m-%dT%H:%M:%S"))
                )
                value_wei = int(float(t.get("value") or 0) * 1e18)
                out.append(
                    Transaction(
                        tx_hash=t.get("hash", ""),
                        from_addr=(t.get("from") or "").lower(),
                        to_addr=(t.get("to") or "").lower(),
                        value_wei=value_wei,
                        timestamp=ts,
                        chain=chain,
                        category=t.get("category", "external"),
                        token_address=t.get("rawContract", {}).get("address"),
                        block_number=int(t.get("blockNum", "0x0"), 16),
                    ),
                )
        return out

    def get_balance_usd(self, address: str, chain: str) -> float:
        # Cheap stub - production uses Dune Sim or DefiLlama.
        return 0.0
