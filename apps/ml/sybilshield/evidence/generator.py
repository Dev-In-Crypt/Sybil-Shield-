"""
Evidence report generator.

For every address with score >= 40, produce a list of evidence items pointing
at specific feature values or cluster memberships. No fabricated claims -
every item must be traceable to a feature or a cluster the address belongs to.
"""
from __future__ import annotations

from typing import Any

from sybilshield.types import Cluster


def generate_evidence(
    address: str,
    score: int,
    features: dict[str, Any],
    cluster_ids: list[str],
    clusters_by_id: dict[str, Cluster],
) -> list[dict[str, Any]]:
    """Returns list of evidence items for the address."""
    if score < 40:
        return []
    items: list[dict[str, Any]] = []

    # Cluster-based evidence
    for cid in cluster_ids:
        c = clusters_by_id.get(cid)
        if not c:
            continue
        if c.method == "funding":
            items.append(
                {
                    "type": "shared_funding",
                    "description": c.evidence,
                    "cluster_id": c.id,
                    "cluster_size": c.size,
                    "confidence": c.confidence,
                }
            )
        elif c.method == "behavior":
            items.append(
                {
                    "type": "behavioral_clone",
                    "description": c.evidence,
                    "cluster_id": c.id,
                    "cluster_size": c.size,
                    "confidence": c.confidence,
                }
            )
        elif c.method == "graph":
            items.append(
                {
                    "type": "graph_cluster",
                    "description": c.evidence,
                    "cluster_id": c.id,
                    "cluster_size": c.size,
                    "confidence": c.confidence,
                }
            )
        elif c.method == "cross_chain":
            items.append(
                {
                    "type": "cross_chain_link",
                    "description": c.evidence,
                    "cluster_id": c.id,
                    "cluster_size": c.size,
                    "confidence": c.confidence,
                }
            )

    # Temporal evidence
    hour_ent = float(features.get("hour_entropy", 0) or 0)
    min_inter = float(features.get("min_inter_tx_seconds", 0) or 0)
    activity_reg = float(features.get("activity_regularity", 0) or 0)
    if hour_ent > 0 and hour_ent < 1.5:
        items.append(
            {
                "type": "low_entropy",
                "description": (
                    f"Activity hour-of-day entropy {hour_ent:.2f} - much lower than typical "
                    f"genuine users (>2.5). Consistent with scripted operation."
                ),
                "confidence": 0.7,
            }
        )
    if 0 < min_inter < 60:
        items.append(
            {
                "type": "temporal_scripting",
                "description": (
                    f"Minimum interval between transactions is {min_inter:.0f}s - shorter "
                    f"than humanly plausible reaction time across many txs."
                ),
                "confidence": 0.75,
            }
        )
    if activity_reg > 0.7:
        items.append(
            {
                "type": "high_autocorrelation",
                "description": (
                    f"Inter-transaction gaps show autocorrelation of {activity_reg:.2f} - "
                    f"consistent with automation."
                ),
                "confidence": 0.65,
            }
        )

    # Same-funder evidence (when not already captured by funding cluster)
    same_funder = int(features.get("same_funder_count", 0) or 0)
    if same_funder >= 3 and not any(i["type"] == "shared_funding" for i in items):
        items.append(
            {
                "type": "shared_funding_weak",
                "description": (
                    f"Funding source shared with {same_funder - 1} other addresses in this "
                    f"analysis (below cluster threshold, but signal)."
                ),
                "confidence": 0.5,
            }
        )

    return items
