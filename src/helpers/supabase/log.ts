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
      },
    ])
    .select();
  if (error) {
    console.error(error);
  }
  // @ts-ignore.
  return data ? data[0] : null;
};
