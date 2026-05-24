"""Clustering tests (Steps 5, 6, 7, 7.5)."""
from __future__ import annotations

from sybilshield.clustering import (
    cluster_by_behavior,
    cluster_by_funding_source,
    detect_communities,
    link_cross_chain,
    merge_clusters,
)
from sybilshield.features.combine import extract_all_features
from sybilshield.ingest import ingest_address
from sybilshield.providers.mock import MockProvider
from sybilshield.types import Cluster, RawAddressData, Transaction


def _make_addresses(n: int, prefix: int = 1) -> list[str]:
    return ["0x" + f"{(prefix * 1000 + i):040x}" for i in range(n)]


def test_funding_cluster_detected_for_shared_funder() -> None:
    addrs = _make_addresses(10, prefix=2)
    shared = "0x" + "ab" * 20
    scenarios = {}
    for a in addrs:
        scenarios[a] = "sybil_shared_funder"
        scenarios[f"{a}:funder"] = shared
    provider = MockProvider(scenarios=scenarios)
    batch = [ingest_address(provider, a, "ethereum") for a in addrs]
    clusters = cluster_by_funding_source(batch)
    assert len(clusters) >= 1
    c = clusters[0]
    assert c.size >= 3
    assert c.method == "funding"


def test_funding_cluster_filters_exchange_funded() -> None:
    """Addresses funded only from a CEX must not form a cluster."""
    from sybilshield.ingest import KNOWN_EXCHANGES

    cex = next(iter(KNOWN_EXCHANGES))
    batch = [
        RawAddressData(address=f"0x{i:040x}", chain="ethereum", funding_source=cex, funding_timestamp=1700000000)
        for i in range(1, 6)
    ]
    clusters = cluster_by_funding_source(batch)
    assert clusters == []


def test_funding_cluster_single_address_filtered_out() -> None:
    batch = [
        RawAddressData(
            address=f"0x{i:040x}",
            chain="ethereum",
            funding_source="0x" + "cd" * 20,
            funding_timestamp=1700000000,
        )
        for i in range(1, 3)  # only 2, below min_cluster_size=3
    ]
    clusters = cluster_by_funding_source(batch, min_cluster_size=3)
    assert clusters == []


def test_funding_cluster_time_spread_lowers_confidence() -> None:
    funder = "0x" + "ef" * 20
    close = [
        RawAddressData(address=f"0x{i:040x}", chain="ethereum", funding_source=funder, funding_timestamp=1700000000 + i * 60)
        for i in range(1, 6)
    ]
    spread = [
        RawAddressData(address=f"0x{i:040x}", chain="ethereum", funding_source=funder, funding_timestamp=1700000000 + i * 86400 * 10)
        for i in range(1, 6)
    ]
    c_close = cluster_by_funding_source(close)
    c_spread = cluster_by_funding_source(spread)
    assert c_close[0].confidence > c_spread[0].confidence


def test_behavior_clustering_groups_scripted_wallets() -> None:
    addrs = _make_addresses(20, prefix=3)
    provider = MockProvider(scenarios={a: "sybil_scripted" for a in addrs})
    batch = [ingest_address(provider, a, "ethereum") for a in addrs]
    feats = extract_all_features(batch)
    clusters = cluster_by_behavior([a.lower() for a in addrs], feats, min_cluster_size=5)
    # At least one cluster of scripted wallets
    assert any(c.size >= 5 for c in clusters)


def test_behavior_clustering_does_not_group_diverse_wallets() -> None:
    addrs = _make_addresses(20, prefix=4)
    provider = MockProvider()  # all genuine = diverse
    batch = [ingest_address(provider, a, "ethereum") for a in addrs]
    feats = extract_all_features(batch)
    clusters = cluster_by_behavior([a.lower() for a in addrs], feats, min_cluster_size=10)
    # Strict requirement: should not put all 20 genuine into one cluster
    assert not any(c.size >= 18 for c in clusters)


def test_graph_community_detected_in_sybil_ring() -> None:
    """Synthetic ring: 10 wallets all transacting with each other."""
    addrs = [f"0x{i:040x}" for i in range(100, 110)]
    batch: list[RawAddressData] = []
    for a in addrs:
        txs = []
        for b in addrs:
            if a == b:
                continue
            txs.append(
                Transaction(
                    tx_hash=f"0x{hash((a, b)) & 0xFFFFFFFF:064x}",
                    from_addr=a,
                    to_addr=b,
                    value_wei=10**16,
                    timestamp=1700000000 + abs(hash((a, b))) % 86400,
                    chain="ethereum",
                    category="external",
                )
            )
        batch.append(RawAddressData(address=a, chain="ethereum", transactions=txs))
    clusters = detect_communities(batch, min_size=5, density_threshold=0.2)
    assert any(c.size >= 5 for c in clusters)


def test_graph_community_no_clusters_in_random() -> None:
    addrs = _make_addresses(30, prefix=5)
    provider = MockProvider()
    batch = [ingest_address(provider, a, "ethereum") for a in addrs]
    clusters = detect_communities(batch, min_size=5, density_threshold=0.5)
    # Random/genuine should not produce dense communities
    assert all(c.size < 5 or c.confidence < 0.5 for c in clusters) or len(clusters) == 0


def test_cross_chain_link_same_address_via_bridge() -> None:
    from sybilshield.clustering.cross_chain import BRIDGE_CONTRACTS

    addr = "0x" + "01" * 20
    bridge = next(iter(BRIDGE_CONTRACTS["ethereum"]))
    eth_data = RawAddressData(
        address=addr,
        chain="ethereum",
        transactions=[
            Transaction(
                tx_hash="0x" + "aa" * 32,
                from_addr=addr,
                to_addr=bridge,
                value_wei=10**17,
                timestamp=1700000000,
                chain="ethereum",
                category="external",
            )
        ],
    )
    arb_data = RawAddressData(address=addr, chain="arbitrum", transactions=[])
    base_data = RawAddressData(address=addr, chain="base", transactions=[])
    # Need >=3 chain-nodes for the cluster threshold to fire.
    clusters = link_cross_chain(
        {"ethereum": [eth_data], "arbitrum": [arb_data], "base": [base_data]}
    )
    assert any(c.method == "cross_chain" for c in clusters)


def test_cross_chain_genuine_independent_users_not_linked() -> None:
    # Two unrelated addresses on two chains; no bridge tx => no link
    a = "0x" + "02" * 20
    b = "0x" + "03" * 20
    clusters = link_cross_chain(
        {
            "ethereum": [RawAddressData(address=a, chain="ethereum")],
            "arbitrum": [RawAddressData(address=b, chain="arbitrum")],
        }
    )
    assert clusters == []


def test_merge_clusters_dedupes_addresses() -> None:
    c1 = [Cluster(id="F-1", method="funding", addresses=["0xa", "0xb"], size=2, confidence=0.9, evidence="e")]
    c2 = [Cluster(id="B-1", method="behavior", addresses=["0xa", "0xc"], size=2, confidence=0.8, evidence="e")]
    all_c, addr_map = merge_clusters(c1, c2)
    assert len(all_c) == 2
    assert sorted(addr_map["0xa"]) == ["B-1", "F-1"]
    assert addr_map["0xb"] == ["F-1"]
    assert addr_map["0xc"] == ["B-1"]
