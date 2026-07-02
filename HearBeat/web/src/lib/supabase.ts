import { createClient, SupabaseClient } from '@supabase/supabase-js';

import type { CheckIn } from '../types/checkin';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key || url.includes('your-project')) {
    return null;
  }
  if (!client) {
    client = createClient(url, key);
  }
  return client;
}

export function useMockData(): boolean {
  return import.meta.env.VITE_USE_MOCK === 'true';
}

function sortCheckInsNewestFirst(rows: CheckIn[]): CheckIn[] {
  return [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function fetchCheckIns(): Promise<CheckIn[]> {
  if (useMockData()) {
    const resp = await fetch('/mock-checkins.json');
    const rows = (await resp.json()) as CheckIn[];
    return sortCheckInsNewestFirst(rows);
  }
  const sb = getSupabase();
  if (!sb) {
    const resp = await fetch('/mock-checkins.json');
    const rows = (await resp.json()) as CheckIn[];
    return sortCheckInsNewestFirst(rows);
  }
  const { data, error } = await sb
    .from('checkins')
    .select('*')
    .eq('profile_id', 'demo-maria')
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as CheckIn[];
}

export async function insertCheckIn(row: Partial<CheckIn>): Promise<CheckIn> {
  const sb = getSupabase();
  if (!sb) {
    throw new Error('Supabase not configured');
  }
  const { data, error } = await sb.from('checkins').insert(row).select().single();
  if (error) {
    throw error;
  }
  return data as CheckIn;
}

export async function updateCheckIn(id: string, patch: Partial<CheckIn>): Promise<CheckIn> {
  const sb = getSupabase();
  if (!sb) {
    throw new Error('Supabase not configured');
  }
  const { data, error } = await sb.from('checkins').update(patch).eq('id', id).select().single();
  if (error) {
    throw error;
  }
  return data as CheckIn;
}

export async function uploadAudio(profileId: string, checkInId: string, blob: Blob): Promise<string> {
  const sb = getSupabase();
  if (!sb) {
    return `mock://audio/${checkInId}.wav`;
  }
  const path = `${profileId}/${checkInId}.wav`;
  const { error } = await sb.storage.from('audio').upload(path, blob, {
    contentType: 'audio/wav',
    upsert: true,
  });
  if (error) {
    throw error;
  }
  const { data } = sb.storage.from('audio').getPublicUrl(path);
  return data.publicUrl;
}
