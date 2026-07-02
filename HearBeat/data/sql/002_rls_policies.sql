-- HearBeat hackathon RLS (public demo — no auth)
-- Run after 001_schema.sql

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_public_read ON profiles;
CREATE POLICY profiles_public_read ON profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS checkins_public_read ON checkins;
CREATE POLICY checkins_public_read ON checkins
    FOR SELECT USING (true);

DROP POLICY IF EXISTS checkins_anon_insert ON checkins;
CREATE POLICY checkins_anon_insert ON checkins
    FOR INSERT WITH CHECK (profile_id = 'demo-maria');

DROP POLICY IF EXISTS checkins_anon_update ON checkins;
CREATE POLICY checkins_anon_update ON checkins
    FOR UPDATE USING (profile_id = 'demo-maria');

-- Storage: create bucket "audio" in dashboard, then:
-- DROP POLICY IF EXISTS audio_public_read ON storage.objects;
-- CREATE POLICY audio_public_read ON storage.objects FOR SELECT USING (bucket_id = 'audio');
-- CREATE POLICY audio_anon_upload ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio');
