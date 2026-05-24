"""
End-to-end analysis pipeline orchestrator.

Stages:
  1. Ingest on-chain data (provider abstraction)
  2. Extract features (4 modules + combine)
  3. Cluster (funding, behavior, graph, cross-chain)
  4. Add cluster membership as features
  5. ML scoring
  6. Generate evidence
  7. Return / persist results
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from sybilshield.clustering import (
    cluster_by_behavior,
    cluster_by_funding_source,
    detect_communities,
    link_cross_chain,
    merge_clusters,
)
from sybilshield.evidence import generate_evidence
from sybilshield.features.combine import extract_all_features
from sybilshield.ingest import ingest_batch
from sybilshield.providers.base import OnChainProvider
from sybilshield.scoring.model import SybilModel, label_from_score
from sybilshield.scoring.predict import predict_batch
from sybilshield.types import Cluster

log = logging.getLogger(__name__)


@dataclass
class AnalysisResult:
    analysis_id: str
    address_count: int
    scores: dict[str, dict[str, Any]] = field(default_factory=dict)
    clusters: list[Cluster] = field(default_factory=list)
    summary: dict[str, int] = field(default_factory=dict)
    cu_consumed: int = 0


class SybilShieldPipeline:
    """End-to-end pipeline. Designed to be runnable in a single process for
    Phase 1-2; in production each stage moves to a BullMQ worker."""

    def __init__(
        self,
        provider: OnChainProvider,
        model: SybilModel | None = None,
        contract_labels: dict[str, str] | None = None,
    ) -> None:
        self.provider = provider
        self.model = model
        self.contract_labels = contract_labels or {}

    def run(
        self,
        analysis_id: str,
        addresses: list[str],
        chains: list[str],
    ) -> AnalysisResult:
        # Normalize / dedupe
        addresses = sorted({a.lower() for a in addresses})
        log.info("[%s] starting analysis: %d addresses on %s", analysis_id, len(addresses), chains)

        # 1. Ingest (one provider call per address per chain)
        batches_by_chain: dict[str, list] = {}
        for chain in chains:
            batches_by_chain[chain] = ingest_batch(self.provider, addresses, chain)

        # Flat list for clustering that doesn't care about chain
        primary_chain = chains[0]
        primary_batch = batches_by_chain[primary_chain]

        # 2. Features (per-chain primary)
        features = extract_all_features(primary_batch, self.contract_labels)

        # 3. Clustering
        funding_clusters = cluster_by_funding_source(primary_batch)
        behavior_clusters = cluster_by_behavior(
            [d.address for d in primary_batch], features
        )
        graph_clusters = detect_communities(primary_batch)
        cross_chain_clusters = link_cross_chain(batches_by_chain) if len(chains) > 1 else []
        all_clusters, addr_to_clusters = merge_clusters(
            funding_clusters, behavior_clusters, graph_clusters, cross_chain_clusters
        )
        clusters_by_id = {c.id: c for c in all_clusters}

        # 4. Augment features with cluster memberships
        for addr, feats in features.items():
            ids = addr_to_clusters.get(addr, [])
            feats["cluster_count"] = len(ids)
            feats["in_funding_cluster"] = any(i.startswith("F-") for i in ids)
            feats["in_behavior_cluster"] = any(i.startswith("B-") for i in ids)
            feats["in_graph_cluster"] = any(i.startswith("G-") for i in ids)
            feats["in_cross_chain_cluster"] = any(i.startswith("X-") for i in ids)

        # 5. Scoring
        if self.model is None:
            log.warning("[%s] no ML model loaded - using rule-based fallback scoring", analysis_id)
            preds = _rule_based_scoring(features, addr_to_clusters)
        else:
            preds = predict_batch(self.model, features)

        # 6. Evidence
        result_scores: dict[str, dict[str, Any]] = {}
        for addr, pred in preds.items():
            score = int(pred["sybil_score"])
            ids = addr_to_clusters.get(addr, [])
            biggest_cluster = max(
                (clusters_by_id[i] for i in ids if i in clusters_by_id),
                key=lambda c: c.size,
                default=None,
            )
            evidence = generate_evidence(addr, score, features[addr], ids, clusters_by_id)
            result_scores[addr] = {
                "address": addr,
                "sybil_score": score,
                "label": label_from_score(score),
                "confidence": pred.get("confidence", 0.0),
                "cluster_id": biggest_cluster.id if biggest_cluster else None,
                "cluster_size": biggest_cluster.size if biggest_cluster else None,
                "features": features[addr],
                "evidence": evidence,
            }

        summary = _summarize(result_scores, all_clusters)
        return AnalysisResult(
            analysis_id=analysis_id,
            address_count=len(addresses),
            scores=result_scores,
            clusters=all_clusters,
            summary=summary,
            cu_consumed=self.provider.quota.cu_consumed,
        )


def _summarize(scores: dict[str, dict[str, Any]], clusters: list[Cluster]) -> dict[str, int]:
    sybil = sum(1 for v in scores.values() if v["sybil_score"] >= 70)
    suspicious = sum(1 for v in scores.values() if 40 <= v["sybil_score"] < 70)
    genuine = sum(1 for v in scores.values() if v["sybil_score"] < 40)
    return {
        "total_scored": len(scores),
        "sybil_count": sybil,
        "suspicious_count": suspicious,
        "genuine_count": genuine,
        "cluster_count": len(clusters),
        "largest_cluster_size": max((c.size for c in clusters), default=0),
    }


def _rule_based_scoring(
    features: dict[str, dict[str, Any]],
    addr_to_clusters: dict[str, list[str]],
) -> dict[str, dict[str, Any]]:
    """
    Fallback scoring when no ML model is available. Uses transparent rules.
    This is used for MVP / smoke tests; production replaces with trained model.
    """
    out = {}
    for addr, f in features.items():
        score = 0
        ids = addr_to_clusters.get(addr, [])
        if any(i.startswith("F-") for i in ids):
            score += 35
        if any(i.startswith("B-") for i in ids):
            score += 25
        if any(i.startswith("G-") for i in ids):
            score += 20
        if any(i.startswith("X-") for i in ids):
            score += 15
        hour_ent = float(f.get("hour_entropy") or 0)
        if 0 < hour_ent < 1.2:
            score += 15
        min_inter = float(f.get("min_inter_tx_seconds") or 0)
        if 0 < min_inter < 60:
            score += 10
        activity_reg = float(f.get("activity_regularity") or 0)
        if activity_reg > 0.7:
            score += 10
        if int(f.get("total_tx_count") or 0) < 5:
            score += 5  # very thin account
        score = max(0, min(100, score))
        out[addr] = {
            "sybil_score": score,
            "confidence": min(1.0, score / 100.0),
            "label": label_from_score(score),
        }
    return out
