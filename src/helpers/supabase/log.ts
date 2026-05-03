import { LogParams } from '../types';
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
}: LogParams): Promise<LogParams | null> => {
  const ipAddress = await getIp();
  const location = await getLocationFromIp(ipAddress);

  let authUserId: string | null = null;
  try {
    const { data: authData } = await supabase.auth.getUser();
    authUserId = authData?.user?.id ?? null;
  } catch {
    /* non-fatal: log without auth link */
  }

  const { data, error } = await supabase
    .from('searches')
    .insert([
      {
        mode,
        advanced,
        type,
        tags,
        pageAmount,
        quick,
        duration,
        primaryTag,
        category,
        userId: userId || null,
        friendId: friendId || null,
        resultCount,
        ipAddress,
        visitorId,
        visitorGeneratedName: visitorName,
        ipLocation: location.ipLocation,
        auth_user_id: authUserId,
      },
    ])
    .select();
  if (error) {
    console.error(error);
  }
  // @ts-ignore.
  return data ? data[0] : null;
};

export const updateLogResultCount = async (searchId: number, resultCount: number) => {
  const { data, error } = await supabase
    .from('searches')
    .update({ resultCount })
    .eq('id', searchId)
    .select();

  if (error) {
    console.error(error);
  }
  return data ? data[0] : null;
};
