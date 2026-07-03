#!/usr/bin/env python3
"""Generate synthetic demo WAV files with distinct acoustic profiles."""

from __future__ import annotations

import json
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml"))

from hearbeat_ml.features import extract_features  # noqa: E402

OUT_DIR = Path(__file__).resolve().parents[1] / "audio" / "demo"
WEB_DEMO_DIR = ROOT / "web" / "public" / "demo-audio"
SR = 22050


def _write_wav(path: Path, signal: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    clipped = np.clip(signal, -1.0, 1.0)
    pcm = (clipped * 32767).astype(np.int16)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())


def _syllable_burst(duration: float, freq: float, amp: float) -> np.ndarray:
    t = np.linspace(0, duration, int(SR * duration), endpoint=False)
    env = np.sin(np.pi * t / duration) ** 2
    return amp * env * np.sin(2 * np.pi * freq * t)


def synthesize_normal() -> np.ndarray:
    """Stable pitch, moderate tempo — should match Maria baseline after tuning."""
    chunks: list[np.ndarray] = []
    syllable_dur = 0.32
    pause_sec = 0.36
    amp = 0.14
    # Small pitch wobble (~±4 Hz) → pitch_std near baseline, not 300+
    freqs = [198, 201, 199, 202, 200, 201, 198, 200, 199, 201]
    for i, freq in enumerate(freqs):
        chunks.append(_syllable_burst(syllable_dur, freq, amp))
        if i < len(freqs) - 1:
            chunks.append(np.zeros(int(SR * pause_sec)))
    return np.concatenate(chunks)


def synthesize_tired() -> np.ndarray:
    """Slower, quieter, longer pauses, flatter pitch."""
    chunks: list[np.ndarray] = []
    syllable_dur = 0.42
    pause_sec = 0.58
    amp = 0.07
    freqs = [196, 197, 196, 197, 196, 197, 196]
    for i, freq in enumerate(freqs):
        chunks.append(_syllable_burst(syllable_dur, freq, amp))
        if i < len(freqs) - 1:
            chunks.append(np.zeros(int(SR * pause_sec)))
    return np.concatenate(chunks)


def main() -> None:
    normal_path = OUT_DIR / "normal_response.wav"
    tired_path = OUT_DIR / "tired_response.wav"

    _write_wav(normal_path, synthesize_normal())
    _write_wav(tired_path, synthesize_tired())

    for web_dir in (WEB_DEMO_DIR,):
        web_dir.mkdir(parents=True, exist_ok=True)
        _write_wav(web_dir / "normal_response.wav", synthesize_normal())
        _write_wav(web_dir / "tired_response.wav", synthesize_tired())

    normal_f = extract_features(normal_path)
    tired_f = extract_features(tired_path)
    print("normal:", json.dumps(normal_f, indent=2))
    print("tired:", json.dumps(tired_f, indent=2))
    print(f"Wrote {normal_path}")
    print(f"Wrote {tired_path}")
    print(f"Wrote {WEB_DEMO_DIR}")


if __name__ == "__main__":
    main()
