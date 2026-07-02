#!/usr/bin/env python3
"""Seed Supabase with HearBeat demo profile and check-ins."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / "ml" / ".env")

try:
    from supabase import create_client
except ImportError:
    print("pip install supabase python-dotenv", file=sys.stderr)
    sys.exit(1)

SEED_FILE = ROOT / "data" / "seed" / "checkins_seed.json"
PROFILE = {
    "id": "demo-maria",
    "display_name": "Марія",
    "language": "uk",
    "baseline_window": 10,
    "created_at": "2026-06-01T10:00:00Z",
}


def main() -> None:
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_KEY in ml/.env", file=sys.stderr)
        sys.exit(1)
    if not SEED_FILE.exists():
        print("Run build_seed_json.py first", file=sys.stderr)
        sys.exit(1)

    rows = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    client = create_client(url, key)
    client.table("profiles").upsert(PROFILE).execute()
    for row in rows:
        client.table("checkins").upsert(row).execute()
    print(f"Seeded profile and {len(rows)} check-ins")


if __name__ == "__main__":
    main()
