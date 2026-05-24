"""Transaction-behavior features."""
from __future__ import annotations

import hashlib
from collections import Counter

import numpy as np
from scipy.stats import entropy

from sybilshield.types import RawAddressData

# Heuristic protocol fingerprints. In production this comes from Etherscan labels.
_BRIDGE_HINTS = {"stargate", "hop", "across", "synapse", "wormhole", "layerzero"}
_DEFI_HINTS = {"uniswap", "curve", "aave", "compound", "balancer", "sushiswap"}
_NFT_HINTS = {"opensea", "blur", "looksrare", "x2y2"}
_GOV_HINTS = {"governor", "snapshot", "ens registrar"}


def extract_behavioral_features(
    data: RawAddressData,
    contract_labels: dict[str, str] | None = None,
) -> dict[str, float | int | bool | str]:
    """
    Returns behavior features. `contract_labels` maps contract address -> label
    (e.g. 'uniswap-v3-router'). Without it we degrade gracefully.
    """
    labels = contract_labels or {}
    txs = data.transactions
    addr = data.address.lower()

    if not txs:
        return _defaults()

    contracts_touched: Counter[str] = Counter()
    tokens_touched: set[str] = set()
    tx_types: Counter[str] = Counter()
    values_wei: list[int] = []
    sequence: list[str] = []

    has_nft = has_defi = has_bridge = has_gov = False

    for t in txs:
        counterparty = t.to_addr if t.from_addr == addr else t.from_addr
        contracts_touched[counterparty] += 1
        if t.token_address:
            tokens_touched.add(t.token_address.lower())
        tx_types[t.category] += 1
        values_wei.append(t.value_wei)

        label = labels.get(counterparty, "").lower()
        if label:
            if any(h in label for h in _NFT_HINTS):
                has_nft = True
            if any(h in label for h in _DEFI_HINTS):
                has_defi = True
            if any(h in label for h in _BRIDGE_HINTS):
                has_bridge = True
            if any(h in label for h in _GOV_HINTS):
                has_gov = True
            sequence.append(label.split("-")[0])
        else:
            sequence.append(counterparty[:10])

    type_counts = np.array(list(tx_types.values()), dtype=float)
    type_ent = float(entropy(type_counts + 1)) if len(type_counts) > 0 else 0.0

    values_eth = np.array(values_wei) / 1e18
    seq_hash = hashlib.sha1(("|".join(sequence[:50])).encode()).hexdigest()[:16]

    top3 = [c for c, _ in contracts_touched.most_common(3)]

    return {
        "total_tx_count": len(txs),
        "unique_contracts_interacted": len(contracts_touched),
        "unique_tokens_transferred": len(tokens_touched),
        "total_value_eth": float(values_eth.sum()),
        "avg_tx_value_eth": float(values_eth.mean()) if len(values_eth) else 0.0,
        "max_tx_value_eth": float(values_eth.max()) if len(values_eth) else 0.0,
        "has_nft_activity": has_nft,
        "has_defi_activity": has_defi,
        "has_bridge_activity": has_bridge,
        "has_governance_activity": has_gov,
        "protocol_diversity": len(set(sequence)),
        "tx_type_entropy": type_ent,
        "sequence_hash": seq_hash,
        "top3_contracts": ",".join(top3),
    }


def _defaults() -> dict[str, float | int | bool | str]:
    return {
        "total_tx_count": 0,
        "unique_contracts_interacted": 0,
        "unique_tokens_transferred": 0,
        "total_value_eth": 0.0,
        "avg_tx_value_eth": 0.0,
        "max_tx_value_eth": 0.0,
        "has_nft_activity": False,
        "has_defi_activity": False,
        "has_bridge_activity": False,
        "has_governance_activity": False,
        "protocol_diversity": 0,
        "tx_type_entropy": 0.0,
        "sequence_hash": "0" * 16,
        "top3_contracts": "",
    }
