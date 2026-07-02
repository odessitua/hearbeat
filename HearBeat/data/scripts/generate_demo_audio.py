#!/usr/bin/env python3
"""Generate synthetic demo WAV files with distinct acoustic profiles."""

from __future__ import annotations

import wave
from pathlib import Path

import numpy as np

OUT_DIR = Path(__file__).resolve().parents[1] / "audio" / "demo"
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


def _syllable_burst(start: float, duration: float, freq: float, amp: float) -> np.ndarray:
    t = np.linspace(0, duration, int(SR * duration), endpoint=False)
    env = np.sin(np.pi * t / duration) ** 2
    return amp * env * np.sin(2 * np.pi * freq * t)


def synthesize_voice(tempo_factor: float, pause_sec: float, energy: float) -> np.ndarray:
    """Build speech-like bursts with controllable tempo and pauses."""
    chunks: list[np.ndarray] = []
    base_gap = pause_sec / tempo_factor
    freqs = [180, 220, 200, 240, 190]
    for i, freq in enumerate(freqs):
        dur = 0.35 / tempo_factor
        chunks.append(_syllable_burst(0, dur, freq, energy))
        if i < len(freqs) - 1:
            chunks.append(np.zeros(int(SR * base_gap)))
    return np.concatenate(chunks)


def main() -> None:
    normal = synthesize_voice(tempo_factor=1.2, pause_sec=0.12, energy=0.35)
    tired = synthesize_voice(tempo_factor=0.75, pause_sec=0.45, energy=0.18)
    _write_wav(OUT_DIR / "normal_response.wav", normal)
    _write_wav(OUT_DIR / "tired_response.wav", tired)
    print(f"Wrote {OUT_DIR / 'normal_response.wav'}")
    print(f"Wrote {OUT_DIR / 'tired_response.wav'}")


if __name__ == "__main__":
    main()
