"""Step 7: graph community detection via Leiden (igraph + leidenalg)."""
from __future__ import annotations

import logging
from collections import defaultdict

import igraph as ig

from sybilshield.types import Cluster, RawAddressData

log = logging.getLogger(__name__)


def detect_communities(
    batch: list[RawAddressData],
    min_size: int = 5,
    max_size: int = 500,
    density_threshold: float = 0.3,
) -> list[Cluster]:
    """
    Build a directed weighted graph from in-batch transactions and run Leiden
    community detection. Only retain dense, medium-sized communities (typical
    Sybil rings) as clusters.
    """
    addresses_in_scope = {d.address for d in batch}
    edges: dict[tuple[str, str], int] = {}
    for d in batch:
        for t in d.transactions:
            if t.from_addr in addresses_in_scope and t.to_addr in addresses_in_scope:
                if t.from_addr == t.to_addr:
                    continue
                key = (t.from_addr, t.to_addr)
                edges[key] = edges.get(key, 0) + 1

    if not edges:
        return []

    # Build igraph
    node_to_idx: dict[str, int] = {}
    for s, t in edges:
        node_to_idx.setdefault(s, len(node_to_idx))
        node_to_idx.setdefault(t, len(node_to_idx))
    g = ig.Graph(n=len(node_to_idx), directed=True)
    g.vs["name"] = sorted(node_to_idx, key=lambda k: node_to_idx[k])
    # Re-index because vs["name"] was sorted
    node_to_idx = {n: i for i, n in enumerate(g.vs["name"])}
    e_list = [(node_to_idx[s], node_to_idx[t]) for (s, t) in edges]
    g.add_edges(e_list)
    g.es["weight"] = list(edges.values())

    undirected = g.as_undirected(mode="collapse", combine_edges="sum")

    # Prefer Leiden, fall back to multilevel Louvain (igraph builtin).
    try:
        import leidenalg

        partition = leidenalg.find_partition(
            undirected,
            leidenalg.RBConfigurationVertexPartition,
            resolution_parameter=1.0,
            weights=undirected.es["weight"],
            seed=42,
        )
        membership = partition.membership
    except ImportError:
        log.warning("leidenalg not available, falling back to igraph multilevel")
        membership = undirected.community_multilevel(
            weights=undirected.es["weight"]
        ).membership

    comms: dict[int, list[int]] = defaultdict(list)
    for node_idx, comm_id in enumerate(membership):
        comms[comm_id].append(node_idx)

    clusters: list[Cluster] = []
    for cid, members_idx in comms.items():
        if not (min_size <= len(members_idx) <= max_size):
            continue
        sub = undirected.induced_subgraph(members_idx)
        density = float(sub.density())
        if density < density_threshold:
            continue
        member_names = sorted(undirected.vs[i]["name"] for i in members_idx)
        clusters.append(
            Cluster(
                id=f"G-{cid}",
                method="graph",
                addresses=member_names,
                size=len(member_names),
                confidence=min(0.95, density),
                evidence=(
                    f"Dense transaction community: {len(member_names)} addresses, "
                    f"density {density:.2f}"
                ),
            )
        )
    return clusters
