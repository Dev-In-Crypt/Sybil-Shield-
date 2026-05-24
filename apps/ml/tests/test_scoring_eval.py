"""Tests for ML model, adversarial set, and drift detection (Steps 8 & 8.5)."""
from __future__ import annotations

import numpy as np

from sybilshield.eval.adversarial import generate_adversarial_set
from sybilshield.eval.drift import compute_psi, score_distribution_drift
from sybilshield.features.combine import FEATURE_NAMES
from sybilshield.scoring.model import feature_schema_hash, label_from_score


def test_label_from_score_thresholds() -> None:
    assert label_from_score(85) == "sybil"
    assert label_from_score(70) == "sybil"
    assert label_from_score(55) == "suspicious"
    assert label_from_score(40) == "suspicious"
    assert label_from_score(30) == "genuine"
    assert label_from_score(0) == "genuine"


def test_feature_schema_hash_stable() -> None:
    h1 = feature_schema_hash()
    h2 = feature_schema_hash()
    assert h1 == h2
    assert len(h1) == 16


def test_adversarial_generator_produces_diverse_techniques() -> None:
    batch = generate_adversarial_set(n_per_technique=20)
    assert len(batch) == 100  # 5 techniques x 20
    # All addresses distinct
    assert len({d.address for d in batch}) == len(batch)
    # All have funding source set
    assert all(d.funding_source for d in batch)


def test_psi_detects_distribution_shift() -> None:
    rng = np.random.default_rng(42)
    baseline = rng.normal(0, 1, 5000)
    shifted = rng.normal(1.5, 1, 5000)  # mean-shifted
    same = rng.normal(0, 1, 5000)
    assert compute_psi(baseline, shifted) > 0.25
    assert compute_psi(baseline, same) < 0.10


def test_score_distribution_drift_ks_stat_makes_sense() -> None:
    rng = np.random.default_rng(7)
    a = rng.integers(0, 100, 5000)
    b = rng.integers(0, 100, 5000)
    out = score_distribution_drift(a, b)
    # Identical distributions => low KS
    assert out["ks_statistic"] < 0.1
    c = rng.integers(50, 100, 5000)  # shifted high
    out2 = score_distribution_drift(a, c)
    assert out2["ks_statistic"] > out["ks_statistic"]


def test_feature_names_no_duplicates() -> None:
    assert len(FEATURE_NAMES) == len(set(FEATURE_NAMES))
