import { insertCheckIn, updateCheckIn, uploadAudio } from './supabase';
import { getPersonalBaseline } from './personalBaseline';

import type { AnalyzeResult, CheckIn } from '../types/checkin';
import { DEMO_PROFILE_ID } from '../types/checkin';

type FallbackMap = Record<string, AnalyzeResult>;

let cache: FallbackMap | null = null;

const ML_URL =
  (import.meta.env.VITE_ML_API_URL as string | undefined) ??
  (import.meta.env.DEV ? '/ml-api' : 'http://localhost:8000');

export { ML_URL };

/** Baseline = acoustic profile of demo normal_response.wav (see generate_demo_audio.py). */
export const DEMO_BASELINE = {
  tempo_bpm: 93.17,
  pause_mean_ms: 314.52,
  pitch_std_hz: 229.92,
  energy_rms: 0.0266,
} as const;

const DEMO_BASELINE_JSON = JSON.stringify(DEMO_BASELINE);

function resolveBaselineJson(options?: {
  useDemoBaseline?: boolean;
  /** Demo WAV buttons always compare to synthetic demo profile. */
  forceDemoBaseline?: boolean;
}): string | undefined {
  if (!options?.forceDemoBaseline) {
    const personal = getPersonalBaseline();
    if (personal) {
      return JSON.stringify(personal);
    }
  }
  const useDemo = options?.useDemoBaseline ?? import.meta.env.VITE_USE_MOCK === 'true';
  if (useDemo || options?.forceDemoBaseline) {
    return DEMO_BASELINE_JSON;
  }
  return undefined;
}

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
  options?: {
    allowFallback?: boolean;
    useDemoBaseline?: boolean;
    includeSeries?: boolean;
    forceDemoBaseline?: boolean;
    baselineCalibrated?: boolean;
  },
): Promise<AnalyzeResult> {
  const allowFallback = options?.allowFallback ?? true;
  const includeSeries = options?.includeSeries ?? false;
  const baselineJson = resolveBaselineJson({
    useDemoBaseline: options?.useDemoBaseline,
    forceDemoBaseline: options?.forceDemoBaseline,
  });
  const calibrated =
    options?.baselineCalibrated ??
    (!options?.forceDemoBaseline && getPersonalBaseline() !== null);

  const form = new FormData();
  form.append('profile_id', DEMO_PROFILE_ID);
  form.append('scenario_label', scenario);
  form.append('audio_file', audioBlob, 'checkin.wav');
  if (baselineJson) {
    form.append('baseline_features', baselineJson);
  }
  if (calibrated) {
    form.append('baseline_calibrated', 'true');
  }
  if (includeSeries) {
    form.append('include_series', 'true');
  }

  try {
    const resp = await fetch(`${ML_URL}/analyze`, { method: 'POST', body: form });
    if (!resp.ok) {
      const detail = await resp.text();
      throw new Error(`ML API ${resp.status}: ${detail.slice(0, 120)}`);
    }
    return (await resp.json()) as AnalyzeResult;
  } catch (err) {
    if (!allowFallback) {
      throw err instanceof Error ? err : new Error('ML API недоступний');
    }
    const fallbacks = await loadFallbackMap();
    const key = scenario === 'tired_day' ? 'live_tired' : 'live_normal';
    return fallbacks[key];
  }
}

/** Analyze audio via ML API — for lab/demo without saving to Supabase. */
export async function analyzeAudio(
  audioBlob: Blob,
  options?: {
    allowFallback?: boolean;
    useDemoBaseline?: boolean;
    includeSeries?: boolean;
    forceDemoBaseline?: boolean;
    baselineCalibrated?: boolean;
  },
): Promise<AnalyzeResult> {
  return callAnalyze(audioBlob, 'live', {
    allowFallback: options?.allowFallback,
    useDemoBaseline: options?.useDemoBaseline ?? true,
    includeSeries: options?.includeSeries ?? true,
    forceDemoBaseline: options?.forceDemoBaseline,
    baselineCalibrated: options?.baselineCalibrated,
  });
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
