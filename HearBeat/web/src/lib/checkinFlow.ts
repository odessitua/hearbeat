import { insertCheckIn, updateCheckIn, uploadAudio } from './supabase';

import type { AnalyzeResult, CheckIn } from '../types/checkin';
import { DEMO_PROFILE_ID } from '../types/checkin';

type FallbackMap = Record<string, AnalyzeResult>;

let cache: FallbackMap | null = null;

const ML_URL = (import.meta.env.VITE_ML_API_URL as string | undefined) ?? 'http://localhost:8000';

/** Maria's seeded baseline — used in mock mode when Supabase has no baseline rows. */
const DEMO_BASELINE_JSON = JSON.stringify({
  tempo_bpm: 115,
  pause_mean_ms: 400,
  pitch_std_hz: 30,
  energy_rms: 0.045,
});

async function loadFallbackMap(): Promise<FallbackMap> {
  if (cache) {
    return cache;
  }
  const resp = await fetch('/fallback_analysis.json');
  cache = (await resp.json()) as FallbackMap;
  return cache;
}

export async function loadDemoAudio(kind: 'normal' | 'tired'): Promise<Blob> {
  const file = kind === 'normal' ? 'normal_response.wav' : 'tired_response.wav';
  const resp = await fetch(`/demo-audio/${file}`);
  if (!resp.ok) {
    throw new Error(`Demo audio not found: ${file}`);
  }
  return resp.blob();
}

async function callAnalyze(
  audioBlob: Blob,
  scenario: 'live' | 'normal_day' | 'tired_day',
): Promise<AnalyzeResult> {
  const form = new FormData();
  form.append('profile_id', DEMO_PROFILE_ID);
  form.append('scenario_label', scenario);
  form.append('audio_file', audioBlob, 'checkin.wav');
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    form.append('baseline_features', DEMO_BASELINE_JSON);
  }

  try {
    const resp = await fetch(`${ML_URL}/analyze`, { method: 'POST', body: form });
    if (!resp.ok) {
      throw new Error(`ML API ${resp.status}`);
    }
    return (await resp.json()) as AnalyzeResult;
  } catch {
    const fallbacks = await loadFallbackMap();
    const key = scenario === 'tired_day' ? 'live_tired' : 'live_normal';
    return fallbacks[key];
  }
}

export async function completeCheckIn(
  audioBlob: Blob,
  demoMode: 'normal' | 'tired' | 'live' = 'live',
): Promise<CheckIn> {
  const scenario = demoMode === 'tired' ? 'tired_day' : demoMode === 'normal' ? 'normal_day' : 'live';
  const id = crypto.randomUUID();
  const audioUrl = await uploadAudio(DEMO_PROFILE_ID, id, audioBlob);

  let row: CheckIn;
  try {
    row = await insertCheckIn({
      id,
      profile_id: DEMO_PROFILE_ID,
      audio_url: audioUrl,
      created_at: new Date().toISOString(),
      scenario_label: 'live',
    });
  } catch {
    row = {
      id,
      profile_id: DEMO_PROFILE_ID,
      audio_url: audioUrl,
      created_at: new Date().toISOString(),
      scenario_label: 'live',
      transcript: null,
      features_json: null,
      vitality_score: null,
      status: null,
      acoustic_delta: null,
      summary_for_family: null,
    };
  }

  const analysis = await callAnalyze(audioBlob, scenario);
  const patch = {
    features_json: analysis.features_json,
    vitality_score: analysis.vitality_score,
    status: analysis.status,
    acoustic_delta: analysis.acoustic_delta,
    summary_for_family: analysis.summary_for_family ?? null,
    scenario_label: 'live' as const,
  };

  try {
    return await updateCheckIn(row.id, patch);
  } catch {
    return { ...row, ...patch };
  }
}
