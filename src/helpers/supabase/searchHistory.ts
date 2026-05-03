import { supabase } from './client';

const V2_MODES = new Set(['user', 'category', 'tags', 'extreme']);

function pick(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (k in raw && raw[k] !== null && raw[k] !== undefined) return raw[k];
  }
  return undefined;
}

function pickNum(raw: Record<string, unknown>, ...keys: string[]): number {
  const v = pick(raw, ...keys);
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function pickBool(raw: Record<string, unknown>, ...keys: string[]): boolean {
  const v = pick(raw, ...keys);
  return v === true || v === 'true' || v === 1 || v === '1';
}

function pickStr(raw: Record<string, unknown>, ...keys: string[]): string {
  const v = pick(raw, ...keys);
  return v != null ? String(v) : '';
}

function normalizeTags(raw: Record<string, unknown>): string[] {
  const tags = pick(raw, 'tags', 'Tags');
  if (Array.isArray(tags)) return tags.map(String).filter(Boolean);
  if (typeof tags === 'string') {
    try {
      const p = JSON.parse(tags) as unknown;
      return Array.isArray(p) ? p.map(String).filter(Boolean) : [];
    } catch {
      return tags.includes(',')
        ? tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
    }
  }
  return [];
}

export type SearchHistoryRecord = {
  id: number;
  mode: string;
  advanced: boolean;
  type: string;
  tags: string[];
  pageAmount: number;
  quick: boolean;
  duration: number;
  primaryTag: string;
  category: string;
  /** ThisVid member ID for listing user mode (stored as userId). */
  thisvidMemberId: string;
  friendId: string;
  resultCount: number;
  createdAtIso: string | null;
};

/** Map one Supabase `searches` row (unknown column casing) into a typed record. */
export function normalizeSearchHistoryRow(raw: Record<string, unknown>): SearchHistoryRecord {
  const idVal = pickNum(raw, 'id', 'ID');
  return {
    id: idVal,
    mode: pickStr(raw, 'mode', 'Mode') || 'user',
    advanced: pickBool(raw, 'advanced', 'Advanced'),
    type: pickStr(raw, 'type', 'Type'),
    tags: normalizeTags(raw),
    pageAmount: pickNum(raw, 'pageAmount', 'page_amount'),
    quick: pickBool(raw, 'quick', 'Quick'),
    duration: pickNum(raw, 'duration', 'Duration'),
    primaryTag: pickStr(raw, 'primaryTag', 'primary_tag'),
    category: pickStr(raw, 'category', 'Category'),
    thisvidMemberId: pickStr(raw, 'userId', 'user_id', 'userid'),
    friendId: pickStr(raw, 'friendId', 'friend_id'),
    resultCount: pickNum(raw, 'resultCount', 'result_count'),
    createdAtIso: (() => {
      const ts = pick(raw, 'created');
      return ts != null ? String(ts) : null;
    })(),
  };
}

/** Build a replay URL for classic or v2 search from a stored analytics row (best-effort; mood filters aren’t persisted). */
export function searchHistoryReplayHref(record: SearchHistoryRecord): string {
  const p = new URLSearchParams();
  p.set('mode', record.mode);
  p.set('type', record.type);
  if (record.thisvidMemberId) p.set('id', record.thisvidMemberId);
  if (record.friendId) p.set('friendId', record.friendId);
  if (record.primaryTag) p.set('primaryTag', record.primaryTag);
  if (record.category) p.set('category', record.category);
  if (record.pageAmount > 0) p.set('amount', String(record.pageAmount));
  p.set('minDuration', String(record.duration));
  p.set('tags', record.tags.join(','));
  p.set('termsOperator', 'or');
  p.set('orderBy', 'relevance');
  p.set('start', '1');
  if (record.advanced) p.set('advanced', 'true');
  p.set('quick', record.quick ? 'true' : 'false');
  p.set('run', 'true');

  const path = V2_MODES.has(record.mode) ? '/search-v2' : '/search';
  return `${path}?${p.toString()}`;
}

export const SEARCH_HISTORY_PAGE_SIZE = 25;

/** Paginated searches for the signed-in user (RLS must allow SELECT where auth.uid() = auth_user_id). */
export async function fetchSearchHistoryPage(
  authUserId: string,
  offset: number,
  limit: number,
): Promise<{ rows: SearchHistoryRecord[]; error: string | null }> {
  const to = offset + limit - 1;
  const { data, error } = await supabase
    .from('searches')
    .select('*')
    .eq('auth_user_id', authUserId)
    .order('id', { ascending: false })
    .range(offset, to);

  if (error) {
    console.error('fetchSearchHistoryPage', error);
    return { rows: [], error: error.message };
  }

  const rawList = (data ?? []) as unknown as Record<string, unknown>[];
  return {
    rows: rawList.map(normalizeSearchHistoryRow),
    error: null,
  };
}
