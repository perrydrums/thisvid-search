import { nanoid } from 'nanoid';

import { supabase } from './client';

const CODE_LENGTH = 8;
const MAX_INSERT_ATTEMPTS = 3;

export type ShortLinkSearchPath = '/search' | '/legacy/search';

/**
 * Serialize search query fields for a short link. Omit `run`; the resolver always adds `run=true`.
 */
export function buildShortLinkParams(record: Record<string, string>): Record<string, string> {
  const next = { ...record };
  delete next.run;
  return next;
}

function isUniqueViolation(err: { code?: string; message?: string }): boolean {
  return err.code === '23505' || /duplicate|unique/i.test(err.message || '');
}

/**
 * Insert a short link row; returns the new short **code** (path segment only).
 */
export async function createShortLink(
  path: ShortLinkSearchPath,
  params: Record<string, string>,
): Promise<string> {
  const payloadParams = buildShortLinkParams(params);

  for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt += 1) {
    const code = nanoid(CODE_LENGTH);
    // `short_links` is not in generated Supabase types; loosen typing for this table only.
    const { error } = await (supabase as any).from('short_links').insert({
      code,
      path,
      params: payloadParams,
    });
    if (!error) {
      return code;
    }
    if (!isUniqueViolation(error)) {
      throw new Error(error.message || 'Failed to create short link');
    }
  }

  throw new Error('Could not generate a unique short code');
}

export type ResolvedShortLink = {
  path: ShortLinkSearchPath;
  params: Record<string, string>;
};

/**
 * Load stored path + params for a short code.
 */
export async function resolveShortLink(code: string): Promise<ResolvedShortLink | null> {
  const trimmed = code?.trim();
  if (!trimmed) return null;

  const { data, error } = await (supabase as any)
    .from('short_links')
    .select('path, params')
    .eq('code', trimmed)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as { path: string; params: Record<string, unknown> };
  const path = row.path;
  const raw = row.params;
  if (path !== '/search' && path !== '/legacy/search') return null;

  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw || {})) {
    if (v === undefined || v === null) continue;
    params[k] = String(v);
  }

  return { path: path as ShortLinkSearchPath, params };
}
