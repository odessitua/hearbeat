# OpenRouter Contract: HearBeat STT + Summary (P3)

**Feature**: `001-hearbeat-hackathon-mvp`  
**Provider**: [OpenRouter](https://openrouter.ai/) — unified API for STT and LLM  
**Consumer**: `HearBeat/ml/hearbeat_ml/transcribe.py`, `summary.py` (server-side only)

> **Not covered here:** acoustic features (tempo, pauses, pitch, energy) — those
> come from **librosa** in `features.py`, not from OpenRouter.

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | yes (for LLM path) | Team demo token from OpenRouter dashboard |
| `OPENROUTER_MODEL` | no | Default **`anthropic/claude-3.5-haiku`** (summary) |
| `OPENROUTER_STT_MODEL` | no | Default `openai/whisper-large-v3` |
| `OPENROUTER_BASE_URL` | no | Default `https://openrouter.ai/api/v1` |

**Never** commit the key. Use `HearBeat/ml/.env` (gitignored) or deployment secrets.

## Pipeline position

```text
audio.wav
  ├─ librosa (local)     → features_json, vitality_score, status, acoustic_delta  [P1]
  ├─ OpenRouter STT      → transcript                                         [P3]
  └─ OpenRouter chat     → summary_for_family (claude-3.5-haiku)              [P3]
```

---

## 1. Speech-to-Text (transcription)

Dedicated endpoint: [OpenRouter STT docs](https://openrouter.ai/docs/guides/overview/multimodal/stt)

```http
POST https://openrouter.ai/api/v1/audio/transcriptions
Authorization: Bearer $OPENROUTER_API_KEY
Content-Type: application/json
```

```json
{
  "model": "openai/whisper-large-v3",
  "language": "uk",
  "input_audio": {
    "data": "<BASE64_RAW_BYTES>",
    "format": "wav"
  }
}
```

Response: JSON with transcribed text → store in `checkins.transcript`.

**Fallback**: for seeded demo rows, use pre-written Ukrainian `transcript` in
`checkins_seed.json` (no API call). For live check-in without STT, summary can
use acoustic_delta text only.

**Alternative (offline dev)**: local `faster-whisper` in `HearBeat/ml/` — same
output field, no OpenRouter credits burned during iteration.

---

## 2. Family summary (chat completions)

## Endpoint

```http
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer $OPENROUTER_API_KEY
Content-Type: application/json
HTTP-Referer: https://hearbeat-demo.example
X-Title: HearBeat Hackathon Demo
```

## Request body (summary generation)

```json
{
  "model": "anthropic/claude-3.5-haiku",
  "max_tokens": 150,
  "temperature": 0.3,
  "messages": [
    {
      "role": "system",
      "content": "Ти пишеш коротке сімейне summary українською для дорослої дитини. Не став діагнозів. Не використовуй медичні терміни. 1–3 речення."
    },
    {
      "role": "user",
      "content": "Транскрипт чек-іну: ...\nАкустичний статус: check-in needed\nПояснення: темп нижчий на 24%, паузи довші на 42%\nНапиши summary для сім'ї."
    }
  ]
}
```

## Response usage

Extract `choices[0].message.content` → store in `checkins.summary_for_family`.

## Integration point

Called from `POST /analyze` after scoring (optional step) OR separate
`POST /summarize` if analyze must stay fast. Prefer inline in `/analyze` with
2s timeout; on timeout use template fallback.

## Template fallback (constitution VIII)

If OpenRouter returns error, timeout, or empty content:

```python
TEMPLATES = {
    "normal": "Голос звучить як зазвичай. Сьогодні особливих приводів для тривоги немає.",
    "check-in needed": "Сьогодні голос звучить більш втомлено, ніж зазвичай. Можливо, варто подзвонити ввечері.",
}
```

## Model selection guidance

| Use case | Suggested OpenRouter model | Notes |
|----------|---------------------------|-------|
| Summary (default) | **`anthropic/claude-3.5-haiku`** | Team preference |
| STT (Ukrainian) | `openai/whisper-large-v3` | Pass `language: "uk"` |
| STT (faster/cheaper) | `openai/gpt-4o-mini-transcribe` | Check OpenRouter model page |
| Demo TTS (optional) | `/audio/speech` e.g. OpenAI TTS | Alternative to ElevenLabs |

Browse modalities at [openrouter.ai/models](https://openrouter.ai/models) (filter
by audio input / transcription).

## Out of scope for OpenRouter

- **Acoustic baseline analysis** (tempo, pauses, vitality_score) — librosa only
- Medical interpretation prompts
- Frontend direct calls (key exposure risk)

## What OpenRouter does NOT replace

| Task | Tool | Why |
|------|------|-----|
| Tempo, pauses, pitch, energy | **librosa** (Python) | AI-core of HearBeat; explainable metrics |
| Baseline comparison | **scoring.py** | Personal trend, not LLM opinion |
| Vitality score / status | **scoring.py** | Constitution I — not medical LLM claims |
