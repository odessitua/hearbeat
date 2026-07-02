# Supabase Integration Contract: HearBeat

**Feature**: `001-hearbeat-hackathon-mvp`  
**See also**: [data-model.md](../data-model.md)

## Environment variables (web + scripts)

| Variable | Consumer | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | `HearBeat/web` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `HearBeat/web` | Public anon key |
| `SUPABASE_URL` | `HearBeat/data/scripts` | Same URL for seed scripts |
| `SUPABASE_SERVICE_KEY` | Seed scripts only | Service role (never in frontend) |
| `VITE_ML_API_URL` | `HearBeat/web` | ML API base URL |
| `OPENROUTER_API_KEY` | `HearBeat/ml` only | OpenRouter token — **never** expose to web |
| `OPENROUTER_MODEL` | `HearBeat/ml` | Default e.g. `google/gemini-2.5-flash` |

## Tables

### profiles — seed row

```json
{
  "id": "demo-maria",
  "display_name": "Марія",
  "language": "uk",
  "baseline_window": 10,
  "created_at": "2026-06-01T10:00:00Z"
}
```

### checkins — insert flow (live check-in)

**Step 1 — Frontend insert (after audio upload)**

```json
{
  "profile_id": "demo-maria",
  "audio_url": "https://<project>.supabase.co/storage/v1/object/public/audio/demo-maria/<uuid>.wav",
  "created_at": "<ISO8601 now>",
  "scenario_label": "live",
  "transcript": null
}
```

**Step 2 — Frontend PATCH after ML response**

```json
{
  "features_json": { "tempo_bpm": 95.2, "pause_mean_ms": 610, "pitch_std_hz": 22.1, "energy_rms": 0.031, "duration_sec": 17.5 },
  "vitality_score": 58.0,
  "status": "check-in needed",
  "acoustic_delta": "Темп мовлення нижчий на 24%, паузи довші на 45%",
  "summary_for_family": "Сьогодні голос звучав повільніше, ніж зазвичай. Можливо, варто подзвонити ввечері."
}
```

### checkins — dashboard query

```sql
SELECT id, created_at, vitality_score, status, acoustic_delta, summary_for_family
FROM checkins
WHERE profile_id = 'demo-maria'
ORDER BY created_at DESC;
```

Trend chart query (last 30 days):

```sql
SELECT created_at::date AS day, AVG(vitality_score) AS avg_vitality
FROM checkins
WHERE profile_id = 'demo-maria'
GROUP BY day
ORDER BY day;
```

## Storage upload contract

- **Bucket**: `audio`
- **Path**: `demo-maria/{checkin_id}.wav`
- **Client**: `supabase.storage.from('audio').upload(path, blob, { contentType: 'audio/wav' })`
- **Public URL**: `getPublicUrl(path)` for `audio_url` column

## Web routes contract

| Route | Persona | Purpose |
|-------|---------|---------|
| `/check-in` | Elderly parent | Emulated call + 3 voice questions |
| `/dashboard` | Adult child | Status, trend, summary, call CTA |

No auth middleware. Deep links are public.

## Demo audio fallback contract

When live recording unavailable, UI loads static files from
`HearBeat/data/audio/demo/`:

| File | scenario_label | Expected status |
|------|----------------|-----------------|
| `normal_response.wav` | `live` (or forced `normal_day`) | `normal` |
| `tired_response.wav` | `live` (or forced `tired_day`) | `check-in needed` |

Upload selected file through same Storage + analyze path as live recording.

## Precomputed fallback contract

If `POST /analyze` fails, web MAY load canned analysis from
`HearBeat/data/seed/fallback_analysis.json` keyed by `scenario_label`:

```json
{
  "normal_day": {
    "vitality_score": 82,
    "status": "normal",
    "acoustic_delta": "Голос звучить як зазвичай",
    "features_json": { "tempo_bpm": 115, "pause_mean_ms": 400, "pitch_std_hz": 30, "energy_rms": 0.045, "duration_sec": 16 }
  },
  "tired_day": {
    "vitality_score": 55,
    "status": "check-in needed",
    "acoustic_delta": "Темп нижчий на 28%, паузи довші на 42%",
    "features_json": { "tempo_bpm": 88, "pause_mean_ms": 620, "pitch_std_hz": 21, "energy_rms": 0.028, "duration_sec": 19 }
  }
}
```

User flow MUST remain identical (constitution VIII).
