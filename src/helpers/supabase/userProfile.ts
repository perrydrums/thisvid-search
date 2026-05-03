import type { Mood } from '../types';

import { supabase } from './client';

export type ProfileRow = {
  id: string;
  thisvid_user_id: string | null;
  default_mood: string | null;
  favourites: string[];
  last_sync_date: string | null;
  created_at?: string;
  updated_at?: string;
};

function mapProfileRow(row: Record<string, unknown> | null): ProfileRow | null {
  if (!row) return null;
  return {
    id: String(row.id),
    thisvid_user_id: (row.thisvid_user_id as string) ?? null,
    default_mood: (row.default_mood as string) ?? null,
    favourites: Array.isArray(row.favourites) ? (row.favourites as string[]) : [],
    last_sync_date: row.last_sync_date ? String(row.last_sync_date) : null,
  };
}

export async function fetchProfile(authUserId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
  .select('id, thisvid_user_id, default_mood, favourites, last_sync_date, created_at, updated_at')
    .eq('id', authUserId)
    .maybeSingle();

  if (error) {
    console.error('fetchProfile', error);
    return null;
  }
  return mapProfileRow(data as Record<string, unknown> | null);
}

export async function updateProfile(
  authUserId: string,
  patch: Partial<{
    thisvid_user_id: string | null;
    default_mood: string | null;
    favourites: string[];
    last_sync_date: string | null;
  }>,
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', authUserId);

  if (error) {
    console.error('updateProfile', error);
    return false;
  }
  return true;
}

/** Insert profile row if trigger missed (e.g. pre-existing auth user). */
export async function ensureProfileRow(authUserId: string): Promise<void> {
  const { error } = await supabase.from('profiles').insert({ id: authUserId }).select();
  if (error && !String(error.message).includes('duplicate')) {
    console.error('ensureProfileRow', error);
  }
}

export async function fetchMoodsForUser(authUserId: string): Promise<Mood[]> {
  const { data, error } = await supabase
    .from('moods')
    .select('name, preferences')
    .eq('user_id', authUserId)
    .order('name');

  if (error) {
    console.error('fetchMoodsForUser', error);
    return [];
  }
  const rows = (data ?? []) as unknown as { name: unknown; preferences?: unknown }[];
  return rows.map((row) => ({
    name: String(row.name),
    preferences: (row.preferences || {}) as Mood['preferences'],
  }));
}

export async function upsertMoodRow(authUserId: string, mood: Mood): Promise<boolean> {
  const { error } = await supabase.from('moods').upsert(
    {
      user_id: authUserId,
      name: mood.name,
      preferences: mood.preferences,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,name' },
  );

  if (error) {
    console.error('upsertMoodRow', error);
    return false;
  }
  return true;
}

export async function deleteMoodRow(authUserId: string, moodName: string): Promise<boolean> {
  const { error } = await supabase
    .from('moods')
    .delete()
    .eq('user_id', authUserId)
    .eq('name', moodName);

  if (error) {
    console.error('deleteMoodRow', error);
    return false;
  }
  return true;
}

export async function replaceAllMoodsForUser(authUserId: string, moods: Mood[]): Promise<boolean> {
  const { error: delErr } = await supabase.from('moods').delete().eq('user_id', authUserId);
  if (delErr) {
    console.error('replaceAllMoods delete', delErr);
    return false;
  }
  if (moods.length === 0) return true;

  const rows = moods.map((m) => ({
    user_id: authUserId,
    name: m.name,
    preferences: m.preferences,
  }));
  const { error: insErr } = await supabase.from('moods').insert(rows);
  if (insErr) {
    console.error('replaceAllMoods insert', insErr);
    return false;
  }
  return true;
}

const SYNC_FLAG_PREFIX = 'tvass-profile-synced-for-';

export function hasSyncedLocalToProfile(authUserId: string): boolean {
  return localStorage.getItem(SYNC_FLAG_PREFIX + authUserId) === '1';
}

export function markSyncedLocalToProfile(authUserId: string): void {
  localStorage.setItem(SYNC_FLAG_PREFIX + authUserId, '1');
}

/**
 * One-time merge from browser storage into Supabase after first login.
 * Empty local fields do not overwrite existing profile data (e.g. new device or after storage clear).
 */
export async function syncLocalStorageToProfile(authUserId: string): Promise<void> {
  if (hasSyncedLocalToProfile(authUserId)) return;

  await ensureProfileRow(authUserId);
  const existing = await fetchProfile(authUserId);

  const thisvidTrimmed = (localStorage.getItem('tvass-user-id') || '').trim();
  const defaultMoodTrimmed = (localStorage.getItem('tvass-default-mood') || '').trim();
  const favComma = localStorage.getItem('tvass-favourites') || '';
  const favouritesFromLocal = favComma
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const lastSyncTrimmed = (localStorage.getItem('tvass-last-sync-date') || '').trim();

  let moods: Mood[] = [];
  try {
    const raw = localStorage.getItem('tvass-moods');
    moods = raw ? (JSON.parse(raw) as Mood[]) : [];
  } catch {
    moods = [];
  }

  const mergedThisvid =
    thisvidTrimmed ||
    existing?.thisvid_user_id?.trim() ||
    null;
  const mergedDefaultMood = defaultMoodTrimmed || existing?.default_mood?.trim() || null;
  const mergedFavourites =
    favouritesFromLocal.length > 0 ? favouritesFromLocal : (existing?.favourites ?? []);
  const mergedLastSync = lastSyncTrimmed || existing?.last_sync_date || null;

  await updateProfile(authUserId, {
    thisvid_user_id: mergedThisvid,
    default_mood: mergedDefaultMood,
    favourites: mergedFavourites,
    last_sync_date: mergedLastSync,
  });

  if (moods.length > 0) {
    await replaceAllMoodsForUser(authUserId, moods);
  }

  markSyncedLocalToProfile(authUserId);
}

/** Keep legacy helpers working while logged in on v2 routes. */
export function mirrorProfileToLocalStorage(p: ProfileRow, moods: Mood[]): void {
  if (p.thisvid_user_id) localStorage.setItem('tvass-user-id', p.thisvid_user_id);
  else localStorage.removeItem('tvass-user-id');

  if (p.default_mood) localStorage.setItem('tvass-default-mood', p.default_mood);
  else localStorage.removeItem('tvass-default-mood');

  localStorage.setItem('tvass-favourites', (p.favourites || []).join(','));
  if (p.last_sync_date) localStorage.setItem('tvass-last-sync-date', p.last_sync_date);
  localStorage.setItem('tvass-moods', JSON.stringify(moods));
}
