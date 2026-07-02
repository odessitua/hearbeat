# Implementation Plan: HearBeat Hackathon MVP

**Branch**: `001-hearbeat-hackathon-mvp` | **Date**: 2026-07-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-hearbeat-hackathon-mvp/spec.md`

## Summary

Deliver a public web demo for Digital Future Hackathon: emulated incoming-call
voice check-in for an elderly parent, acoustic analysis against a personal
baseline, and a family dashboard with vitality trend and call recommendation.
Implementation lives under `HearBeat/` with a Lovable/React frontend, Supabase
persistence, and a Python ML service (librosa). Synthetic TTS data seeds the
dashboard; precomputed scores provide fallback if live ML integration slips.

## Technical Context

**Language/Version**: TypeScript (React 18+) for web; Python 3.11+ for ML service

**Primary Dependencies**:

- **Web**: React, Vite (or Lovable export), Supabase JS client, chart library
  (e.g. Recharts), Web Audio API for recording
- **ML**: FastAPI, librosa, numpy, pydantic; optional openSMILE later
- **Data seeding**: ElevenLabs TTS API (or system TTS), Python Faker
- **Optional LLM**: [OpenRouter](https://openrouter.ai/) (OpenAI-compatible API,
  team demo token) — family summary (P3); model selectable per request
- **Optional STT**: local Whisper or OpenRouter audio-capable model — transcript only

**Storage**: Supabase (PostgreSQL) — tables `profiles`, `checkins`; Supabase
Storage bucket `audio` for WAV/MP3 files

**Testing**: pytest for ML pipeline unit tests; manual E2E via quickstart.md
scenarios; no full CI requirement for hackathon

**Target Platform**: Modern browsers (Chrome/Edge/Safari mobile); ML API on
localhost or Railway/Render free tier for demo

**Project Type**: Web application (split frontend + ML API + managed DB)

**Performance Goals**:

- Check-in flow completable in under 3 minutes
- ML analysis response under 10 seconds for a 60-second WAV (hackathon target)
- Dashboard initial load under 3 seconds on 4G

**Constraints**:

- No auth; public anon Supabase key with RLS allowing insert/select on demo
  profile only
- Ukrainian UI copy only
- Synthetic data only in repo and public demo
- Two reproducible demo states via `scenario_label` or dedicated demo audio
- Fallback path must preserve identical JSON contract (constitution VIII)

**Scale/Scope**: 1 elderly profile, 1 family viewer, 20–50 seeded check-ins,
2 screens (`/check-in`, `/dashboard`), 48-hour hackathon delivery

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Design | Post-Design | Notes |
|-----------|------------|-------------|-------|
| I. AI-First, Not Medical | ✅ Pass | ✅ Pass | ML outputs vitality + plain deltas only; UI disclaimer |
| II. Simplicity for Elderly | ✅ Pass | ✅ Pass | Large-type check-in, one primary action per step |
| III. Family-Centric Dashboard | ✅ Pass | ✅ Pass | Dashboard is separate route, status-first layout |
| IV. Hackathon Scope Lock | ✅ Pass | ✅ Pass | Web emulation only; telephony in backlog |
| V. Demo Sufficiency | ✅ Pass | ✅ Pass | quickstart.md defines judge E2E path |
| VI. Two Demo States | ✅ Pass | ✅ Pass | `normal_day` / `tired_day` scenario labels + seed data |
| VII. Synthetic Data Only | ✅ Pass | ✅ Pass | TTS seed script; no real PII in `HearBeat/data/` |
| VIII. Fallback Without Lying | ✅ Pass | ✅ Pass | Same `checkins` schema for live vs precomputed |

**Gate result**: PASS — no constitution violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-hearbeat-hackathon-mvp/
├── plan.md              # This file
├── research.md          # Technology decisions
├── data-model.md        # Entities and Supabase schema
├── quickstart.md        # E2E validation scenarios
├── contracts/           # API and integration contracts
│   ├── ml-analyze-api.yaml
│   ├── openrouter-summary.md
│   └── supabase-checkins.md
└── tasks.md             # Created by /speckit-tasks (next step)
```

### Source Code (repository root)

```text
HearBeat/
├── README.md
├── web/                         # React app (Lovable export or Vite scaffold)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── CheckInPage.tsx      # /check-in — emulated call
│   │   │   └── DashboardPage.tsx    # /dashboard — family view
│   │   ├── components/
│   │   │   ├── IncomingCall.tsx
│   │   │   ├── VoiceQuestion.tsx
│   │   │   ├── VitalityChart.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   └── audioRecorder.ts
│   │   └── types/
│   │       └── checkin.ts
│   └── package.json
├── ml/                          # Python acoustic pipeline
│   ├── pyproject.toml
│   ├── hearbeat_ml/
│   │   ├── __init__.py
│   │   ├── features.py          # librosa feature extraction
│   │   ├── baseline.py          # baseline aggregation + comparison
│   │   ├── scoring.py           # vitality_score + status + delta text
│   │   └── api.py               # FastAPI POST /analyze
│   └── tests/
│       └── test_scoring.py
└── data/                        # Synthetic assets (not real PII)
    ├── seed/
    │   └── checkins_seed.json   # Pre-loaded dashboard history
    ├── audio/                   # TTS-generated WAV files (gitignored if large)
    └── scripts/
        ├── generate_tts.py      # ElevenLabs / fallback TTS
        └── seed_supabase.py     # Upload audio + insert rows
```

`hearbeat_ml/summary.py` calls [OpenRouter](https://openrouter.ai/) for P3 family
summary (see `contracts/openrouter-summary.md`).

**Structure Decision**: Three-folder split under `HearBeat/` matches constitution
and hackathon team roles (web / ML / data). Frontend talks to Supabase directly
for reads and inserts metadata; after upload, frontend calls ML API with
`audio_url` or file bytes, then writes analysis fields back to `checkins`.
Alternative: ML API writes to Supabase — acceptable if faster to wire; contract
in `contracts/ml-analyze-api.yaml` stays the analysis output shape either way.

## Architecture

```text
┌─────────────────┐     record/upload      ┌──────────────────┐
│  /check-in      │ ─────────────────────► │ Supabase Storage │
│  (React)        │                        │  bucket: audio   │
└────────┬────────┘                        └────────┬─────────┘
         │ insert row (pending)                     │
         ▼                                          │ audio_url
┌─────────────────┐     POST /analyze      ┌───────▼──────────┐
│  Supabase DB    │ ◄───────────────────── │  ML API (FastAPI) │
│  checkins       │   vitality, status,    │  librosa pipeline │
└────────┬────────┘   features_json        └──────────────────┘
         │
         │ select history + latest
         ▼
┌─────────────────┐
│  /dashboard     │
│  (React)        │
└─────────────────┘
```

### Integration order (hackathon critical path)

1. Supabase schema + seed data → dashboard shows trend (even static)
2. ML CLI scoring on local WAV → validate two demo states
3. FastAPI `/analyze` → wire check-in completion
4. Web Audio recording + demo-audio fallback on check-in page
5. Optional: transcript + OpenRouter LLM summary (P3); template fallback if API down

### Fallback matrix

| Failure | Plan B | User-visible behavior |
|---------|--------|------------------------|
| Web Audio blocked | «Використати демо-відповідь» button | Same 3-question flow with TTS file |
| ML API down | `seed/checkins_precomputed.json` lookup by `scenario_label` | Dashboard still updates after refresh |
| Supabase insert slow | Optimistic UI + poll/refresh | Judge sees end state within 5s |
| OpenRouter / LLM summary unavailable | Template from `scenario_label` + transcript | Acoustic status unaffected |

## Complexity Tracking

> No violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
