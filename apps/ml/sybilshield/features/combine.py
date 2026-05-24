"""Combine all 4 feature modules into a single feature vector."""
from __future__ import annotations

from typing import Any

import igraph as ig

from sybilshield.features.behavioral import extract_behavioral_features
from sybilshield.features.funding import compute_same_funder_counts, extract_funding_features
from sybilshield.features.graph import build_tx_graph, extract_graph_features
from sybilshield.features.temporal import extract_temporal_features
from sybilshield.types import RawAddressData

# Numeric features used by the ML model. Categorical / hash features are
# stored alongside but not fed directly into LightGBM.
FEATURE_NAMES: list[str] = [
    # funding
    "funding_source_is_exchange",
    "funding_amount_eth",
    "same_funder_count",
    # temporal
    "account_age_days",
    "active_days",
    "active_day_ratio",
    "avg_time_between_txs",
    "std_time_between_txs",
    "hour_entropy",
    "day_of_week_entropy",
    "burst_score",
    "max_txs_per_hour",
    "min_inter_tx_seconds",
    "activity_regularity",
    # behavioral
    "total_tx_count",
    "unique_contracts_interacted",
    "unique_tokens_transferred",
    "total_value_eth",
    "avg_tx_value_eth",
    "max_tx_value_eth",
    "has_nft_activity",
    "has_defi_activity",
    "has_bridge_activity",
    "has_governance_activity",
    "protocol_diversity",
    "tx_type_entropy",
    # graph
    "in_degree",
    "out_degree",
    "in_out_ratio",
    "clustering_coefficient",
    "pagerank",
    "subgraph_density",
    "is_in_dense_subgraph",
]


def extract_all_features(
    batch: list[RawAddressData],
    contract_labels: dict[str, str] | None = None,
) -> dict[str, dict[str, Any]]:
    """
    Run all 4 extractors over a batch of addresses.

    Returns: dict address -> features dict.

    Graph features need the whole-batch graph context, so we build it once.
    """
    same_funder = compute_same_funder_counts(batch)
    graph, name_to_idx = build_tx_graph(batch)
    pageranks = graph.pagerank() if graph.vcount() > 0 else []

    out: dict[str, dict[str, Any]] = {}
    for d in batch:
        feats: dict[str, Any] = {}
        feats.update(extract_funding_features(d, same_funder))
        feats.update(extract_temporal_features(d))
        feats.update(extract_behavioral_features(d, contract_labels))
        feats.update(extract_graph_features(d.address, graph, name_to_idx, pageranks))
        out[d.address] = feats
    return out


def to_feature_vector(feats: dict[str, Any]) -> list[float]:
    """Convert a features dict to a numeric vector in FEATURE_NAMES order."""
    vec: list[float] = []
    for name in FEATURE_NAMES:
        v = feats.get(name, 0)
        if isinstance(v, bool):
            v = 1.0 if v else 0.0
        try:
            vec.append(float(v))
        except (TypeError, ValueError):
            vec.append(0.0)
    return vec
