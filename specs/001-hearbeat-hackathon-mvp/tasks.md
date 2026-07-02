---
description: "Task list for HearBeat Hackathon MVP implementation"
---

# Tasks: HearBeat Hackathon MVP

**Input**: Design documents from `specs/001-hearbeat-hackathon-mvp/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: ML unit tests included (pytest for scoring); no full TDD for web.

**Organization**: Tasks grouped by user story; foundational phase blocks all stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US5 maps to spec.md user stories

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize `HearBeat/` monorepo layout and environment templates

- [x] T001 Create `HearBeat/` directory tree per plan.md (`web/`, `ml/`, `data/`)
- [x] T002 [P] Add `HearBeat/README.md` with setup pointers to quickstart.md
- [x] T003 [P] Scaffold `HearBeat/web/` with Vite + React + TypeScript (`package.json`, `vite.config.ts`)
- [x] T004 [P] Scaffold `HearBeat/ml/` with `pyproject.toml` (FastAPI, librosa, httpx, pydantic)
- [x] T005 [P] Add `HearBeat/web/.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ML_API_URL`)
- [x] T006 [P] Add `HearBeat/ml/.env.example` (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Supabase schema, shared types, seed data — MUST complete before user stories

**⚠️ CRITICAL**: No user story work until this phase is done

- [x] T007 Create `HearBeat/data/sql/001_schema.sql` with `profiles` + `checkins` tables per data-model.md
- [x] T008 Create `HearBeat/data/sql/002_rls_policies.sql` for anon read/insert on `demo-maria`
- [x] T009 [P] Create `HearBeat/web/src/types/checkin.ts` matching data-model.md fields
- [x] T010 [P] Create `HearBeat/web/src/lib/supabase.ts` Supabase client factory
- [x] T011 [P] Create `HearBeat/data/scripts/seed_supabase.py` to insert profile + 27 seed check-ins
- [x] T012 Create `HearBeat/data/scripts/generate_tts.py` for synthetic WAV (ElevenLabs or system TTS)
- [ ] T013 Run seed script to populate Supabase with 21+ days of trend data (US4 baseline) — **manual**: needs `ml/.env`; mock data at `web/public/mock-checkins.json` works with `VITE_USE_MOCK=true`
- [x] T014 [P] Create `HearBeat/data/seed/fallback_analysis.json` per contracts/supabase-checkins.md
- [x] T015 [P] Add `HearBeat/data/audio/demo/normal_response.wav` and `tired_response.wav` placeholders
- [ ] T016 Configure Supabase Storage bucket `audio` with public read for demo paths — **manual**: Supabase dashboard + SQL in `002_rls_policies.sql`

**Checkpoint**: Dashboard can query seeded `checkins`; demo audio files exist

---

## Phase 3: User Story 3 — Acoustic Baseline Comparison (Priority: P1)

**Goal**: librosa pipeline returns vitality_score, status, acoustic_delta from audio

**Independent Test**: `curl POST /analyze` with tired WAV → `check-in needed`; normal WAV → `normal`

### Implementation for User Story 3

- [x] T017 [P] [US3] Implement `HearBeat/ml/hearbeat_ml/features.py` — tempo, pauses, pitch_std, energy_rms
- [x] T018 [P] [US3] Implement `HearBeat/ml/hearbeat_ml/baseline.py` — aggregate baseline from Supabase or inline JSON
- [x] T019 [US3] Implement `HearBeat/ml/hearbeat_ml/scoring.py` — vitality_score, status, acoustic_delta (Ukrainian text)
- [x] T020 [US3] Implement `HearBeat/ml/hearbeat_ml/api.py` — FastAPI `GET /health`, `POST /analyze` per contracts/ml-analyze-api.yaml
- [x] T021 [P] [US3] Add `HearBeat/ml/tests/test_scoring.py` — assert tired sample scores lower than normal
- [x] T022 [US3] Wire `/analyze` to fetch baseline from Supabase for `profile_id=demo-maria`
- [x] T023 [US3] Add CLI entry `python -m hearbeat_ml.features --audio <path>` for local debugging
- [x] T024 [US3] Validate both demo states: tired WAV → `check-in needed`, normal WAV → `normal` (SC-002)

**Checkpoint**: ML API runs locally; contract smoke test in quickstart.md passes

---

## Phase 4: User Story 2 — Family Dashboard (Priority: P1)

**Goal**: `/dashboard` shows status, trend chart, summary, acoustic explanation, call CTA

**Independent Test**: Open `/dashboard` with seed data only — understand status in <30s without new check-in

### Implementation for User Story 2

- [x] T025 [P] [US2] Create `HearBeat/web/src/components/StatusBadge.tsx` — green «Звучить як зазвичай» / yellow «Варто подзвонити»
- [x] T026 [P] [US2] Create `HearBeat/web/src/components/VitalityChart.tsx` — line chart from checkins history (Recharts)
- [x] T027 [P] [US2] Create `HearBeat/web/src/components/CheckInHistory.tsx` — recent check-ins list
- [x] T028 [US2] Create `HearBeat/web/src/pages/DashboardPage.tsx` — compose status, chart, summary, acoustic_delta
- [x] T029 [US2] Add medical disclaimer footer on `DashboardPage.tsx` per constitution I
- [x] T030 [US2] Add «Подзвонити» `tel:` CTA button on dashboard
- [x] T031 [US2] Register route `/dashboard` in `HearBeat/web/src/App.tsx`
- [x] T032 [US2] Query Supabase for latest check-in + 30-day trend aggregation per contracts/supabase-checkins.md

**Checkpoint**: Dashboard renders seeded history; trend spans ≥14 days (SC-004)

---

## Phase 5: User Story 1 — Voice Check-In (Priority: P1)

**Goal**: `/check-in` emulated call → 3 voice questions → upload → analyze → thank you

**Independent Test**: Complete check-in (live or demo audio) → dashboard updates after refresh

### Implementation for User Story 1

- [x] T033 [P] [US1] Create `HearBeat/web/src/components/IncomingCall.tsx` — «Відповісти» / «Відхилити» UI
- [x] T034 [P] [US1] Create `HearBeat/web/src/components/ConsentBanner.tsx` — transparency copy per FR-014
- [x] T035 [P] [US1] Create `HearBeat/web/src/components/VoiceQuestion.tsx` — record button + 15–20s timer
- [x] T036 [US1] Create `HearBeat/web/src/lib/audioRecorder.ts` — Web Audio API record/stop → Blob
- [x] T037 [US1] Create `HearBeat/web/src/lib/checkinFlow.ts` — upload audio → insert checkin → call ML API → PATCH results
- [x] T038 [US1] Create `HearBeat/web/src/pages/CheckInPage.tsx` — 3 questions flow + thank-you screen
- [x] T039 [US1] Add «Використати демо-відповідь» fallback loading `HearBeat/data/audio/demo/*.wav`
- [x] T040 [US1] Register route `/check-in` in `HearBeat/web/src/App.tsx`
- [x] T041 [US1] Wire ML API failure to `fallback_analysis.json` per constitution VIII in `checkinFlow.ts`
- [x] T042 [US1] Handle silent/short recording — retry UI, no misleading dashboard update

**Checkpoint**: Golden path Scenario A in quickstart.md passes end-to-end

---

## Phase 6: User Story 4 — Credible Demo History (Priority: P2)

**Goal**: First-time visitors see believable 20–50 check-ins without performing live check-in

**Independent Test**: Fresh browser on `/dashboard` — populated trend before any new check-in

### Implementation for User Story 4

- [x] T043 [US4] Tune `HearBeat/data/scripts/seed_supabase.py` — 12 baseline + 6 normal + 6 tired + 3 edge rows
- [x] T044 [US4] Spread `created_at` across 21 days with realistic vitality_score distribution in seed data
- [x] T045 [US4] Verify seed contains zero real PII — synthetic names/transcripts only in `HearBeat/data/seed/checkins_seed.json`

**Checkpoint**: SC-004 satisfied on first dashboard load

---

## Phase 7: User Story 5 — Conversational Summary via OpenRouter (Priority: P3)

**Goal**: Optional Ukrainian family summary via OpenRouter; template fallback on failure

**Independent Test**: After tired check-in, dashboard shows 1–3 sentence summary without medical terms

### Implementation for User Story 5

- [x] T046 [P] [US5] Implement `HearBeat/ml/hearbeat_ml/summary.py` per contracts/openrouter-summary.md
- [x] T047 [US5] Integrate OpenRouter call into `HearBeat/ml/hearbeat_ml/api.py` `/analyze` response (2s timeout)
- [x] T048 [US5] Add template fallback in `summary.py` when `OPENROUTER_API_KEY` missing or API errors
- [x] T049 [P] [US5] Add prompt guardrails — reject/regenerate if output contains diagnostic language
- [x] T050 [US5] Display `summary_for_family` on `HearBeat/web/src/pages/DashboardPage.tsx` latest card

**Checkpoint**: Summary visible; acoustic demo still works with OpenRouter disabled

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Deploy, validate, hackathon readiness

- [x] T051 [P] Add Lovable export sync notes to `HearBeat/README.md` (optional UI polish path)
- [ ] T052 Deploy ML API to Railway/Render; set `VITE_ML_API_URL` in web env — **manual** (your hosting)
- [ ] T053 Deploy web to Lovable publish or Vercel; verify public link on mobile — **manual**
- [x] T054 Run full quickstart.md checklist (Scenarios A–E) and fix blockers — build + pytest pass; E2E needs local run
- [x] T055 [P] Add `.gitignore` entries for `HearBeat/ml/.env`, `HearBeat/web/.env`, large `HearBeat/data/audio/`

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 Setup
    ↓
Phase 2 Foundational (BLOCKS ALL)
    ↓
Phase 3 US3 Acoustic ──┐
    ↓                    │
Phase 4 US2 Dashboard ←──┤ (dashboard can use seed before live ML)
    ↓                    │
Phase 5 US1 Check-in ────┘ (needs ML API from US3)
    ↓
Phase 6 US4 Seed polish (can overlap with Phase 4 if seed done in Phase 2)
    ↓
Phase 7 US5 OpenRouter (needs US3 analyze hook)
    ↓
Phase 8 Polish
```

### User Story Dependencies

| Story | Depends on | Independent test |
|-------|------------|------------------|
| US3 Acoustic | Phase 2 | curl /analyze with WAV files |
| US2 Dashboard | Phase 2 (+ seed) | Dashboard with seed only |
| US1 Check-in | US3 + Phase 2 | Full check-in flow |
| US4 Demo history | Phase 2 seed | Dashboard before live check-in |
| US5 Summary | US3 | Summary on dashboard after analyze |

### Parallel Opportunities

**After Phase 2 completes, team can split:**

| Developer | Track | Tasks |
|-----------|-------|-------|
| ML Engineer | US3 + US5 | T017–T024, T046–T050 |
| Web Developer | US2 + US1 | T025–T032, T033–T042 |
| Data / Full-stack | US4 + seed | T011–T013, T043–T045 |

**Parallel batches:**

```text
# Batch A (after T016):
T017, T018, T025, T026, T027, T033, T034, T035

# Batch B (after T019):
T020, T028, T036, T046

# Batch C (integration):
T037, T041, T047, T050
```

---

## Implementation Strategy

### MVP First (minimum judge demo)

1. Phase 1 + Phase 2 → seeded Supabase
2. Phase 3 US3 → ML API with two demo states
3. Phase 4 US2 → dashboard reads seed
4. Phase 5 US1 → live check-in updates dashboard
5. **STOP** — run quickstart Scenario A + B

### Incremental delivery

| Milestone | Stories | Demo value |
|-----------|---------|------------|
| M1 | US4 + US2 | «Look at the trend» (static) |
| M2 | + US3 | «AI analyzes voice» (API demo) |
| M3 | + US1 | Full golden path |
| M4 | + US5 | Natural language summary via OpenRouter |

### Suggested commit boundaries

- After T016: `feat(hearbeat): supabase schema and seed`
- After T024: `feat(hearbeat): ml analyze api`
- After T032: `feat(hearbeat): family dashboard`
- After T042: `feat(hearbeat): voice check-in flow`
- After T050: `feat(hearbeat): openrouter family summary`

---

## Notes

- OpenRouter token: server-side only in `HearBeat/ml/.env` — see [contracts/openrouter-summary.md](./contracts/openrouter-summary.md)
- Acoustic core stays librosa; OpenRouter is summary layer only (constitution I)
- Lovable can replace T003 UI components — keep `checkinFlow.ts` and Supabase wiring in repo
- 55 tasks total; MVP scope ≈ T001–T042 (42 tasks)
