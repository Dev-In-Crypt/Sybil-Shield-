"""Feature extraction tests (Step 4)."""
from __future__ import annotations

from sybilshield.features import (
    extract_all_features,
    extract_behavioral_features,
    extract_funding_features,
    extract_temporal_features,
)
from sybilshield.features.funding import compute_same_funder_counts
from sybilshield.ingest import KNOWN_EXCHANGES, ingest_address
from sybilshield.providers.mock import MockProvider


def _scripted_addrs(n: int) -> list[str]:
    return ["0x" + f"{i:040x}" for i in range(1, n + 1)]


def test_funding_source_detected_from_first_incoming() -> None:
    addr = _scripted_addrs(1)[0]
    provider = MockProvider(scenarios={addr: "sybil_scripted"})
    data = ingest_address(provider, addr, "ethereum")
    assert data.funding_source is not None
    feats = extract_funding_features(data, {})
    assert feats["funding_amount_eth"] > 0


def test_exchange_funded_flagged() -> None:
    """Address funded by a known exchange must have funding_source_is_exchange=True."""
    from sybilshield.types import RawAddressData

    cex = next(iter(KNOWN_EXCHANGES))
    data = RawAddressData(
        address="0x" + "11" * 20,
        chain="ethereum",
        funding_source=cex,
        funding_timestamp=1700000000,
        funding_amount_wei=int(0.05 * 1e18),
    )
    feats = extract_funding_features(data, {})
    assert feats["funding_source_is_exchange"] is True
    # Non-exchange funding -> False
    data2 = RawAddressData(
        address="0x" + "12" * 20,
        chain="ethereum",
        funding_source="0x" + "aa" * 20,
        funding_timestamp=1700000000,
    )
    feats2 = extract_funding_features(data2, {})
    assert feats2["funding_source_is_exchange"] is False


def test_scripted_wallet_low_entropy() -> None:
    addrs = _scripted_addrs(3)
    addr = addrs[2]
    provider = MockProvider(scenarios={addr: "sybil_scripted"})
    data = ingest_address(provider, addr, "ethereum")
    feats = extract_temporal_features(data)
    # Scripted: ~30s intervals => very low std relative to mean
    assert feats["std_time_between_txs"] < feats["avg_time_between_txs"]
    assert feats["min_inter_tx_seconds"] <= 35


def test_genuine_wallet_high_entropy() -> None:
    addr = _scripted_addrs(50)[49]  # default scenario = genuine
    provider = MockProvider()
    data = ingest_address(provider, addr, "ethereum")
    feats = extract_temporal_features(data)
    # Genuine: many active days, high hour entropy
    assert feats["hour_entropy"] > 1.5
    assert feats["active_days"] > 3


def test_behavioral_features_capture_contract_diversity() -> None:
    addr = _scripted_addrs(60)[59]
    provider = MockProvider()
    data = ingest_address(provider, addr, "ethereum")
    feats = extract_behavioral_features(data, {})
    assert feats["total_tx_count"] > 0
    assert feats["unique_contracts_interacted"] >= 1


def test_graph_features_isolated_address_low_degree() -> None:
    addrs = _scripted_addrs(70)
    provider = MockProvider(scenarios={a: "empty" for a in addrs[:5]})
    batch = [ingest_address(provider, a, "ethereum") for a in addrs[:5]]
    feats = extract_all_features(batch)
    for a in addrs[:5]:
        f = feats[a.lower()]
        assert f["in_degree"] == 0
        assert f["out_degree"] == 0


def test_empty_wallet_returns_defaults() -> None:
    addr = _scripted_addrs(1)[0]
    provider = MockProvider(scenarios={addr: "empty"})
    data = ingest_address(provider, addr, "ethereum")
    t = extract_temporal_features(data)
    assert t["account_age_days"] == 0.0
    assert t["active_days"] == 0
    b = extract_behavioral_features(data, {})
    assert b["total_tx_count"] == 0


def test_features_are_deterministic() -> None:
    addr = _scripted_addrs(80)[79]
    provider1 = MockProvider()
    provider2 = MockProvider()
    d1 = ingest_address(provider1, addr, "ethereum")
    d2 = ingest_address(provider2, addr, "ethereum")
    f1 = extract_temporal_features(d1)
    f2 = extract_temporal_features(d2)
    assert f1 == f2


def test_same_funder_counts_aggregation() -> None:
    """3 addresses funded by same wallet => counts[shared] == 3."""
    addrs = _scripted_addrs(100)[97:100]
    shared = "0x" + "ab" * 20
    scenarios: dict[str, str] = {}
    for a in addrs:
        scenarios[a.lower()] = "sybil_shared_funder"
        scenarios[f"{a.lower()}:funder"] = shared
    provider = MockProvider(scenarios=scenarios)
    batch = [ingest_address(provider, a, "ethereum") for a in addrs]
    # Sanity: every ingested address must report the shared funder.
    assert all(d.funding_source == shared for d in batch), [
        d.funding_source for d in batch
    ]
    counts = compute_same_funder_counts(batch)
    assert counts[shared.lower()] == len(addrs)
