# Quickstart: HearBeat Hackathon MVP Validation

**Feature**: `001-hearbeat-hackathon-mvp`  
**Purpose**: Prove end-to-end demo readiness for judges (SC-001)

## Prerequisites

- Node.js 18+ and npm (for `HearBeat/web`)
- Python 3.11+ with uv or pip (for `HearBeat/ml`)
- Supabase project created; env vars configured (see [contracts/supabase-checkins.md](./contracts/supabase-checkins.md))
- Optional: ElevenLabs API key for TTS seed script

## Setup (one-time)

```powershell
# From repo root
cd HearBeat/ml
uv sync   # or: pip install -e ".[dev]"

cd ../web
npm install

cd ../data/scripts
# Configure SUPABASE_URL + SUPABASE_SERVICE_KEY
python seed_supabase.py
```

## Run locally

**Terminal 1 — ML API**

```powershell
cd HearBeat/ml
uvicorn hearbeat_ml.api:app --reload --port 8000
```

**Terminal 2 — Web**

```powershell
cd HearBeat/web
npm run dev
```

Open:

- Check-in: `http://localhost:5173/check-in`
- Dashboard: `http://localhost:5173/dashboard`

## Validation scenarios

### Scenario A — Judge golden path (SC-001)

**Goal**: Full demo under 5 minutes without developer help.

1. Open `/dashboard` in a fresh browser — verify trend chart shows ≥14 days of data
   and latest status is visible.
2. Open `/check-in` — tap «Відповісти» on emulated incoming call.
3. Read consent copy — confirm no medical/diagnostic language.
4. Answer 3 voice questions (or use «Використати демо-відповідь» with tired sample).
5. See thank-you confirmation.
6. Switch to `/dashboard` (refresh if needed).
7. Verify status changed to «Варто подзвонити» (yellow) with `acoustic_delta` text.
8. Confirm summary sentence is present (template acceptable).

**Pass**: Steps complete; user understands why calling is recommended.

### Scenario B — Normal day state (SC-002, constitution VI)

1. On `/check-in`, use demo audio `normal_response.wav` (or live upbeat speech).
2. Complete all 3 questions.
3. On dashboard, status = «Звучить як зазвичай» (green), vitality ≥ 70.

**Pass**: Contrasts clearly with Scenario A.

### Scenario C — ML API offline fallback (constitution VIII)

1. Stop ML API (`Ctrl+C` on Terminal 1).
2. Repeat check-in with demo tired audio.
3. Verify check-in still completes and dashboard updates via precomputed fallback.

**Pass**: Same UI flow; analysis fields populated; no crash.

### Scenario D — Edge: silent recording

1. On `/check-in`, submit <1s silent audio.
2. Expect friendly retry message OR offer demo sample — no bogus `normal` score.

**Pass**: Dashboard not updated with misleading high vitality.

### Scenario E — Public link (hackathon)

1. Deploy web (Lovable publish or Vercel) and ML API (Railway).
2. Open check-in URL on a second device (phone) without login.
3. Complete Scenario A using mobile browser.

**Pass**: Works without localhost; SC-001 on mobile acceptable.

## ML-only smoke test (no web)

```powershell
cd HearBeat/ml
python -m hearbeat_ml.features --audio ../data/audio/demo/tired_response.wav
python -m pytest tests/ -q
```

Expected: feature JSON printed; tests pass; tired sample scores lower than normal.

## API contract smoke test

```powershell
curl -X POST http://localhost:8000/analyze `
  -F "profile_id=demo-maria" `
  -F "audio_file=@HearBeat/data/audio/demo/tired_response.wav" `
  -F "scenario_label=live"
```

Expected JSON fields per [contracts/ml-analyze-api.yaml](./contracts/ml-analyze-api.yaml):
`features_json`, `vitality_score`, `status`, `acoustic_delta`.

## Pre-pitch checklist

- [ ] Both demo states reproducible (A + B)
- [ ] Dashboard disclaimer visible: «HearBeat не ставить діагнози»
- [ ] No real PII in Supabase or repo
- [ ] Public URL shared in pitch deck
- [ ] Fallback tested once (Scenario C)

## Next step

Run `/speckit-tasks` to generate implementation task list from this plan.
