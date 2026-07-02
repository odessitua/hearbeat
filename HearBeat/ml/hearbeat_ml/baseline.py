"""Baseline aggregation from historical check-in features."""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, Optional

FeatureDict = Dict[str, float]
FEATURE_KEYS = ("tempo_bpm", "pause_mean_ms", "pitch_std_hz", "energy_rms")


def aggregate_baseline(rows: List[Mapping[str, Any]]) -> Optional[FeatureDict]:
    """Compute mean acoustic features from baseline check-in rows."""
    if not rows:
        return None
    sums: Dict[str, float] = {k: 0.0 for k in FEATURE_KEYS}
    count = 0
    for row in rows:
        fj = row.get("features_json")
        if not fj or not isinstance(fj, dict):
            continue
        try:
            for key in FEATURE_KEYS:
                sums[key] += float(fj[key])
            count += 1
        except (KeyError, TypeError, ValueError):
            continue
    if count == 0:
        return None
    return {k: round(sums[k] / count, 4) for k in FEATURE_KEYS}


def inline_baseline_from_json(data: Mapping[str, Any]) -> Optional[FeatureDict]:
    """Parse baseline_features from API request for offline tests."""
    raw = data.get("baseline_features")
    if raw is None:
        return None
    if isinstance(raw, str):
        import json

        parsed = json.loads(raw)
    else:
        parsed = raw
    if not isinstance(parsed, dict):
        return None
    return {k: float(parsed[k]) for k in FEATURE_KEYS if k in parsed}
