"""End-to-end pipeline tests (Step 9) + evidence (Step 11)."""
from __future__ import annotations

from sybilshield.evidence import generate_evidence
from sybilshield.pipeline import SybilShieldPipeline
from sybilshield.providers.mock import MockProvider
from sybilshield.types import Cluster


def _addrs(n: int, prefix: int = 100) -> list[str]:
    return ["0x" + f"{(prefix * 1000 + i):040x}" for i in range(n)]


def test_pipeline_smoke_runs_end_to_end() -> None:
    addrs = _addrs(15, prefix=200)
    scenarios = {a: "sybil_scripted" for a in addrs[:10]}
    provider = MockProvider(scenarios=scenarios)
    pipe = SybilShieldPipeline(provider=provider, model=None)
    result = pipe.run("test-1", addrs, ["ethereum"])
    assert result.address_count == 15
    assert len(result.scores) == 15
    assert result.summary["total_scored"] == 15
    # Rule-based scoring should mark scripted wallets as suspicious or sybil
    sybil_or_susp = sum(1 for s in result.scores.values() if s["sybil_score"] >= 40)
    assert sybil_or_susp >= 5


def test_pipeline_genuine_wallets_score_low() -> None:
    addrs = _addrs(10, prefix=300)
    provider = MockProvider()  # default genuine
    pipe = SybilShieldPipeline(provider=provider, model=None)
    result = pipe.run("test-2", addrs, ["ethereum"])
    # Most should NOT be flagged
    high = sum(1 for s in result.scores.values() if s["sybil_score"] >= 70)
    assert high <= 3


def test_evidence_generated_for_flagged_addresses() -> None:
    cluster = Cluster(
        id="F-abc12345",
        method="funding",
        addresses=["0xa", "0xb"],
        size=5,
        confidence=0.9,
        evidence="All 5 addresses funded by 0xfunder within 1.0 hours",
    )
    feats = {
        "hour_entropy": 0.8,
        "min_inter_tx_seconds": 30,
        "activity_regularity": 0.9,
        "same_funder_count": 5,
    }
    items = generate_evidence("0xa", 85, feats, ["F-abc12345"], {"F-abc12345": cluster})
    assert len(items) >= 3
    types = {i["type"] for i in items}
    assert "shared_funding" in types
    assert "low_entropy" in types
    assert "temporal_scripting" in types


def test_no_evidence_for_genuine() -> None:
    items = generate_evidence("0xa", 15, {}, [], {})
    assert items == []


def test_evidence_traceable_to_features_only() -> None:
    """Every evidence item must reference a real feature value or cluster."""
    cluster = Cluster(
        id="G-1", method="graph", addresses=["0xa"], size=8, confidence=0.7, evidence="dense"
    )
    feats = {"hour_entropy": 3.0, "min_inter_tx_seconds": 3600}  # high entropy, slow
    items = generate_evidence("0xa", 60, feats, ["G-1"], {"G-1": cluster})
    # No temporal_scripting (min_inter > 60), no low_entropy (>1.5)
    types = {i["type"] for i in items}
    assert "graph_cluster" in types
    assert "low_entropy" not in types
    assert "temporal_scripting" not in types


def test_pipeline_cu_consumption_tracked() -> None:
    addrs = _addrs(5, prefix=400)
    provider = MockProvider()
    pipe = SybilShieldPipeline(provider=provider, model=None)
    result = pipe.run("test-cu", addrs, ["ethereum"])
    assert result.cu_consumed > 0


# ---------- QF pairwise signal (TODO-310) ----------


def test_grant_preset_flags_a_two_wallet_funding_pair() -> None:
    """
    The exact gap TODO-307's design note identified: a pair of exactly 2
    addresses sharing a funder within a 1h window never reaches the normal
    funding_cluster.py's default min_cluster_size=3, so it's invisible to
    every other preset. The grant preset's dedicated pairwise pass (min
    size 2) must still surface it as pairwise_funding_link evidence.
    """
    addrs = _addrs(2, prefix=500)
    scenarios = {a: "sybil_shared_funder" for a in addrs}
    provider = MockProvider(scenarios=scenarios)
    pipe = SybilShieldPipeline(provider=provider, model=None)
    result = pipe.run("test-pairwise", addrs, ["ethereum"], preset="grant")

    # Not caught by the normal (size>=3) clustering pass — cluster_id/size
    # on the per-address result must be untouched by the pairwise signal.
    for addr in addrs:
        assert result.scores[addr]["cluster_id"] is None
        assert result.scores[addr]["cluster_size"] is None

    # But both addresses get the new evidence type, high confidence
    # (funded within 1h -> funding_cluster.py's 0.95 tier).
    for addr in addrs:
        evidence = result.scores[addr]["evidence"]
        pairwise = [e for e in evidence if e["type"] == "pairwise_funding_link"]
        assert len(pairwise) == 1, f"expected exactly one pairwise item for {addr}"
        assert pairwise[0]["confidence"] >= 0.80


def test_pairwise_signal_is_scoped_to_grant_preset_only() -> None:
    """Same 2-address shared-funder pair, but preset=None (e.g. balanced/
    airdrop/dao) -- must NOT produce pairwise_funding_link evidence. This
    is the other half of the design's scope boundary: not a global
    min_cluster_size change."""
    addrs = _addrs(2, prefix=501)
    scenarios = {a: "sybil_shared_funder" for a in addrs}
    provider = MockProvider(scenarios=scenarios)
    pipe = SybilShieldPipeline(provider=provider, model=None)
    result = pipe.run("test-pairwise-scoped", addrs, ["ethereum"], preset="balanced")

    for addr in addrs:
        evidence = result.scores[addr]["evidence"]
        assert not any(e["type"] == "pairwise_funding_link" for e in evidence)


def test_pairwise_signal_absent_without_a_shared_funder() -> None:
    """Grant preset, but genuine addresses with no shared funder -- the
    pairwise pass must not manufacture a signal that isn't there."""
    addrs = _addrs(4, prefix=502)
    provider = MockProvider()  # default genuine, independent funders
    pipe = SybilShieldPipeline(provider=provider, model=None)
    result = pipe.run("test-pairwise-none", addrs, ["ethereum"], preset="grant")

    for addr in addrs:
        evidence = result.scores[addr]["evidence"]
        assert not any(e["type"] == "pairwise_funding_link" for e in evidence)


# ---------- Real-time first-sight scoring (TODO-312 Phase 1) ----------


def test_first_sight_scores_a_single_never_seen_address() -> None:
    addrs = _addrs(1, prefix=600)
    provider = MockProvider()  # default genuine pattern
    pipe = SybilShieldPipeline(provider=provider, model=None)
    result = pipe.run_first_sight(addrs[0], "ethereum")

    assert result.address == addrs[0]
    assert result.chain == "ethereum"
    assert 0 <= result.sybil_score <= 100
    assert result.label in {"genuine", "suspicious", "sybil"}
    assert result.cu_consumed > 0


def test_first_sight_scripted_singleton_scores_above_genuine_baseline() -> None:
    """Temporal signals (tight, near-uniform inter-tx timing) contribute to
    the rule-based score even for a single address with no batch to compare
    against -- confirming _rule_based_scoring's per-address terms
    (min_inter_tx_seconds, activity_regularity, ...) don't silently depend
    on cluster membership. Note: rule-based single-address scoring is
    intentionally conservative (see docs/design/realtime-first-sight-scoring.md
    §5, "confidence: low always") -- this does not assert a DROP/REVIEW-grade
    score, only that the scripted pattern measurably outscores a genuine one."""
    addrs = _addrs(1, prefix=601)
    provider = MockProvider(scenarios={addrs[0]: "sybil_scripted"})
    pipe = SybilShieldPipeline(provider=provider, model=None)
    result = pipe.run_first_sight(addrs[0], "ethereum")

    baseline_addr = _addrs(1, prefix=650)[0]
    baseline = SybilShieldPipeline(provider=MockProvider(), model=None).run_first_sight(
        baseline_addr, "ethereum"
    )
    assert result.sybil_score > baseline.sybil_score

    types = {e["type"] for e in result.evidence}
    # Cluster-based evidence types must be structurally absent -- there is
    # no batch for them to have been computed from.
    assert "shared_funding" not in types
    assert "behavioral_clone" not in types
    assert "graph_cluster" not in types


def test_first_sight_never_produces_cluster_based_evidence() -> None:
    """Even a shared-funder scenario can't produce cluster evidence for a
    batch of one -- there's no second address to share it with. This is
    the structural guarantee, not a coincidence of the mock data."""
    addrs = _addrs(1, prefix=602)
    provider = MockProvider(scenarios={addrs[0]: "sybil_shared_funder"})
    pipe = SybilShieldPipeline(provider=provider, model=None)
    result = pipe.run_first_sight(addrs[0], "ethereum")

    types = {e["type"] for e in result.evidence}
    assert "shared_funding" not in types
    assert "shared_funding_weak" not in types
    assert "pairwise_funding_link" not in types  # grant-only, and needs a peer regardless
