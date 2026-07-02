# HearBeat — Hackathon MVP

Voice check-in demo: emulated call → acoustic analysis → family dashboard.

**Specs**: [`../specs/001-hearbeat-hackathon-mvp/`](../specs/001-hearbeat-hackathon-mvp/)  
**Architecture**: [`docs/architecture.md`](docs/architecture.md) — структура папок, потоки данных, mock-режим  
**Validation**: [`../specs/001-hearbeat-hackathon-mvp/quickstart.md`](../specs/001-hearbeat-hackathon-mvp/quickstart.md)

## Quick start

### 1. Supabase

Run SQL in Supabase SQL editor:

- `data/sql/001_schema.sql`
- `data/sql/002_rls_policies.sql`
- Create Storage bucket `audio` (public read)

Copy `web/.env.example` → `web/.env` and `ml/.env.example` → `ml/.env`.

### 2. Seed data

```powershell
cd data/scripts
pip install supabase python-dotenv faker
python generate_demo_audio.py
python seed_supabase.py   # requires SUPABASE_URL + SUPABASE_SERVICE_KEY in ml/.env
```

Local dev without Supabase: set `VITE_USE_MOCK=true` in `web/.env` (loads `web/public/mock-checkins.json`).

### 3. ML API

```powershell
cd ml
pip install -e ".[dev]"
uvicorn hearbeat_ml.api:app --reload --port 8000
```

### 4. Web

```powershell
cd web
npm install
npm run dev
```

- Check-in: http://localhost:5173/check-in
- Dashboard: http://localhost:5173/dashboard

## Lovable sync (optional)

Generate UI in Lovable using the prompt in `hackaton/hearbeat_project-guide.md` §4.2,
then export into `web/` — keep `src/lib/checkinFlow.ts` and Supabase wiring from this repo.

## Deploy (hackathon)

- **Web**: Lovable publish or `npm run build` → Vercel/Netlify
- **ML**: Railway/Render — set `VITE_ML_API_URL` in web env
- **Secrets**: never commit `.env`; `OPENROUTER_API_KEY` only in `ml/.env`
