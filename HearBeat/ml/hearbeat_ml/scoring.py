"""Vitality scoring and Ukrainian deviation explanations."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional, Tuple

FeatureDict = Dict[str, float]

DEVIATION_THRESHOLD = 0.25
LOW_VITALITY_THRESHOLD = 65.0
WEIGHTS = {
    "tempo_bpm": 0.30,
    "pause_mean_ms": 0.30,
    "pitch_std_hz": 0.20,
    "energy_rms": 0.20,
}
# Lower tempo/energy/pitch and higher pauses => worse vitality
LOWER_IS_WORSE = {"tempo_bpm", "pitch_std_hz", "energy_rms"}
HIGHER_IS_WORSE = {"pause_mean_ms"}


@dataclass
class ScoreResult:
    """Analysis output matching checkins table fields."""

    vitality_score: float
    status: str
    acoustic_delta: str
    features_json: FeatureDict


def score_against_baseline(
    current: FeatureDict,
    baseline: Optional[FeatureDict],
) -> ScoreResult:
    """Compare current features to baseline; return vitality and status."""
    if baseline is None or len(baseline) < 4:
        return ScoreResult(
            vitality_score=75.0,
            status="normal",
            acoustic_delta="Базовий рівень ще формується",
            features_json=current,
        )

    deviations: list[Tuple[str, float, str]] = []
    weighted_penalty = 0.0

    for key, weight in WEIGHTS.items():
        cur = current[key]
        base = baseline[key]
        if base == 0:
            continue
        ratio = (cur - base) / base
        if key in LOWER_IS_WORSE and ratio < 0:
            mag = abs(ratio)
            deviations.append((key, mag, _label_lower(key, mag)))
            weighted_penalty += mag * weight
        elif key in HIGHER_IS_WORSE and ratio > 0:
            mag = ratio
            deviations.append((key, mag, _label_higher(key, mag)))
            weighted_penalty += mag * weight

    vitality = max(0.0, min(100.0, 100.0 - weighted_penalty * 100.0))
    deviations.sort(key=lambda x: x[1], reverse=True)
    top = deviations[:2]

    needs_checkin = (
        vitality < LOW_VITALITY_THRESHOLD
        or any(d[1] >= DEVIATION_THRESHOLD for d in deviations)
    )
    status = "check-in needed" if needs_checkin else "normal"

    if not top:
        acoustic_delta = "Голос звучить як зазвичай"
    else:
        parts = [d[2] for d in top]
        acoustic_delta = "; ".join(parts)

    return ScoreResult(
        vitality_score=round(vitality, 1),
        status=status,
        acoustic_delta=acoustic_delta,
        features_json=current,
    )


def _pct(mag: float) -> int:
    return int(round(mag * 100))


def _label_lower(key: str, mag: float) -> str:
    labels = {
        "tempo_bpm": f"Темп мовлення нижчий на {_pct(mag)}%",
        "pitch_std_hz": f"Інтонація менш виразна на {_pct(mag)}%",
        "energy_rms": f"Енергія голосу нижча на {_pct(mag)}%",
    }
    return labels.get(key, f"Відхилення {key}")


def _label_higher(key: str, mag: float) -> str:
    if key == "pause_mean_ms":
        return f"Паузи довші на {_pct(mag)}%"
    return f"Відхилення {key} на {_pct(mag)}%"
