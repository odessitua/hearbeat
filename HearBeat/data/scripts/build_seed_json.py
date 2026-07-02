#!/usr/bin/env python3
"""Build checkins_seed.json with 27 synthetic rows over 21 days."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "seed" / "checkins_seed.json"
PROFILE_ID = "demo-maria"
BASE = datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc)


def _row(
    day_offset: int,
    hour: int,
    scenario: str,
    vitality: float,
    status: str,
    delta: str,
    summary: str,
    features: dict[str, float],
) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "profile_id": PROFILE_ID,
        "audio_url": f"https://demo.hearbeat.local/audio/{scenario}_{day_offset}.wav",
        "created_at": (BASE + timedelta(days=day_offset, hours=hour)).isoformat(),
        "scenario_label": scenario,
        "transcript": "День нормальний, була вдома." if status == "normal" else "Трохи втомилась сьогодні.",
        "features_json": features,
        "vitality_score": vitality,
        "status": status,
        "acoustic_delta": delta,
        "summary_for_family": summary,
    }


def main() -> None:
    rows: list[dict] = []
    normal_features = {
        "tempo_bpm": 115.0,
        "pause_mean_ms": 400.0,
        "pitch_std_hz": 30.0,
        "energy_rms": 0.045,
        "duration_sec": 16.0,
    }
    tired_features = {
        "tempo_bpm": 88.0,
        "pause_mean_ms": 620.0,
        "pitch_std_hz": 21.0,
        "energy_rms": 0.028,
        "duration_sec": 19.0,
    }

    for i in range(12):
        rows.append(
            _row(
                i % 21,
                9 + (i % 5),
                "baseline",
                78.0 + (i % 5),
                "normal",
                "Голос звучить як зазвичай",
                "Марія звучить спокійно, як завжди.",
                normal_features,
            )
        )
    for i in range(6):
        rows.append(
            _row(
                10 + i,
                10,
                "normal_day",
                82.0 + i,
                "normal",
                "Голос звучить як зазвичай",
                "Усе на звичному рівні.",
                normal_features,
            )
        )
    for i in range(6):
        rows.append(
            _row(
                14 + i,
                11,
                "tired_day",
                55.0 + i,
                "check-in needed",
                "Темп нижчий на 28%, паузи довші на 42%",
                "Сьогодні голос звучить втомленіше. Можливо, варто подзвонити.",
                tired_features,
            )
        )
    for i in range(2):
        rows.append(
            _row(
                18 + i,
                14,
                "edge_case",
                70.0,
                "normal",
                "Короткий запис оброблено",
                "Коротка відповідь без тривоги.",
                normal_features,
            )
        )
    # Latest row for dashboard demo: tired day (newest check-in)
    rows.append(
        _row(
            22,
            18,
            "tired_day",
            55.0,
            "check-in needed",
            "Темп нижчий на 28%, паузи довші на 42%",
            "Сьогодні голос звучить втомленіше. Можливо, варто подзвонити.",
            tired_features,
        )
    )

    rows.sort(key=lambda r: r["created_at"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(rows)} rows to {OUT}")


if __name__ == "__main__":
    main()
