-- HearBeat hackathon schema
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'uk',
    baseline_window INT NOT NULL DEFAULT 10 CHECK (baseline_window BETWEEN 5 AND 20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scenario_label TEXT NOT NULL CHECK (
        scenario_label IN ('baseline', 'normal_day', 'tired_day', 'edge_case', 'live')
    ),
    transcript TEXT,
    features_json JSONB,
    vitality_score NUMERIC(5, 2) CHECK (vitality_score IS NULL OR (vitality_score >= 0 AND vitality_score <= 100)),
    status TEXT CHECK (status IS NULL OR status IN ('normal', 'check-in needed')),
    acoustic_delta TEXT,
    summary_for_family TEXT
);

CREATE INDEX IF NOT EXISTS idx_checkins_profile_created
    ON checkins (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkins_scenario
    ON checkins (scenario_label);
