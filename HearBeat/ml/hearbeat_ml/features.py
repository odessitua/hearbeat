"""Extract acoustic features from voice check-in audio."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict

import librosa
import numpy as np

from numpy.typing import NDArray

MIN_DURATION_SEC = 0.5
FRAME_LENGTH = 2048
HOP_LENGTH = 512
RMS_THRESHOLD = 0.01


def extract_features(audio_path: str | Path) -> Dict[str, float]:
    """Load audio and return tempo, pause, pitch, and energy features."""
    path = Path(audio_path)
    y, sr = librosa.load(path, sr=22050, mono=True)
    duration_sec = float(len(y) / sr)
    if duration_sec < MIN_DURATION_SEC:
        raise ValueError("AUDIO_TOO_SHORT")

    rms = librosa.feature.rms(y=y, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH)[0]
    if float(np.max(rms)) < RMS_THRESHOLD:
        raise ValueError("AUDIO_SILENT")

    tempo_bpm = _estimate_tempo(y, sr)
    pause_mean_ms = _estimate_pause_mean_ms(rms, sr)
    pitch_std_hz = _estimate_pitch_std(y, sr)
    energy_rms = float(np.mean(rms))

    return {
        "tempo_bpm": round(tempo_bpm, 2),
        "pause_mean_ms": round(pause_mean_ms, 2),
        "pitch_std_hz": round(pitch_std_hz, 2),
        "energy_rms": round(energy_rms, 4),
        "duration_sec": round(duration_sec, 2),
    }


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
    pauses: list[float] = []
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
    voiced: list[float] = []
    for t in range(pitches.shape[1]):
        col = pitches[:, t]
        idx = int(np.argmax(col))
        if col[idx] > 0:
            voiced.append(float(col[idx]))
    if len(voiced) < 2:
        return 0.0
    return float(np.std(voiced))


def main() -> None:
    """CLI: print features JSON for an audio file."""
    parser = argparse.ArgumentParser(description="Extract HearBeat acoustic features")
    parser.add_argument("--audio", required=True, help="Path to wav/mp3 file")
    args = parser.parse_args()
    features = extract_features(args.audio)
    print(json.dumps(features, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
