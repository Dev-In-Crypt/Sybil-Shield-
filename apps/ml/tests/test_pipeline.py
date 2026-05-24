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
