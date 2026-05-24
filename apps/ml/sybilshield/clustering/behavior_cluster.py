"""Step 6: behavioral clustering using HDBSCAN (scales to ~1M points)."""
from __future__ import annotations

import logging
from typing import Any

import numpy as np

from sybilshield.types import Cluster

log = logging.getLogger(__name__)


_BEHAVIOR_FEATURE_NAMES = [
    "avg_time_between_txs",
    "std_time_between_txs",
    "hour_entropy",
    "day_of_week_entropy",
    "burst_score",
    "protocol_diversity",
    "tx_type_entropy",
    "total_tx_count",
    "unique_contracts_interacted",
    "activity_regularity",
]


def cluster_by_behavior(
    addresses: list[str],
    features: dict[str, dict[str, Any]],
    min_cluster_size: int = 5,
) -> list[Cluster]:
    """
    Cluster addresses by behavior-feature similarity.

    Implementation choice (see Step 6 spec): HDBSCAN with boruvka_kdtree.
    Falls back to a simple distance-threshold approach if hdbscan is missing.
    """
    if len(addresses) < min_cluster_size:
        return []

    X = np.array(
        [[_safe_float(features.get(a, {}).get(k, 0)) for k in _BEHAVIOR_FEATURE_NAMES] for a in addresses],
        dtype=float,
    )

    # log-transform tx counts
    X[:, 7] = np.log1p(np.clip(X[:, 7], 0, None))
    X[:, 8] = np.log1p(np.clip(X[:, 8], 0, None))

    # Drop zero-variance columns to avoid HDBSCAN labeling everything noise.
    raw_sigma = X.std(axis=0)
    zero_var_cols = int((raw_sigma <= 1e-12).sum())
    keep_cols = raw_sigma > 1e-12
    if keep_cols.sum() == 0:
        return []
    X = X[:, keep_cols]
    sigma = raw_sigma[keep_cols]
    mu = X.mean(axis=0)
    Xn = (X - mu) / sigma

    try:
        import hdbscan

        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=min_cluster_size,
            min_samples=max(2, min_cluster_size // 2),
            algorithm="boruvka_kdtree",
            metric="euclidean",
            cluster_selection_method="leaf",
        )
        labels = clusterer.fit_predict(Xn)
    except ImportError:
        log.warning("hdbscan not available, using fallback")
        labels = _fallback_cluster(Xn, min_cluster_size)

    # When HDBSCAN labels everything as noise (happens with uniform sybil farms
    # that have no genuine contrast), fall back. Sybil-farm signature: many
    # features have zero variance across the batch (identical scripts).
    if (labels == -1).all():
        # If >=3 numeric features are perfectly constant across the batch,
        # this is almost certainly one scripted cohort - group them all.
        if zero_var_cols >= 3 and len(addresses) >= min_cluster_size:
            labels = np.zeros(len(addresses), dtype=int)
        else:
            labels = _fallback_cluster(Xn, min_cluster_size)

    clusters: list[Cluster] = []
    for label in set(labels):
        if label == -1:
            continue
        mask = labels == label
        members = [addresses[i] for i in range(len(addresses)) if mask[i]]
        if len(members) < min_cluster_size:
            continue
        sub = Xn[mask]
        # Mean pairwise distance (approximation: std of features within cluster)
        avg_dist = float(np.mean(sub.std(axis=0)))
        confidence = max(0.5, min(0.95, 1.0 - avg_dist / 2.0))
        clusters.append(
            Cluster(
                id=f"B-{int(label)}",
                method="behavior",
                addresses=sorted(members),
                size=len(members),
                confidence=confidence,
                evidence=(
                    f"Behavioral similarity cluster: {len(members)} addresses, "
                    f"intra-cluster spread {avg_dist:.2f}"
                ),
            )
        )
    return clusters


def _safe_float(v: Any) -> float:
    if isinstance(v, bool):
        return 1.0 if v else 0.0
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _fallback_cluster(X: np.ndarray, min_size: int) -> np.ndarray:
    """
    Fallback used when HDBSCAN returns all-noise (uniform-density batches with
    no genuine baseline to contrast against).

    Strategy: if mean pairwise distance is below 1.5 std units, treat the whole
    batch as one cluster (a Sybil farm in isolation). Otherwise bucket by
    integer-rounded signature.
    """
    n = len(X)
    labels = np.full(n, -1, dtype=int)
    if n < min_size:
        return labels

    # Tightly-packed batch check
    centroid = X.mean(axis=0)
    mean_dist = float(np.mean(np.linalg.norm(X - centroid, axis=1)))
    if mean_dist < 1.5:
        labels[:] = 0
        return labels

    # Signature bucketing (coarser - integer rounding)
    sigs: dict[tuple, list[int]] = {}
    for i in range(n):
        sig = tuple(np.round(X[i]).astype(int).tolist())
        sigs.setdefault(sig, []).append(i)
    cluster_id = 0
    for sig, idxs in sigs.items():
        if len(idxs) >= min_size:
            for j in idxs:
                labels[j] = cluster_id
            cluster_id += 1
    return labels
