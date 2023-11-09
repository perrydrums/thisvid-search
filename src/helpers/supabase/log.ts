import { supabase } from './client';
import { getIp } from './getIp';

type LogParams = {
  mode: string;
  advanced: boolean;
  type: string;
  tags: string[];
  pageAmount: number;
  quick: boolean;
  duration: number;
  primaryTag: string;
  category: string;
  userId?: string;
  friendId?: string;
  resultCount: number;
};

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
}: LogParams): Promise<Object | null> => {
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
      },
    ])
    .select();
  if (error) {
    console.error(error);
  }
  return data ? data[0] : null;
};
