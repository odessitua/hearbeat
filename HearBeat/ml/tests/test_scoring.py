"""Tests for HearBeat scoring pipeline."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from hearbeat_ml.baseline import aggregate_baseline
from hearbeat_ml.features import extract_features
from hearbeat_ml.scoring import score_against_baseline

DEMO_DIR = Path(__file__).resolve().parents[2] / "data" / "audio" / "demo"
NORMAL_WAV = DEMO_DIR / "normal_response.wav"
TIRED_WAV = DEMO_DIR / "tired_response.wav"

BASELINE_ROWS = [
    {
        "features_json": {
            "tempo_bpm": 115.0,
            "pause_mean_ms": 400.0,
            "pitch_std_hz": 30.0,
            "energy_rms": 0.045,
            "duration_sec": 16.0,
        }
    }
    for _ in range(10)
]


@pytest.fixture(scope="module")
def require_demo_audio() -> None:
    if not NORMAL_WAV.exists() or not TIRED_WAV.exists():
        pytest.skip("Demo WAV files not generated — run generate_demo_audio.py")


def test_aggregate_baseline() -> None:
    baseline = aggregate_baseline(BASELINE_ROWS)
    assert baseline is not None
    assert baseline["tempo_bpm"] == 115.0


def test_tired_scores_lower_than_normal(require_demo_audio: None) -> None:
    baseline = aggregate_baseline(BASELINE_ROWS)
    assert baseline is not None
    normal_features = extract_features(NORMAL_WAV)
    tired_features = extract_features(TIRED_WAV)
    normal_score = score_against_baseline(normal_features, baseline)
    tired_score = score_against_baseline(tired_features, baseline)
    assert tired_score.vitality_score < normal_score.vitality_score
    assert tired_score.status == "check-in needed"
    assert normal_score.status == "normal"


def test_features_cli_shape(require_demo_audio: None) -> None:
    features = extract_features(NORMAL_WAV)
    parsed = json.loads(json.dumps(features))
    for key in ("tempo_bpm", "pause_mean_ms", "pitch_std_hz", "energy_rms", "duration_sec"):
        assert key in parsed
        assert isinstance(parsed[key], (int, float))
