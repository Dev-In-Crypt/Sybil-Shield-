"""Temporal-pattern features."""
from __future__ import annotations

from datetime import UTC, datetime

import numpy as np
from scipy.stats import entropy

from sybilshield.types import RawAddressData

DEFAULTS: dict[str, float | int] = {
    "first_tx_timestamp": 0,
    "last_tx_timestamp": 0,
    "account_age_days": 0.0,
    "active_days": 0,
    "active_day_ratio": 0.0,
    "avg_time_between_txs": 0.0,
    "std_time_between_txs": 0.0,
    "hour_entropy": 0.0,
    "day_of_week_entropy": 0.0,
    "burst_score": 1.0,
    "max_txs_per_hour": 0,
    "min_inter_tx_seconds": 0,
    "activity_regularity": 0.0,
}


def extract_temporal_features(data: RawAddressData) -> dict[str, float | int]:
    timestamps = sorted([t.timestamp for t in data.transactions if t.timestamp])
    if len(timestamps) < 2:
        return dict(DEFAULTS)

    deltas = np.diff(timestamps)
    hours = [datetime.fromtimestamp(ts, tz=UTC).hour for ts in timestamps]
    hour_counts = np.bincount(hours, minlength=24)
    hour_ent = float(entropy(hour_counts + 1))
    days = [datetime.fromtimestamp(ts, tz=UTC).weekday() for ts in timestamps]
    day_counts = np.bincount(days, minlength=7)
    day_ent = float(entropy(day_counts + 1))

    time_range = timestamps[-1] - timestamps[0]
    if time_range > 0:
        window = max(1, time_range // 10)
        # bucket counts
        buckets = np.zeros(11, dtype=int)
        for ts in timestamps:
            idx = min(10, (ts - timestamps[0]) // window)
            buckets[idx] += 1
        burst_score = float(buckets.max() / len(timestamps))
    else:
        burst_score = 1.0

    age_days = max(1.0, time_range / 86400.0)
    active_days = len({datetime.fromtimestamp(ts, tz=UTC).date() for ts in timestamps})

    return {
        "first_tx_timestamp": timestamps[0],
        "last_tx_timestamp": timestamps[-1],
        "account_age_days": age_days,
        "active_days": active_days,
        "active_day_ratio": active_days / age_days,
        "avg_time_between_txs": float(np.mean(deltas)),
        "std_time_between_txs": float(np.std(deltas)),
        "hour_entropy": hour_ent,
        "day_of_week_entropy": day_ent,
        "burst_score": burst_score,
        "max_txs_per_hour": int(hour_counts.max()),
        "min_inter_tx_seconds": int(deltas.min()),
        "activity_regularity": _autocorr(deltas),
    }


def _autocorr(deltas: np.ndarray) -> float:
    """Lag-1 autocorrelation of inter-tx gaps. High = mechanical regularity."""
    if len(deltas) < 3:
        return 0.0
    x = deltas[:-1].astype(float)
    y = deltas[1:].astype(float)
    sx, sy = x.std(), y.std()
    if sx == 0 or sy == 0:
        return 1.0  # perfectly regular
    return float(np.corrcoef(x, y)[0, 1])
