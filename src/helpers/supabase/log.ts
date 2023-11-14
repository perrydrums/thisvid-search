import { LogParams } from '../types';
import { supabase } from './client';
import { getIp } from './getIp';

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
}: LogParams): Promise<LogParams | null> => {
  const ipAddress = await getIp();
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
      },
    ])
    .select();
  if (error) {
    console.error(error);
  }
  return data ? data[0] : null;
};
