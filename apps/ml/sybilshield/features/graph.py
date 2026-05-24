"""Graph-structural features for a single address.

Computed against the transaction graph built from a batch of addresses
(addresses in the analysis set + their direct counterparties).
"""
from __future__ import annotations

import igraph as ig

from sybilshield.types import RawAddressData


def build_tx_graph(batch: list[RawAddressData]) -> tuple[ig.Graph, dict[str, int]]:
    """Build a weighted directed igraph of transactions in the batch."""
    edges: dict[tuple[str, str], int] = {}
    nodes: set[str] = set()
    for d in batch:
        nodes.add(d.address)
        for t in d.transactions:
            if t.from_addr and t.to_addr:
                nodes.add(t.from_addr)
                nodes.add(t.to_addr)
                key = (t.from_addr, t.to_addr)
                edges[key] = edges.get(key, 0) + 1

    name_to_idx = {n: i for i, n in enumerate(sorted(nodes))}
    g = ig.Graph(n=len(name_to_idx), directed=True)
    g.vs["name"] = sorted(nodes)
    e_list = [(name_to_idx[s], name_to_idx[t]) for (s, t) in edges.keys()]
    weights = list(edges.values())
    g.add_edges(e_list)
    g.es["weight"] = weights
    return g, name_to_idx


def extract_graph_features(
    address: str,
    graph: ig.Graph,
    name_to_idx: dict[str, int],
    pagerank_cache: list[float] | None = None,
) -> dict[str, float | int | bool]:
    addr = address.lower()
    if addr not in name_to_idx:
        return _defaults()

    idx = name_to_idx[addr]
    v = graph.vs[idx]
    in_deg = v.indegree()
    out_deg = v.outdegree()

    pr = pagerank_cache[idx] if pagerank_cache else float(graph.pagerank(vertices=[idx])[0])

    # Local clustering coefficient (undirected approximation)
    undirected = graph.as_undirected(mode="collapse")
    try:
        cc = float(undirected.transitivity_local_undirected([idx])[0] or 0.0)
    except Exception:
        cc = 0.0

    # Neighborhood density
    neighbors = set(graph.neighbors(idx, mode="all"))
    neighbors.add(idx)
    sub = undirected.induced_subgraph(list(neighbors))
    density = float(sub.density()) if sub.vcount() > 1 else 0.0

    return {
        "in_degree": in_deg,
        "out_degree": out_deg,
        "in_out_ratio": (in_deg + 1) / (out_deg + 1),
        "clustering_coefficient": cc,
        "pagerank": pr,
        "subgraph_density": density,
        "is_in_dense_subgraph": density > 0.3 and len(neighbors) >= 5,
    }


def _defaults() -> dict[str, float | int | bool]:
    return {
        "in_degree": 0,
        "out_degree": 0,
        "in_out_ratio": 1.0,
        "clustering_coefficient": 0.0,
        "pagerank": 0.0,
        "subgraph_density": 0.0,
        "is_in_dense_subgraph": False,
    }
