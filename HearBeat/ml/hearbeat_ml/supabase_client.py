"""Supabase helpers for baseline fetch."""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from supabase import Client, create_client


def get_supabase_client() -> Optional[Client]:
    """Return Supabase client if URL and service key are configured."""
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
    if not url or not key:
        return None
    return create_client(url, key)


def fetch_baseline_rows(profile_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Load baseline scenario check-ins for profile."""
    client = get_supabase_client()
    if client is None:
        return []
    result = (
        client.table("checkins")
        .select("features_json")
        .eq("profile_id", profile_id)
        .eq("scenario_label", "baseline")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return list(result.data or [])
