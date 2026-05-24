"""LightGBM Sybil scoring model wrapper."""
from __future__ import annotations

import hashlib
import json
import pickle
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import numpy as np

from sybilshield.features.combine import FEATURE_NAMES


@dataclass
class ModelMetrics:
    precision_at_70: float = 0.0
    recall_at_70: float = 0.0
    f1_at_70: float = 0.0
    fpr_at_70_on_G1: float = 0.0
    roc_auc: float = 0.0
    adversarial_recall: float = 0.0
    n_train: int = 0
    n_holdout_sybil: int = 0
    n_holdout_genuine: int = 0


@dataclass
class ModelArtifact:
    version: str
    feature_names: list[str]
    feature_schema_hash: str
    training_manifest_hash: str
    metrics: ModelMetrics
    trained_at: str
    model_bytes: bytes = field(repr=False)

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["model_bytes_b64"] = self.model_bytes.hex()
        d.pop("model_bytes")
        return d


def feature_schema_hash(names: list[str] = FEATURE_NAMES) -> str:
    return hashlib.sha256("|".join(names).encode()).hexdigest()[:16]


def label_from_score(score: int) -> str:
    """Map 0-100 sybil score to human label."""
    if score >= 70:
        return "sybil"
    if score >= 40:
        return "suspicious"
    return "genuine"


class SybilModel:
    """Thin wrapper over lightgbm.LGBMClassifier with schema-checked loading."""

    def __init__(self, lgb_model: Any, artifact: ModelArtifact) -> None:
        self.lgb = lgb_model
        self.artifact = artifact

    def predict_scores(self, X: np.ndarray) -> np.ndarray:
        """Return integer scores 0-100."""
        prob = self.lgb.predict_proba(X)[:, 1]
        return (prob * 100).round().astype(int).clip(0, 100)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.lgb.predict_proba(X)[:, 1]

    def save(self, path: Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        meta = self.artifact.to_dict()
        with path.open("wb") as f:
            pickle.dump({"meta": meta, "model": self.lgb}, f)

    @classmethod
    def load(cls, path: Path) -> "SybilModel":
        with Path(path).open("rb") as f:
            obj = pickle.load(f)
        meta = obj["meta"]
        # Schema check
        expected = feature_schema_hash()
        if meta["feature_schema_hash"] != expected:
            raise ValueError(
                f"model schema {meta['feature_schema_hash']} does not match current {expected}"
            )
        artifact = ModelArtifact(
            version=meta["version"],
            feature_names=meta["feature_names"],
            feature_schema_hash=meta["feature_schema_hash"],
            training_manifest_hash=meta["training_manifest_hash"],
            metrics=ModelMetrics(**meta["metrics"]),
            trained_at=meta["trained_at"],
            model_bytes=bytes.fromhex(meta.get("model_bytes_b64", "")),
        )
        return cls(obj["model"], artifact)

    def metrics_json(self) -> str:
        return json.dumps(asdict(self.artifact.metrics), indent=2)
