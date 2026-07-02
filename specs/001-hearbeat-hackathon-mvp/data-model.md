# Data Model: HearBeat Hackathon MVP

**Feature**: `001-hearbeat-hackathon-mvp`  
**Date**: 2026-07-02  
**Storage**: Supabase PostgreSQL + Storage

## Entity Relationship

```text
profiles (1) ──────< checkins (many)
```

Hackathon demo uses exactly **one** profile row (`demo-maria`).

## profiles

Represents the elderly parent being monitored.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | `text` (PK) | yes | Demo: `demo-maria` |
| `display_name` | `text` | yes | e.g. «Марія» |
| `language` | `text` | yes | Default `uk` |
| `baseline_window` | `int` | yes | Number of check-ins for baseline (default `10`) |
| `created_at` | `timestamptz` | yes | Profile creation time |

### Validation

- `id` immutable after seed
- `language` = `uk` for hackathon
- `baseline_window` between 5 and 20

## checkins

One voice check-in session with analysis results.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | `uuid` (PK) | yes | `gen_random_uuid()` |
| `profile_id` | `text` (FK) | yes | References `profiles.id` |
| `audio_url` | `text` | yes | Supabase Storage public/signed URL |
| `created_at` | `timestamptz` | yes | Check-in timestamp (spread for trend) |
| `scenario_label` | `text` | yes | See enum below |
| `transcript` | `text` | no | STT or scripted synthetic text |
| `features_json` | `jsonb` | no* | Acoustic features (*required after analysis) |
| `vitality_score` | `numeric(5,2)` | no* | 0–100 (*required after analysis) |
| `status` | `text` | no* | `normal` \| `check-in needed` |
| `acoustic_delta` | `text` | no | Human explanation of deviation |
| `summary_for_family` | `text` | no | 1–3 sentence family summary |

\* On insert from check-in UI, row may be created with `audio_url` only; ML step
fills analysis fields (or precomputed fallback fills all fields atomically).

### scenario_label enum

| Value | Purpose |
|-------|---------|
| `baseline` | Establish personal norm (10–15 seed rows) |
| `normal_day` | Demo «sounds as usual» (5–8 rows) |
| `tired_day` | Demo «worth calling» (5–8 rows) |
| `edge_case` | Short/silent/noisy samples (2–4 rows) |
| `live` | Recorded during public demo |

### features_json schema

```json
{
  "tempo_bpm": 118.5,
  "pause_mean_ms": 420,
  "pitch_std_hz": 28.3,
  "energy_rms": 0.042,
  "duration_sec": 18.2
}
```

All numeric fields MUST be numbers (not strings).

### status enum

- `normal` — no urgent family action
- `check-in needed` — visible yellow signal on dashboard

No other values permitted in UI or DB check constraint.

## Baseline (computed, not stored)

**Baseline** is derived at analysis time:

```text
baseline_features = mean(features_json) for profile_id
  WHERE scenario_label = 'baseline'
  ORDER BY created_at DESC
  LIMIT baseline_window
```

If fewer than 3 baseline rows exist, use all available `baseline` rows and set
status to `normal` with `acoustic_delta` = «Базовий рівень ще формується».

## State transitions (check-in lifecycle)

```text
[created]  audio_url set, analysis fields null
    ↓ ML or fallback
[analyzed] features_json, vitality_score, status, acoustic_delta populated
    ↓ optional P3
[complete] summary_for_family populated
```

Dashboard reads latest `analyzed` row by `created_at DESC`.

## Supabase Storage

**Bucket**: `audio`  
**Path pattern**: `{profile_id}/{checkin_id}.wav`  
**Max size**: 5 MB per file  
**MIME**: `audio/wav`, `audio/mpeg`

## Seed data requirements

| Set | Count | scenario_label |
|-----|------:|----------------|
| Baseline | 12 | `baseline` |
| Normal days | 6 | `normal_day` |
| Tired days | 6 | `tired_day` |
| Edge cases | 3 | `edge_case` |
| **Total** | **27** | — |

Dates spread over **21 days** minimum (SC-004). Vitality scores should trend
mostly 70–90 for normal, 45–65 for tired.

## Row Level Security (hackathon)

```sql
-- Illustrative policies (apply in Supabase SQL editor)
-- profiles: public read
-- checkins: public read; insert only with profile_id = 'demo-maria'
-- storage audio: authenticated/anon upload with size limit
```

Production hardening (auth, per-family isolation) is explicitly out of scope.

## Indexes

- `checkins (profile_id, created_at DESC)` — dashboard latest + trend query
- `checkins (scenario_label)` — seed scripts and demo controls
