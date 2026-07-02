export type ScenarioLabel =
  | 'baseline'
  | 'normal_day'
  | 'tired_day'
  | 'edge_case'
  | 'live';

export type CheckInStatus = 'normal' | 'check-in needed';

export interface AcousticFeatures {
  tempo_bpm: number;
  pause_mean_ms: number;
  pitch_std_hz: number;
  energy_rms: number;
  duration_sec: number;
}

export interface CheckIn {
  id: string;
  profile_id: string;
  audio_url: string;
  created_at: string;
  scenario_label: ScenarioLabel;
  transcript: string | null;
  features_json: AcousticFeatures | null;
  vitality_score: number | null;
  status: CheckInStatus | null;
  acoustic_delta: string | null;
  summary_for_family: string | null;
}

export interface AnalyzeResult {
  features_json: AcousticFeatures;
  vitality_score: number;
  status: CheckInStatus;
  acoustic_delta: string;
  summary_for_family?: string;
}

export const DEMO_PROFILE_ID = 'demo-maria';

export const CHECKIN_QUESTIONS = [
  'Як минув твій день?',
  'Що цікавого сьогодні було?',
  'Як ти себе почуваєш?',
] as const;
