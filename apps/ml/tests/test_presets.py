"""Tests for the Python preset mirror (apps/api/src/lib/presets.ts's
canonical logic) — previously had zero coverage. Added alongside the
TODO-310 QF pairwise signal since that's exactly the logic being changed."""
from __future__ import annotations

from sybilshield.scoring.presets import compute_decision, evidence_to_codes


def test_airdrop_drops_a_high_score() -> None:
    d = compute_decision(90, None, "airdrop")
    assert d.decision == "DROP"
    assert "score_ge_85" in d.rationale_codes


def test_grant_does_not_drop_a_high_score_singleton() -> None:
    # grant.drop has score_gte=None -- score alone can't DROP, needs a cluster.
    d = compute_decision(100, None, "grant")
    assert d.decision == "REVIEW"  # review.score_gte = 70


# ---------- QF pairwise signal (TODO-310) ----------


def test_grant_reviews_a_zero_score_address_with_the_pairwise_code() -> None:
    d = compute_decision(0, None, "grant", ["qf_pairwise_coordinated_pair"])
    assert d.decision == "REVIEW"
    assert d.confidence == "medium"
    assert "qf_pairwise_coordinated_pair" in d.rationale_codes


def test_pairwise_code_does_nothing_without_grant_preset() -> None:
    d = compute_decision(0, None, "airdrop", ["qf_pairwise_coordinated_pair"])
    assert d.decision == "KEEP"


def test_pairwise_code_alone_never_drops() -> None:
    d = compute_decision(0, None, "grant", ["qf_pairwise_coordinated_pair"])
    assert d.decision != "DROP"


def test_evidence_to_codes_maps_pairwise_funding_link() -> None:
    codes = evidence_to_codes([{"type": "pairwise_funding_link", "confidence": 0.95}])
    assert "qf_pairwise_coordinated_pair" in codes
