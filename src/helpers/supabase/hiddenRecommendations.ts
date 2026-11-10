import { canonicalVideoUrl } from '../videoUrl';

import { supabase } from './client';

const STORAGE_KEY = 'tvass-hidden-recommendations';

export type HiddenRecommendation = {
  url: string;
  hiddenAt: string;
};

/** Calendar month. Kept in this helper so the page copy never mentions the window. */
export function hiddenRecommendationCutoff(now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - 1);
  return cutoff;
}

export function isHiddenRecommendationActive(hiddenAt: string, now = new Date()): boolean {
  const at = new Date(hiddenAt).getTime();
  if (!Number.isFinite(at)) return false;
  return at >= hiddenRecommendationCutoff(now).getTime();
}

function normalizeRow(url: string, hiddenAt: string): HiddenRecommendation | null {
  const canonical = canonicalVideoUrl(url);
  if (!canonical || !isHiddenRecommendationActive(hiddenAt)) return null;
  return { url: canonical, hiddenAt };
}

export function loadLocalHiddenRecommendations(): HiddenRecommendation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return mergeHiddenRecommendations(
      parsed.map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Partial<HiddenRecommendation>;
        return normalizeRow(String(row.url || ''), String(row.hiddenAt || ''));
      }).filter((row): row is HiddenRecommendation => !!row),
    );
  } catch {
    return [];
  }
}

export function saveLocalHiddenRecommendations(rows: HiddenRecommendation[]): void {
  const active = mergeHiddenRecommendations(rows);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
  } catch (error) {
    console.error('Failed to save hidden recommendations', error);
  }
}

/** Latest hide wins when the same video appears more than once. Drops expired rows. */
export function mergeHiddenRecommendations(
  ...lists: Array<HiddenRecommendation[] | null | undefined>
): HiddenRecommendation[] {
  const byUrl = new Map<string, HiddenRecommendation>();
  lists.forEach((list) => {
    (list ?? []).forEach((row) => {
      const normalized = normalizeRow(row.url, row.hiddenAt);
      if (!normalized) return;
      const existing = byUrl.get(normalized.url);
      if (!existing || existing.hiddenAt < normalized.hiddenAt) {
        byUrl.set(normalized.url, normalized);
      }
    });
  });
  return Array.from(byUrl.values());
}

export async function fetchHiddenRecommendations(): Promise<HiddenRecommendation[] | null> {
  const cutoff = hiddenRecommendationCutoff().toISOString();
  const { data, error } = await supabase
    .from('hidden_recommendations')
    .select('video_url, hidden_at')
    .gte('hidden_at', cutoff);

  if (error) {
    console.error('fetchHiddenRecommendations', error);
    return null;
  }

  const rows = (data ?? []) as unknown as { video_url?: string; hidden_at?: string }[];
  return mergeHiddenRecommendations(
    rows.map((row) => ({
      url: String(row.video_url || ''),
      hiddenAt: String(row.hidden_at || ''),
    })),
  );
}

export async function upsertHiddenRecommendation(
  userId: string,
  videoUrl: string,
  hiddenAt: string,
): Promise<boolean> {
  const { error } = await supabase.from('hidden_recommendations').upsert(
    {
      user_id: userId,
      video_url: videoUrl,
      hidden_at: hiddenAt,
    },
    { onConflict: 'user_id,video_url' },
  );

  if (error) {
    console.error('upsertHiddenRecommendation', error);
    return false;
  }
  return true;
}

export async function deleteExpiredHiddenRecommendations(): Promise<void> {
  const { error } = await supabase
    .from('hidden_recommendations')
    .delete()
    .lt('hidden_at', hiddenRecommendationCutoff().toISOString());

  if (error) console.error('deleteExpiredHiddenRecommendations', error);
}
