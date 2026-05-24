"""Step 5: funding-source clustering."""
from __future__ import annotations

import hashlib
from collections import defaultdict

from sybilshield.ingest import KNOWN_EXCHANGES
from sybilshield.types import Cluster, RawAddressData


def cluster_by_funding_source(
    batch: list[RawAddressData],
    min_cluster_size: int = 3,
) -> list[Cluster]:
    """
    Group addresses that share a non-exchange funder.

    Confidence scales with temporal proximity of funding events:
      <24h spread  -> 0.95
      <7d  spread  -> 0.80
      else         -> 0.60
    """
    groups: dict[str, list[RawAddressData]] = defaultdict(list)
    for d in batch:
        f = d.funding_source
        if not f:
            continue
        f = f.lower()
        if f in KNOWN_EXCHANGES:
            continue
        groups[f].append(d)

    clusters: list[Cluster] = []
    for funder, members in groups.items():
        if len(members) < min_cluster_size:
            continue
        timestamps = [m.funding_timestamp for m in members if m.funding_timestamp]
        if not timestamps:
            continue
        spread = max(timestamps) - min(timestamps)
        if spread < 86400:
            conf = 0.95
        elif spread < 86400 * 7:
            conf = 0.80
        else:
            conf = 0.60
        short_id = hashlib.sha1(funder.encode()).hexdigest()[:8]
        clusters.append(
            Cluster(
                id=f"F-{short_id}",
                method="funding",
                addresses=sorted(m.address for m in members),
                size=len(members),
                confidence=conf,
                evidence=(
                    f"All {len(members)} addresses funded by {funder} within "
                    f"{spread / 3600:.1f} hours"
                ),
            )
        )
    return clusters
