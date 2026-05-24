"""Feature drift detection via Population Stability Index (PSI)."""
from __future__ import annotations

import numpy as np


def compute_psi(
    expected: np.ndarray,
    actual: np.ndarray,
    n_buckets: int = 10,
) -> float:
    """
    Population Stability Index between expected (training-time) and actual
    (production) distributions of one feature.

    Rule of thumb:
      PSI < 0.10 -> no significant shift
      0.10-0.25  -> minor shift, monitor
      > 0.25     -> major shift, retrain
    """
    expected = np.asarray(expected, dtype=float)
    actual = np.asarray(actual, dtype=float)
    expected = expected[np.isfinite(expected)]
    actual = actual[np.isfinite(actual)]
    if len(expected) == 0 or len(actual) == 0:
        return 0.0

    # Use expected-derived quantile breakpoints
    breakpoints = np.quantile(expected, np.linspace(0, 1, n_buckets + 1))
    breakpoints[0] = -np.inf
    breakpoints[-1] = np.inf
    # Ensure strictly increasing
    for i in range(1, len(breakpoints)):
        if breakpoints[i] <= breakpoints[i - 1]:
            breakpoints[i] = breakpoints[i - 1] + 1e-9

    e_counts, _ = np.histogram(expected, bins=breakpoints)
    a_counts, _ = np.histogram(actual, bins=breakpoints)
    e_pct = (e_counts + 0.5) / (e_counts.sum() + 0.5 * n_buckets)
    a_pct = (a_counts + 0.5) / (a_counts.sum() + 0.5 * n_buckets)
    psi = float(((a_pct - e_pct) * np.log(a_pct / e_pct)).sum())
    return psi


def score_distribution_drift(
    baseline_scores: np.ndarray,
    current_scores: np.ndarray,
) -> dict[str, float]:
    """Returns KS statistic + PSI on output scores."""
    from scipy.stats import ks_2samp

    ks_stat, ks_p = ks_2samp(baseline_scores, current_scores)
    return {
        "ks_statistic": float(ks_stat),
        "ks_p_value": float(ks_p),
        "psi": compute_psi(baseline_scores, current_scores),
    }
