import type { AcousticFeatures } from '../types/checkin';

const STORAGE_KEY = 'hearbeat_personal_baseline';

/** Baseline lives in sessionStorage: survives refresh, cleared when tab closes. */
export const BASELINE_STORAGE_HINT =
  'Зберігається в цій вкладці браузера до її закриття (оновлення F5 — ОК). У проді baseline буде в Supabase.';

export type BaselineFeatures = Pick<
  AcousticFeatures,
  'tempo_bpm' | 'pause_mean_ms' | 'pitch_std_hz' | 'energy_rms'
>;

export function getPersonalBaseline(): BaselineFeatures | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as BaselineFeatures;
    if (
      typeof parsed.tempo_bpm !== 'number' ||
      typeof parsed.pause_mean_ms !== 'number' ||
      typeof parsed.pitch_std_hz !== 'number' ||
      typeof parsed.energy_rms !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setPersonalBaseline(features: BaselineFeatures): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(features));
}

export function clearPersonalBaseline(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function toBaseline(features: AcousticFeatures): BaselineFeatures {
  return {
    tempo_bpm: features.tempo_bpm,
    pause_mean_ms: features.pause_mean_ms,
    pitch_std_hz: features.pitch_std_hz,
    energy_rms: features.energy_rms,
  };
}
