import { LogInsertParams, LogParams } from '../types';
import { supabase } from './client';
import { getIp } from './getIp';
import { getLocationFromIp } from './getLocation';

export const log = async ({
  mode,
  advanced,
  type,
  tags = [],
  pageAmount,
  quick,
  duration,
  primaryTag,
  category,
  userId,
  friendId,
  resultCount,
  visitorId,
  visitorName,
}: LogInsertParams): Promise<LogParams | null> => {
  const ipAddress = await getIp();
  const location = await getLocationFromIp(ipAddress);

  const { data, error } = await supabase.rpc('insert_search_log', {
    p_mode: mode,
    p_advanced: advanced,
    p_type: type,
    p_tags: tags,
    p_page_amount: pageAmount,
    p_quick: quick,
    p_duration: Math.trunc(duration),
    p_primary_tag: primaryTag,
    p_category: category,
    p_user_id: userId ?? null,
    p_friend_id: friendId ?? null,
    p_result_count: resultCount,
    p_ip_address: ipAddress,
    p_visitor_id: visitorId,
    p_visitor_generated_name: visitorName,
    p_ip_location: location.ipLocation,
  });

  if (error) {
    console.error(error);
    return null;
  }

  const rows = Array.isArray(data) ? data : data != null ? [data as Record<string, unknown>] : [];
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  const idRaw = row.search_id ?? row.id;
  const idVal =
    typeof idRaw === 'number' ? idRaw : typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;

  const tokenRaw = row.result_token ?? row.result_update_token;
  const token =
    typeof tokenRaw === 'string'
      ? tokenRaw
      : tokenRaw != null && typeof tokenRaw === 'object' && 'value' in (tokenRaw as object)
        ? String((tokenRaw as { value: unknown }).value)
        : null;

  const rcRaw = row.stored_result_count ?? row.result_count ?? resultCount;
  const rc = typeof rcRaw === 'number' ? rcRaw : parseInt(String(rcRaw), 10) || resultCount;

  if (!Number.isFinite(idVal) || idVal <= 0) {
    return null;
  }

  const mapped: LogParams = {
    id: idVal,
    resultUpdateToken: token ?? undefined,
    mode,
    advanced,
    type,
    tags,
    pageAmount,
    quick,
    duration,
    primaryTag,
    category,
    userId: userId || undefined,
    friendId: friendId || undefined,
    resultCount: rc,
    visitorId,
    visitorName,
    ipAddress,
    ipLocation: location.ipLocation,
  };

  return mapped;
};

export const updateLogResultCount = async (
  searchId: number,
  resultCount: number,
  resultUpdateToken?: string | null,
) => {
  if (!resultUpdateToken?.trim()) {
    console.warn('updateLogResultCount: missing resultUpdateToken; skipping');
    return null;
  }

  const { error } = await supabase.rpc('update_search_result_count', {
    p_id: searchId,
    p_token: resultUpdateToken.trim(),
    p_result: resultCount,
  });

  if (error) {
    console.error(error);
    return null;
  }
  return { id: searchId, resultCount } as const;
};
