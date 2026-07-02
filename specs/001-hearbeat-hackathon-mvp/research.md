# Research: HearBeat Hackathon MVP

**Feature**: `001-hearbeat-hackathon-mvp`  
**Date**: 2026-07-02

## R1: Frontend builder vs hand-coded React

**Decision**: Start with **Lovable** for rapid UI; export/sync into `HearBeat/web/`
for ML integration and version control.

**Rationale**: Hackathon guide allocates builder credits to UI assembly only;
check-in and dashboard are well-specified in project guide §4.2. Lovable natively
supports Supabase.

**Alternatives considered**:

| Option | Rejected because |
|--------|------------------|
| Pure Vite scaffold from scratch | Slower to reach polished demo UI in 48h |
| Next.js full-stack | Overkill without auth/SSR needs |
| Single HTML page | Harder to maintain two-screen flow + chart |

## R2: Database and file storage

**Decision**: **Supabase** (PostgreSQL + Storage) with a single `profiles` row and
`checkins` table per hackathon guide §3.

**Rationale**: Lovable integration, real-time optional, public anon access pattern
documented for hackathons. Schema already defined in project artifacts.

**Alternatives considered**:

| Option | Rejected because |
|--------|------------------|
| Firebase | Team prompts target Supabase; schema already drafted |
| Local JSON files only | Weak demo story for «live» check-in updating dashboard |
| Airtable | Less natural for audio URLs and JSON features |

## R3: Acoustic analysis library

**Decision**: **librosa** for tempo, pause detection, pitch variability, RMS energy.

**Rationale**: Explicitly named in product docs; sufficient for personal baseline
*relative* comparison without clinical claims. Team has ML engineer.

**Alternatives considered**:

| Option | Rejected because |
|--------|------------------|
| openSMILE only | Steeper setup; librosa enough for MVP deltas |
| LLM-on-transcript only | Violates AI-first acoustic thesis (constitution I) |
| Commercial voice API | Cost + latency + less explainable features for pitch |

## R4: ML service shape

**Decision**: **FastAPI** microservice with `POST /analyze` accepting multipart
audio or `audio_url`; returns analysis JSON matching `checkins` analysis fields.

**Rationale**: Decouples Python env from frontend; can run locally during dev and
deploy to free tier for demo day. CLI module (`python -m hearbeat_ml`) shares
same scoring code for seed script.

**Alternatives considered**:

| Option | Rejected because |
|--------|------------------|
| In-browser ML | impractical for librosa; weak hackathon ML story |
| Supabase Edge Function only | Python audio stack awkward in Deno |
| Batch-only CLI | Blocks live check-in demo path |

## R5: Baseline and scoring algorithm (MVP)

**Decision**:

- Baseline = mean of `features_json` from last **N=10** `scenario_label=baseline`
  check-ins (or first 10 chronologically if labels mixed).
- Compare new check-in features to baseline per dimension (tempo, pause_ms,
  pitch_std, energy).
- `vitality_score` = weighted 0–100 score (higher = closer to baseline «energetic»
  norm); hackathon thresholds tuned on synthetic data.
- `status` = `check-in needed` if any dimension exceeds **+25%** deviation from
  baseline OR composite score below **65**; else `normal`.
- `acoustic_delta` = Ukrainian plain-text template listing top 1–2 deviations.

**Rationale**: Explainable, demo-tunable, no medical calibration required.
Aligns with «tired day» synthetic data design.

**Alternatives considered**:

| Option | Rejected because |
|--------|------------------|
| Fixed global thresholds | Breaks personal baseline story |
| ML classifier | Overkill; hard to explain to judges in 48h |
| Z-score without floor | Unstable with <3 baseline samples |

## R6: Synthetic demo data

**Decision**: **ElevenLabs TTS** (primary) with system TTS fallback; generate
25–30 WAV files with scripted Ukrainian answers; vary speaking rate in generation
prompts for tired vs normal sets.

**Rationale**: Project guide §3; constitution VII (synthetic only).

**Alternatives considered**:

| Option | Rejected because |
|--------|------------------|
| Record team members | PII/consent risk; less controlled variation |
| Pure sine-wave fake audio | librosa features unrealistic |

## R7: Transcription and family summary (P3)

**Decision**: **[OpenRouter](https://openrouter.ai/)** as the demo AI gateway
(server-side only, `OPENROUTER_API_KEY`) for **text** tasks only:

1. **STT** (optional P3): `POST /api/v1/audio/transcriptions` with e.g.
   `openai/whisper-large-v3`, `language: "uk"` → `checkins.transcript`
2. **Summary** (P3): `POST /api/v1/chat/completions` with
   **`anthropic/claude-3.5-haiku`** (team preference) → `summary_for_family`

**Acoustic analysis is NOT via OpenRouter** — librosa runs locally (R3). OpenRouter
does not replace tempo/pause/baseline scoring.

**Template fallback** keyed by `scenario_label` if STT or summary API fails
(constitution VIII).

**Rationale**: Team already has an OpenRouter token for the hackathon demo — one
unified interface to 400+ models without separate Anthropic/OpenAI keys. Summary
remains P3; acoustic layer is P1.

**Alternatives considered**:

| Option | Rejected because |
|--------|------------------|
| Direct Claude API only | Team standardizes on existing OpenRouter token |
| Claude API required for MVP | Blocks demo if key or latency issues |
| No summary at all | Acceptable per FR-015 but weaker pitch |

**Security**: `OPENROUTER_API_KEY` MUST live in ML service env only — never
`VITE_*` frontend vars or git.

## R8: Auth and security (hackathon)

**Decision**: No login; Supabase **anon key** with RLS policies:

- `SELECT` all `checkins` for demo `profile_id`
- `INSERT` `checkins` only with fixed `profile_id`
- Storage upload to `audio/` with size limit

**Rationale**: Spec and guide explicitly exclude auth; public demo link required.

**Alternatives considered**:

| Option | Rejected because |
|--------|------------------|
| Magic link auth | Out of scope; slows judge flow |
| Open INSERT all rows | Abuse risk on public link |

## R9: Deployment targets

**Decision**:

- **Web**: Lovable publish URL or Vercel/Netlify from `HearBeat/web/`
- **ML API**: Railway or Render free tier (or localhost + ngrok for judging)
- **DB**: Supabase cloud free project

**Rationale**: Matches hackathon «time-to-public-link» north-star metric.

## Open items (non-blocking)

- Exact Ukrainian copy for consent screen — pull from `hackaton/hearbeat_project-guide.md` §4.2
- Final vitality threshold tuning — empirical on seed data during ML phase
- Whether Lovable or exported Vite is source of truth — decide at first UI commit
