"""Family summary via OpenRouter with template fallback."""

from __future__ import annotations

import os
import re
from typing import Optional

import httpx

MEDICAL_PATTERN = re.compile(
    r"діагноз|деменц|депрес|хвороб|лікуван|клінічн",
    re.IGNORECASE,
)

TEMPLATES = {
    "normal": (
        "Голос звучить як зазвичай. Сьогодні особливих приводів для тривоги немає."
    ),
    "check-in needed": (
        "Сьогодні голос звучить більш втомлено, ніж зазвичай. "
        "Можливо, варто подзвонити ввечері."
    ),
}


def template_summary(status: str, acoustic_delta: str) -> str:
    """Return non-LLM summary from status and acoustic explanation."""
    base = TEMPLATES.get(status, TEMPLATES["normal"])
    if status == "check-in needed" and acoustic_delta:
        return f"{base} {acoustic_delta}."
    return base


def generate_summary(
    status: str,
    acoustic_delta: str,
    transcript: Optional[str] = None,
    timeout_sec: float = 2.0,
) -> str:
    """Call OpenRouter or fall back to template summary."""
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        return template_summary(status, acoustic_delta)

    model = os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-haiku")
    base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    transcript_part = transcript or "транскрипт недоступний"
    user_content = (
        f"Транскрипт чек-іну: {transcript_part}\n"
        f"Акустичний статус: {status}\n"
        f"Пояснення: {acoustic_delta}\n"
        "Напиши 1–3 речення summary для сім'ї українською."
    )
    payload = {
        "model": model,
        "max_tokens": 150,
        "temperature": 0.3,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Ти пишеш коротке сімейне summary українською для дорослої дитини. "
                    "Не став діагнозів. Не використовуй медичні терміни. 1–3 речення."
                ),
            },
            {"role": "user", "content": user_content},
        ],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hearbeat-demo.local",
        "X-Title": "HearBeat Hackathon Demo",
    }
    try:
        with httpx.Client(timeout=timeout_sec) as client:
            resp = client.post(f"{base_url}/chat/completions", json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        text = data["choices"][0]["message"]["content"].strip()
        if MEDICAL_PATTERN.search(text):
            return template_summary(status, acoustic_delta)
        return text
    except Exception:
        return template_summary(status, acoustic_delta)
