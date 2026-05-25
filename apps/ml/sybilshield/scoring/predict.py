"""Batch prediction over a dict of address -> features."""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from sybilshield.features.combine import FEATURE_NAMES, to_feature_vector
from sybilshield.scoring.model import SybilModel, label_from_score


def predict_batch(
    model: SybilModel,
    features_by_address: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """
    Run model over a dict address -> features dict.

    Returns dict address -> {score, label, confidence}.
    """
    addresses = list(features_by_address.keys())
    if not addresses:
        return {}
    # Wrap the matrix in a DataFrame with named columns so LightGBM doesn't
    # warn 'X does not have valid feature names' on every /run call. The
    # booster was fitted against the same FEATURE_NAMES ordering — this is
    # a pure-presentation fix, values are identical.
    rows = [to_feature_vector(features_by_address[a]) for a in addresses]
    X = pd.DataFrame(np.asarray(rows, dtype=float), columns=FEATURE_NAMES)
    scores = model.predict_scores(X)
    probs = model.predict_proba(X)
    out: dict[str, dict[str, Any]] = {}
    for i, addr in enumerate(addresses):
        s = int(scores[i])
        out[addr] = {
            "sybil_score": s,
            "label": label_from_score(s),
            "confidence": float(probs[i]),
        }
    return out
