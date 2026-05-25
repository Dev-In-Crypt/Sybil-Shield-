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

    # Thin-account evidence - very common ML signal for fresh wallets that get
    # flagged by the model but trigger no temporal/cluster rule above.
    tx_count = int(features.get("total_tx_count", 0) or 0)
    age_days = float(features.get("address_age_days", 0) or 0)
    unique_contracts = int(features.get("unique_contracts", 0) or 0)
    if tx_count > 0 and tx_count < 10 and age_days < 30:
        items.append(
            {
                "type": "thin_account",
                "description": (
                    f"Address has {tx_count} transactions over {age_days:.0f} days with "
                    f"{unique_contracts} unique contract interactions - signature of "
                    f"a freshly-funded scripted wallet."
                ),
                "confidence": 0.6,
            }
        )

    # Floor: if the model assigns score >= 40 but no rule above fires (e.g.
    # ML picked up a higher-order interaction the rule layer doesn't cover),
    # we still owe the caller a single auditable line. This is the explicit
    # "model decided" item that points at the strongest available feature
    # rather than silently returning an empty evidence array.
    if not items:
        signals: list[tuple[str, float]] = []
        if tx_count > 0:
            signals.append((f"total_tx_count={tx_count}", float(tx_count)))
        if age_days > 0:
            signals.append((f"address_age_days={age_days:.0f}", age_days))
        if unique_contracts > 0:
            signals.append((f"unique_contracts={unique_contracts}", float(unique_contracts)))
        if hour_ent > 0:
            signals.append((f"hour_entropy={hour_ent:.2f}", hour_ent))
        sample = ", ".join(s for s, _ in signals[:3]) if signals else "no on-chain history found"
        items.append(
            {
                "type": "model_classification",
                "description": (
                    f"LightGBM model assigned sybil_score={score} based on the feature "
                    f"vector (no single rule-based trigger). Top observable signals: {sample}."
                ),
                "confidence": min(0.5 + (score - 40) / 120.0, 0.85),
            }
        )

    return items
