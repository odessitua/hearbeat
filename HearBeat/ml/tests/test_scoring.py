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
    normal_features = extract_features(NORMAL_WAV)
    tired_features = extract_features(TIRED_WAV)
    baseline = {
        k: normal_features[k]
        for k in ("tempo_bpm", "pause_mean_ms", "pitch_std_hz", "energy_rms")
    }
    normal_score = score_against_baseline(normal_features, baseline, baseline_calibrated=True)
    tired_score = score_against_baseline(tired_features, baseline, baseline_calibrated=True)
    assert normal_score.acoustic_index == 100.0
    assert tired_score.acoustic_index < normal_score.acoustic_index
    assert tired_score.status == "check-in needed"
    assert normal_score.status == "normal"


def test_acoustic_index_unbounded_vs_demo_baseline(require_demo_audio: None) -> None:
    """Live-like speech faster than synthetic demo → index can exceed 100."""
    baseline = aggregate_baseline(BASELINE_ROWS)
    assert baseline is not None
    energetic = {
        "tempo_bpm": 329.79,
        "pause_mean_ms": 118.42,
        "pitch_std_hz": 1297.03,
        "energy_rms": 0.0622,
        "duration_sec": 5.64,
    }
    tired = {
        "tempo_bpm": 201.26,
        "pause_mean_ms": 265.97,
        "pitch_std_hz": 1373.4,
        "energy_rms": 0.0541,
        "duration_sec": 9.54,
    }
    vs_demo = score_against_baseline(energetic, baseline)
    assert vs_demo.acoustic_index > 100.0

    personal = {k: energetic[k] for k in baseline}
    energetic_self = score_against_baseline(energetic, personal, baseline_calibrated=True)
    tired_vs_personal = score_against_baseline(tired, personal, baseline_calibrated=True)
    assert energetic_self.acoustic_index == 100.0
    assert tired_vs_personal.acoustic_index < energetic_self.acoustic_index
    assert tired_vs_personal.acoustic_index < 65.0


def test_live_voice_ranking_from_user_samples() -> None:
    """User samples: energetic baseline → tired_sad lowest index."""
    energetic = {
        "tempo_bpm": 348.31,
        "pause_mean_ms": 97.52,
        "pitch_std_hz": 1370.98,
        "energy_rms": 0.0865,
        "duration_sec": 5.34,
    }
    baseline = {k: energetic[k] for k in ("tempo_bpm", "pause_mean_ms", "pitch_std_hz", "energy_rms")}
    samples = {
        "tired_sad": {
            "tempo_bpm": 214.72,
            "pause_mean_ms": 454.08,
            "pitch_std_hz": 1402.8,
            "energy_rms": 0.0414,
            "duration_sec": 9.78,
        },
        "tired2": {
            "tempo_bpm": 202.8,
            "pause_mean_ms": 236.84,
            "pitch_std_hz": 1402.75,
            "energy_rms": 0.0633,
            "duration_sec": 8.58,
        },
        "normal": {
            "tempo_bpm": 318.18,
            "pause_mean_ms": 212.85,
            "pitch_std_hz": 1224.66,
            "energy_rms": 0.0551,
            "duration_sec": 5.28,
        },
    }
    scores = {
        name: score_against_baseline(feat, baseline, baseline_calibrated=True).acoustic_index
        for name, feat in samples.items()
    }
    assert scores["tired_sad"] < scores["tired2"] < scores["normal"] < 100.0


def test_happy_voice_not_checkin_when_pauses_shorter() -> None:
    """Bodrier than baseline (shorter pauses) must not trigger call alert."""
    baseline = {
        "tempo_bpm": 280.0,
        "pause_mean_ms": 200.0,
        "pitch_std_hz": 1300.0,
        "energy_rms": 0.06,
    }
    happy = {
        "tempo_bpm": 320.0,
        "pause_mean_ms": 94.0,
        "pitch_std_hz": 1350.0,
        "energy_rms": 0.08,
        "duration_sec": 5.0,
    }
    result = score_against_baseline(happy, baseline, baseline_calibrated=True)
    assert result.acoustic_index > 100.0
    assert result.status == "normal"


def test_two_metric_fatigue_triggers_checkin_at_index_70() -> None:
    """Index 65–85 with tempo + pauses worse than baseline → alert."""
    baseline = {
        "tempo_bpm": 302.0,
        "pause_mean_ms": 179.0,
        "pitch_std_hz": 1300.0,
        "energy_rms": 0.057,
    }
    tired = {
        "tempo_bpm": 187.1,
        "pause_mean_ms": 415.06,
        "pitch_std_hz": 1336.37,
        "energy_rms": 0.0568,
        "duration_sec": 9.3,
    }
    result = score_against_baseline(tired, baseline, baseline_calibrated=True)
    assert 65 <= result.acoustic_index < 85
    assert result.status == "check-in needed"


def test_features_cli_shape(require_demo_audio: None) -> None:
    features = extract_features(NORMAL_WAV)
    parsed = json.loads(json.dumps(features))
    for key in ("tempo_bpm", "pause_mean_ms", "pitch_std_hz", "energy_rms", "duration_sec"):
        assert key in parsed
        assert isinstance(parsed[key], (int, float))


def test_time_series_shape(require_demo_audio: None) -> None:
    from hearbeat_ml.features import extract_time_series

    series = extract_time_series(NORMAL_WAV)
    assert len(series["rms_envelope"]) > 0
    assert "rms" in series["rms_envelope"][0]
    assert "t_sec" in series["rms_envelope"][0]
    assert series["rms_threshold"] > 0
    assert isinstance(series["pitch_contour"], list)
