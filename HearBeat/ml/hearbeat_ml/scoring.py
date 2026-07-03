"""Vitality scoring and Ukrainian deviation explanations."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

FeatureDict = Dict[str, float]

DEVIATION_THRESHOLD = 0.25
LOW_VITALITY_THRESHOLD = 65.0
ACOUSTIC_INDEX_ALERT_THRESHOLD = 65.0
ACOUSTIC_INDEX_SOFT_THRESHOLD = 85.0
MIN_WORSE_METRICS_FOR_SOFT_ALERT = 2

# Index for trend/calibration: tempo + pauses + energy only.
# pitch_std from piptrack on live speech is noisy (~1200–1400 for everyone).
FATIGUE_WEIGHTS = {
    "tempo_bpm": 0.35,
    "pause_mean_ms": 0.35,
    "energy_rms": 0.30,
}

WEIGHTS = {
    **FATIGUE_WEIGHTS,
    "pitch_std_hz": 0.0,
}

LOWER_IS_WORSE = {"tempo_bpm", "pitch_std_hz", "energy_rms"}
HIGHER_IS_WORSE = {"pause_mean_ms"}

FATIGUE_KEYS = tuple(FATIGUE_WEIGHTS.keys())
DEVIATION_PCT_THRESHOLD = DEVIATION_THRESHOLD * 100.0


def is_worse_deviation(key: str, signed_pct: float) -> bool:
    """True when deviation is in the fatigue direction (slower, quieter, longer pauses)."""
    if key in LOWER_IS_WORSE:
        return signed_pct <= -DEVIATION_PCT_THRESHOLD
    if key in HIGHER_IS_WORSE:
        return signed_pct >= DEVIATION_PCT_THRESHOLD
    return False


def count_worse_deviations(metric_deviations: Dict[str, float]) -> int:
    """Number of fatigue metrics deviating in the worse direction beyond threshold."""
    return sum(
        1 for key in FATIGUE_KEYS if is_worse_deviation(key, metric_deviations[key])
    )


def needs_checkin(acoustic_index: float, metric_deviations: Dict[str, float]) -> bool:
    """Alert when clearly below baseline: low index or multiple bad metrics."""
    if not any(is_worse_deviation(key, metric_deviations[key]) for key in FATIGUE_KEYS):
        return False
    if acoustic_index < ACOUSTIC_INDEX_ALERT_THRESHOLD:
        return True
    return (
        acoustic_index < ACOUSTIC_INDEX_SOFT_THRESHOLD
        and count_worse_deviations(metric_deviations) >= MIN_WORSE_METRICS_FOR_SOFT_ALERT
    )


@dataclass
class ScoreResult:
    """Analysis output matching checkins table fields."""

    vitality_score: float
    acoustic_index: float
    metric_deviations: Dict[str, float]
    status: str
    acoustic_delta: str
    features_json: FeatureDict
    baseline_calibrated: bool


def signed_deviation_pct(current: float, baseline: float) -> float:
    """Percent change vs baseline; positive = higher than baseline."""
    if baseline == 0:
        return 0.0
    return round((current - baseline) / baseline * 100.0, 1)


def metric_index_pct(key: str, current: float, baseline: float) -> float:
    """Per-metric index with 100 = baseline; unbounded in both directions."""
    if baseline == 0:
        return 100.0
    if key in HIGHER_IS_WORSE:
        if current <= 0:
            return 100.0
        return 100.0 * baseline / current
    return 100.0 * current / baseline


def compute_acoustic_index(current: FeatureDict, baseline: FeatureDict) -> float:
    """Weighted fatigue index; 100 = baseline; uses tempo, pauses, energy only."""
    total = 0.0
    weight_sum = 0.0
    for key, weight in FATIGUE_WEIGHTS.items():
        total += metric_index_pct(key, current[key], baseline[key]) * weight
        weight_sum += weight
    if weight_sum == 0:
        return 100.0
    return round(total / weight_sum, 1)


def compute_metric_deviations(
    current: FeatureDict,
    baseline: FeatureDict,
) -> Dict[str, float]:
    """Signed % deviation per acoustic feature vs baseline (incl. pitch for debug)."""
    keys = ("tempo_bpm", "pause_mean_ms", "pitch_std_hz", "energy_rms")
    return {key: signed_deviation_pct(current[key], baseline[key]) for key in keys}


def score_against_baseline(
    current: FeatureDict,
    baseline: Optional[FeatureDict],
    baseline_calibrated: bool = False,
) -> ScoreResult:
    """Compare current features to baseline; return vitality and status."""
    if baseline is None or len(baseline) < 4:
        return ScoreResult(
            vitality_score=75.0,
            acoustic_index=100.0,
            metric_deviations={},
            status="normal",
            acoustic_delta="Базовий рівень ще формується",
            features_json=current,
            baseline_calibrated=False,
        )

    metric_deviations = compute_metric_deviations(current, baseline)
    acoustic_index = compute_acoustic_index(current, baseline)

    deviations: List[Tuple[str, float, str]] = []
    weighted_penalty = 0.0

    for key, weight in FATIGUE_WEIGHTS.items():
        cur = current[key]
        base = baseline[key]
        if base == 0:
            continue
        ratio = (cur - base) / base
        signed = metric_deviations[key]
        if is_worse_deviation(key, signed):
            deviations.append((key, abs(ratio), _label_signed(key, signed)))

        if key in LOWER_IS_WORSE and ratio < 0:
            mag = abs(ratio)
            weighted_penalty += mag * weight
        elif key in HIGHER_IS_WORSE and ratio > 0:
            mag = ratio
            weighted_penalty += mag * weight

    vitality = max(0.0, min(100.0, 100.0 - weighted_penalty * 100.0))
    deviations.sort(key=lambda x: x[1], reverse=True)
    top = deviations[:2]

    if not baseline_calibrated:
        status = "normal"
        acoustic_delta = (
            "Порівняння з демо-baseline — збережіть свій бодрий запис як baseline "
            "для оцінки втоми"
        )
    else:
        checkin = needs_checkin(acoustic_index, metric_deviations)
        status = "check-in needed" if checkin else "normal"
        if not top:
            if acoustic_index > 105:
                acoustic_delta = "Голос бодріший за звичний baseline — без приводів для тривоги"
            else:
                acoustic_delta = "Голос звучить як зазвичай"
        else:
            acoustic_delta = "; ".join(d[2] for d in top)

    return ScoreResult(
        vitality_score=round(vitality, 1),
        acoustic_index=acoustic_index,
        metric_deviations=metric_deviations,
        status=status,
        acoustic_delta=acoustic_delta,
        features_json=current,
        baseline_calibrated=baseline_calibrated,
    )


def _pct(mag: float) -> int:
    return int(round(mag * 100))


def _label_signed(key: str, signed_pct: float) -> str:
    """Ukrainian label for signed deviation from baseline."""
    mag = abs(int(round(signed_pct)))
    if key == "tempo_bpm":
        if signed_pct < 0:
            return f"Темп мовлення нижчий на {mag}%"
        return f"Темп мовлення вищий на {mag}%"
    if key == "pause_mean_ms":
        if signed_pct > 0:
            return f"Паузи довші на {mag}%"
        return f"Паузи коротші на {mag}%"
    if key == "pitch_std_hz":
        if signed_pct < 0:
            return f"Інтонація менш виразна на {mag}%"
        return f"Інтонація виразніша на {mag}%"
    if key == "energy_rms":
        if signed_pct < 0:
            return f"Енергія голосу нижча на {mag}%"
        return f"Енергія голосу вища на {mag}%"
    return f"Відхилення {key} на {mag}%"
