"""HearBeat acoustic engine — single-file FastAPI service for the demo.

Minimal slice of the full HearBeat ML pipeline (see ``HearBeat/ml``): extracts
acoustic features from a short voice recording via librosa and compares them
against a personal baseline to produce an unbounded "acoustic index" (100 =
baseline). No Supabase, no LLM summary, no time-series export — only what the
"Свій бейзлайн / Перевірка" block in the demo page needs.

Run locally:
    uvicorn app:app --reload --port 8000

Deploy (Railway/Render): point the service at this folder, start command
``uvicorn app:app --host 0.0.0.0 --port $PORT``.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import librosa
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from numpy.typing import NDArray
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Acoustic feature extraction (trimmed from HearBeat/ml/hearbeat_ml/features.py)
# ---------------------------------------------------------------------------

MIN_DURATION_SEC = 0.5
FRAME_LENGTH = 2048
HOP_LENGTH = 512
RMS_THRESHOLD = 0.01

FeatureDict = Dict[str, float]


def _load_audio(path: Path) -> Tuple[NDArray[np.floating[Any]], int, NDArray[np.floating[Any]], float]:
    """Load mono audio and per-frame RMS; raise on too short or silent input."""
    y, sr = librosa.load(path, sr=22050, mono=True)
    duration_sec = float(len(y) / sr)
    if duration_sec < MIN_DURATION_SEC:
        raise ValueError("AUDIO_TOO_SHORT")

    rms = librosa.feature.rms(y=y, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH)[0]
    if float(np.max(rms)) < RMS_THRESHOLD:
        raise ValueError("AUDIO_SILENT")

    return y, sr, rms, duration_sec


def _estimate_tempo(y: NDArray[np.floating[Any]], sr: int) -> float:
    """Estimate speech rate proxy from onset density and beat tempo."""
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP_LENGTH)
    onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, hop_length=HOP_LENGTH)
    duration = len(y) / sr
    if duration <= 0:
        return 0.0
    onset_rate = len(onsets) / duration * 60.0
    try:
        tempo_arr = librosa.feature.rhythm.tempo(
            onset_envelope=onset_env, sr=sr, hop_length=HOP_LENGTH
        )
        tempo = float(tempo_arr[0])
    except Exception:
        tempo = onset_rate
    return max(onset_rate, tempo * 0.5)


def _estimate_pause_mean_ms(rms: NDArray[np.floating[Any]], sr: int) -> float:
    """Mean duration of low-energy (pause) segments in milliseconds."""
    is_pause = rms < RMS_THRESHOLD
    pauses: List[float] = []
    run = 0
    for val in is_pause:
        if val:
            run += 1
        elif run > 0:
            pauses.append(run * HOP_LENGTH / sr * 1000.0)
            run = 0
    if run > 0:
        pauses.append(run * HOP_LENGTH / sr * 1000.0)
    if not pauses:
        return 0.0
    return float(np.mean(pauses))


def _estimate_pitch_std(y: NDArray[np.floating[Any]], sr: int) -> float:
    """Pitch variability via piptrack dominant frequencies."""
    pitches, _ = librosa.piptrack(y=y, sr=sr, hop_length=HOP_LENGTH)
    voiced: List[float] = []
    for t in range(pitches.shape[1]):
        col = pitches[:, t]
        idx = int(np.argmax(col))
        if col[idx] > 0:
            voiced.append(float(col[idx]))
    if len(voiced) < 2:
        return 0.0
    return float(np.std(voiced))


def extract_features(audio_path: Path) -> FeatureDict:
    """Load audio and return tempo, pause, pitch, and energy features."""
    y, sr, rms, duration_sec = _load_audio(audio_path)

    return {
        "tempo_bpm": round(_estimate_tempo(y, sr), 2),
        "pause_mean_ms": round(_estimate_pause_mean_ms(rms, sr), 2),
        "pitch_std_hz": round(_estimate_pitch_std(y, sr), 2),
        "energy_rms": round(float(np.mean(rms)), 4),
        "duration_sec": round(duration_sec, 2),
    }


# ---------------------------------------------------------------------------
# Scoring (trimmed from HearBeat/ml/hearbeat_ml/scoring.py)
# ---------------------------------------------------------------------------

DEVIATION_THRESHOLD = 0.25
ACOUSTIC_INDEX_ALERT_THRESHOLD = 65.0
ACOUSTIC_INDEX_SOFT_THRESHOLD = 85.0
MIN_WORSE_METRICS_FOR_SOFT_ALERT = 2

# tempo + pauses + energy only — pitch_std from piptrack on live speech is
# noisy (~1200-1400 for everyone) so it is excluded from the weighted index.
FATIGUE_WEIGHTS = {
    "tempo_bpm": 0.35,
    "pause_mean_ms": 0.35,
    "energy_rms": 0.30,
}
LOWER_IS_WORSE = {"tempo_bpm", "energy_rms"}
HIGHER_IS_WORSE = {"pause_mean_ms"}
FATIGUE_KEYS = tuple(FATIGUE_WEIGHTS.keys())
DEVIATION_PCT_THRESHOLD = DEVIATION_THRESHOLD * 100.0


def _signed_deviation_pct(current: float, baseline: float) -> float:
    """Percent change vs baseline; positive = higher than baseline."""
    if baseline == 0:
        return 0.0
    return round((current - baseline) / baseline * 100.0, 1)


def _is_worse_deviation(key: str, signed_pct: float) -> bool:
    if key in LOWER_IS_WORSE:
        return signed_pct <= -DEVIATION_PCT_THRESHOLD
    if key in HIGHER_IS_WORSE:
        return signed_pct >= DEVIATION_PCT_THRESHOLD
    return False


def _metric_index_pct(key: str, current: float, baseline: float) -> float:
    """Per-metric index with 100 = baseline; unbounded in both directions."""
    if baseline == 0:
        return 100.0
    if key in HIGHER_IS_WORSE:
        if current <= 0:
            return 100.0
        return 100.0 * baseline / current
    return 100.0 * current / baseline


def _compute_acoustic_index(current: FeatureDict, baseline: FeatureDict) -> float:
    """Weighted fatigue index; 100 = baseline; uses tempo, pauses, energy only."""
    total = 0.0
    weight_sum = 0.0
    for key, weight in FATIGUE_WEIGHTS.items():
        total += _metric_index_pct(key, current[key], baseline[key]) * weight
        weight_sum += weight
    if weight_sum == 0:
        return 100.0
    return round(total / weight_sum, 1)


def _label_signed(key: str, signed_pct: float) -> str:
    """Ukrainian label for signed deviation from baseline."""
    mag = abs(int(round(signed_pct)))
    if key == "tempo_bpm":
        return f"Темп мовлення {'нижчий' if signed_pct < 0 else 'вищий'} на {mag}%"
    if key == "pause_mean_ms":
        return f"Паузи {'довші' if signed_pct > 0 else 'коротші'} на {mag}%"
    if key == "energy_rms":
        return f"Енергія голосу {'нижча' if signed_pct < 0 else 'вища'} на {mag}%"
    return f"Відхилення {key} на {mag}%"


def _needs_checkin(acoustic_index: float, worse_count: int) -> bool:
    """Alert when clearly below baseline: low index or multiple bad metrics."""
    if worse_count == 0:
        return False
    if acoustic_index < ACOUSTIC_INDEX_ALERT_THRESHOLD:
        return True
    return acoustic_index < ACOUSTIC_INDEX_SOFT_THRESHOLD and worse_count >= MIN_WORSE_METRICS_FOR_SOFT_ALERT


class ScoreResult(BaseModel):
    """Analysis output — matches the AnalyzeResponse contract below."""

    features_json: FeatureDict
    acoustic_index: float
    metric_deviations: Dict[str, float]
    status: str
    acoustic_delta: str
    baseline_calibrated: bool


def score_against_baseline(current: FeatureDict, baseline: Optional[FeatureDict]) -> ScoreResult:
    """Compare current features to a personal baseline; return index + status."""
    if baseline is None:
        return ScoreResult(
            features_json=current,
            acoustic_index=100.0,
            metric_deviations={},
            status="normal",
            acoustic_delta="Немає збереженого бейзлайну — спочатку запишіть еталонний голос",
            baseline_calibrated=False,
        )

    metric_deviations = {
        key: _signed_deviation_pct(current[key], baseline[key])
        for key in ("tempo_bpm", "pause_mean_ms", "pitch_std_hz", "energy_rms")
        if key in baseline
    }
    acoustic_index = _compute_acoustic_index(current, baseline)

    deviations: List[Tuple[str, float, str]] = []
    for key in FATIGUE_KEYS:
        signed = metric_deviations.get(key, 0.0)
        if _is_worse_deviation(key, signed):
            deviations.append((key, abs(signed), _label_signed(key, signed)))
    deviations.sort(key=lambda item: item[1], reverse=True)

    checkin = _needs_checkin(acoustic_index, len(deviations))
    status = "check-in needed" if checkin else "normal"

    if not deviations:
        acoustic_delta = (
            "Голос бодріший за звичний бейзлайн — без приводів для тривоги"
            if acoustic_index > 105
            else "Звучить близько до вашого бейзлайну"
        )
    else:
        acoustic_delta = "; ".join(label for _key, _mag, label in deviations[:2])

    return ScoreResult(
        features_json=current,
        acoustic_index=acoustic_index,
        metric_deviations=metric_deviations,
        status=status,
        acoustic_delta=acoustic_delta,
        baseline_calibrated=True,
    )


def parse_baseline_json(raw: Optional[str]) -> Optional[FeatureDict]:
    """Parse the ``baseline_features`` form field sent by the client."""
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError):
        return None
    if not isinstance(parsed, dict):
        return None
    keys = ("tempo_bpm", "pause_mean_ms", "pitch_std_hz", "energy_rms")
    try:
        return {key: float(parsed[key]) for key in keys if key in parsed}
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="HearBeat Engine (demo)", version="0.1.0")

_cors_raw = os.getenv("CORS_ORIGINS", "*")
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_cors_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeResponse(BaseModel):
    features_json: FeatureDict
    acoustic_index: float
    metric_deviations: Dict[str, float] = Field(default_factory=dict)
    status: str
    acoustic_delta: str
    baseline_calibrated: bool


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    audio_file: UploadFile = File(...),
    baseline_features: Optional[str] = Form(None),
) -> AnalyzeResponse:
    """Extract acoustic features from ``audio_file`` and score vs baseline.

    If ``baseline_features`` is omitted, the response echoes the extracted
    features with ``acoustic_index=100`` and ``baseline_calibrated=false`` —
    the client is expected to store this as the new baseline.
    """
    suffix = Path(audio_file.filename or "audio.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = Path(tmp.name)
    try:
        tmp_path.write_bytes(await audio_file.read())
        try:
            features = extract_features(tmp_path)
        except ValueError as exc:
            code = str(exc)
            if code in ("AUDIO_TOO_SHORT", "AUDIO_SILENT"):
                raise HTTPException(status_code=422, detail={"error": code, "code": code}) from exc
            raise HTTPException(
                status_code=400, detail={"error": str(exc), "code": "INVALID_FORMAT"}
            ) from exc

        baseline = parse_baseline_json(baseline_features)
        result = score_against_baseline(features, baseline)
        return AnalyzeResponse(**result.model_dump())
    finally:
        tmp_path.unlink(missing_ok=True)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
