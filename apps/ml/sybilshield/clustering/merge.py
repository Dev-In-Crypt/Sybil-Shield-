"""Merge clusters from different methods into per-address cluster assignments."""
from __future__ import annotations

from sybilshield.types import Cluster


def merge_clusters(*cluster_lists: list[Cluster]) -> tuple[list[Cluster], dict[str, list[str]]]:
    """
    Combine multiple cluster lists.

    Returns (all_clusters, address -> [cluster_ids]).
    Same address may appear in multiple clusters from different methods - that
    is signal, not noise. The ML model receives cluster membership as features.
    """
    all_clusters: list[Cluster] = []
    address_to_clusters: dict[str, list[str]] = {}

    for cluster_list in cluster_lists:
        for c in cluster_list:
            all_clusters.append(c)
            for addr in c.addresses:
                address_to_clusters.setdefault(addr, []).append(c.id)

    return all_clusters, address_to_clusters
