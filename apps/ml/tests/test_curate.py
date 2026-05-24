"""Tests for dataset curation (Step 0)."""
from __future__ import annotations

import hashlib
from pathlib import Path

import pandas as pd
import yaml

from sybilshield.data.curate import (
    TIER_CONFIDENCE,
    TIER_WEIGHT,
    apply_conflict_rules,
    curate,
)


def _addr(n: int) -> str:
    return "0x" + f"{n:040x}"


def _write_csv(path: Path, addrs: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame({"address": addrs}).to_csv(path, index=False)


def _make_manifest(tmp: Path) -> Path:
    manifest = {
        "version": 1,
        "sources": [
            {
                "id": "src-sybil-t1",
                "label_class": "sybil",
                "tier": "T1",
                "confidence": 0.98,
                "chains": ["ethereum"],
                "retrieval": {"address_column": "address"},
                "enabled": True,
            },
            {
                "id": "src-sybil-t4",
                "label_class": "sybil",
                "tier": "T4",
                "confidence": 0.65,
                "chains": ["ethereum"],
                "retrieval": {"address_column": "address"},
                "enabled": True,
            },
            {
                "id": "src-genuine-g1",
                "label_class": "genuine",
                "tier": "G1",
                "confidence": 0.95,
                "chains": ["ethereum"],
                "retrieval": {"address_column": "address"},
                "enabled": True,
            },
        ],
        "conflict_rules": [
            {
                "name": "T1_T2_genuine_beats_T4_sybil",
                "if": {"genuine_tiers": ["T1", "T2", "G1"], "sybil_tiers": ["T4", "T5"]},
                "then": "keep_genuine",
            },
            {
                "name": "T1_T2_sybil_beats_T4_genuine",
                "if": {"sybil_tiers": ["T1", "T2"], "genuine_tiers": ["T4"]},
                "then": "keep_sybil",
            },
            {
                "name": "data_error_drop_T1_G1_overlap",
                "if": {"genuine_tiers": ["G1"], "sybil_tiers": ["T1"]},
                "then": "drop",
            },
        ],
        "holdout": {
            "sybil_tiers": ["T1", "T2"],
            "genuine_tiers": ["G1"],
            "size_per_class": 5,
            "random_seed": 42,
        },
    }
    p = tmp / "manifest.yaml"
    p.write_text(yaml.safe_dump(manifest), encoding="utf-8")
    return p


def test_no_duplicate_keys(tmp_path: Path) -> None:
    """Curated dataset has no duplicate (address, chain) keys."""
    manifest_path = _make_manifest(tmp_path)
    cache = tmp_path / "raw"
    # Same address in two sources.
    _write_csv(cache / "src-sybil-t1.csv", [_addr(1), _addr(2)])
    _write_csv(cache / "src-sybil-t4.csv", [_addr(1), _addr(3)])
    _write_csv(cache / "src-genuine-g1.csv", [_addr(10)])

    out = curate(manifest_path, cache, tmp_path / "out.parquet")
    keys = list(zip(out["address"], out["chain"], strict=False))
    assert len(keys) == len(set(keys)), "duplicates found in curated output"


def test_tier_weights_match_manifest() -> None:
    """Tier confidence/weight tables match documented values."""
    assert TIER_CONFIDENCE["T1"] == 0.98
    assert TIER_CONFIDENCE["T4"] == 0.65
    assert TIER_CONFIDENCE["G1"] == 0.95
    # T1 weighted heavier than T4 (honest labels dominate).
    assert TIER_WEIGHT["T1"] > TIER_WEIGHT["T4"]
    assert TIER_WEIGHT["G1"] > TIER_WEIGHT["G2"]


def test_conflict_resolution_genuine_beats_T4_sybil(tmp_path: Path) -> None:
    """G1 genuine beats T4 sybil (Linea/Arbitrum FP scenario)."""
    rows = pd.DataFrame(
        {
            "address": [_addr(1), _addr(1)],
            "chain": ["ethereum", "ethereum"],
            "label_class": ["sybil", "genuine"],
            "tier": ["T4", "G1"],
            "source_id": ["src-sybil-t4", "src-genuine-g1"],
        }
    )
    rules = [
        {
            "if": {"genuine_tiers": ["T1", "T2", "G1"], "sybil_tiers": ["T4", "T5"]},
            "then": "keep_genuine",
        }
    ]
    out = apply_conflict_rules(rows, rules)
    assert len(out) == 1
    assert int(out.iloc[0]["label"]) == 0  # genuine wins


def test_conflict_resolution_T1_G1_overlap_drops(tmp_path: Path) -> None:
    """T1 sybil + G1 genuine on same address = data error, drop."""
    rows = pd.DataFrame(
        {
            "address": [_addr(1), _addr(1)],
            "chain": ["ethereum", "ethereum"],
            "label_class": ["sybil", "genuine"],
            "tier": ["T1", "G1"],
            "source_id": ["src-sybil-t1", "src-genuine-g1"],
        }
    )
    rules = [
        {
            "if": {"genuine_tiers": ["G1"], "sybil_tiers": ["T1"]},
            "then": "drop",
        }
    ]
    out = apply_conflict_rules(rows, rules)
    assert len(out) == 0


def test_curate_is_idempotent(tmp_path: Path) -> None:
    """Running curate twice produces byte-identical parquet."""
    manifest_path = _make_manifest(tmp_path)
    cache = tmp_path / "raw"
    _write_csv(cache / "src-sybil-t1.csv", [_addr(1), _addr(2), _addr(3)])
    _write_csv(cache / "src-genuine-g1.csv", [_addr(10), _addr(11)])

    out1 = tmp_path / "out1.parquet"
    out2 = tmp_path / "out2.parquet"
    curate(manifest_path, cache, out1)
    curate(manifest_path, cache, out2)

    h1 = hashlib.sha256(out1.read_bytes()).hexdigest()
    h2 = hashlib.sha256(out2.read_bytes()).hexdigest()
    assert h1 == h2, "curate is not deterministic"
