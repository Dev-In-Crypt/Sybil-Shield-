"""
Decision presets — Python mirror of apps/api/src/lib/presets.ts.

Keep the two files in sync manually for v1. Any deviation produces divergent
decisions between server-computed (worker uses the TS version) and any
Python-side preview. The worker is canonical; this module exists so we can
compute decisions in offline retraining / eval scripts without a Node round-trip.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

Decision = Literal["DROP", "REVIEW", "KEEP"]
Confidence = Literal["high", "medium", "low"]
PresetName = Literal["airdrop", "dao", "grant", "balanced"]


@dataclass(frozen=True)
class Threshold:
    score_gte: int | None
    cluster_size_gte: int | None


@dataclass(frozen=True)
class PresetConfig:
    description: str
    drop: Threshold
    review: Threshold


PRESETS: dict[PresetName, PresetConfig] = {
    "airdrop": PresetConfig(
        description="Aggressive filtering for token distributions",
        drop=Threshold(score_gte=85, cluster_size_gte=10),
        review=Threshold(score_gte=60, cluster_size_gte=5),
    ),
    "dao": PresetConfig(
        description="Conservative — false-positives matter more in governance",
        drop=Threshold(score_gte=90, cluster_size_gte=3),
        review=Threshold(score_gte=50, cluster_size_gte=2),
    ),
    "grant": PresetConfig(
        description="Cluster-first — check if applicants are connected entities",
        drop=Threshold(score_gte=None, cluster_size_gte=5),
        review=Threshold(score_gte=70, cluster_size_gte=2),
    ),
    "balanced": PresetConfig(
        description="Default symmetric threshold around the model's separability point",
        drop=Threshold(score_gte=80, cluster_size_gte=None),
        review=Threshold(score_gte=50, cluster_size_gte=None),
    ),
}


@dataclass(frozen=True)
class DecisionResult:
    decision: Decision
    confidence: Confidence
    rationale_codes: list[str] = field(default_factory=list)


def compute_decision(
    score: int,
    cluster_size: int | None,
    preset: PresetName,
    extra_codes: list[str] | None = None,
) -> DecisionResult:
    """Apply the preset's thresholds to a single address."""
    cfg = PRESETS[preset]
    codes: list[str] = list(extra_codes or [])
    cs = cluster_size or 0

    score_drops = cfg.drop.score_gte is not None and score >= cfg.drop.score_gte
    cluster_drops = cfg.drop.cluster_size_gte is not None and cs >= cfg.drop.cluster_size_gte
    score_reviews = cfg.review.score_gte is not None and score >= cfg.review.score_gte
    cluster_reviews = cfg.review.cluster_size_gte is not None and cs >= cfg.review.cluster_size_gte

    if score_drops:
        codes.append(f"score_ge_{cfg.drop.score_gte}")
    if cluster_drops:
        codes.append(f"cluster_size_ge_{cfg.drop.cluster_size_gte}")

    if score_drops or cluster_drops:
        confidence: Confidence = "high" if score_drops and cluster_drops else "medium"
        return DecisionResult("DROP", confidence, _dedupe(codes))

    if score_reviews or cluster_reviews:
        if score_reviews:
            codes.append(f"score_ge_{cfg.review.score_gte}")
        if cluster_reviews:
            codes.append(f"cluster_size_ge_{cfg.review.cluster_size_gte}")
        confidence = (
            "high"
            if score_reviews and cluster_reviews
            else ("medium" if extra_codes else "low")
        )
        return DecisionResult("REVIEW", confidence, _dedupe(codes))

    return DecisionResult("KEEP", "high", _dedupe(codes))


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in items:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


# Map ML evidence-generator item types -> machine-readable rationale codes.
EVIDENCE_TO_CODE: dict[str, str] = {
    "temporal_scripting": "scripted_timing",
    "low_entropy": "low_hour_entropy",
    "high_autocorrelation": "high_autocorrelation",
    "shared_funding": "shared_funder_cluster",
    "shared_funding_weak": "shared_funder_weak",
    "behavioral_clone": "behavioral_cluster",
    "graph_cluster": "graph_cluster",
    "cross_chain_link": "cross_chain_link",
    "thin_account": "thin_account",
    "model_classification": "model_classification",
}


def evidence_to_codes(evidence: list[dict] | None) -> list[str]:
    if not evidence:
        return []
    codes: list[str] = []
    for item in evidence:
        t = item.get("type") if isinstance(item, dict) else None
        if t and t in EVIDENCE_TO_CODE:
            codes.append(EVIDENCE_TO_CODE[t])
    return _dedupe(codes)
