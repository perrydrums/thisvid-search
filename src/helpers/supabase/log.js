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
}) => {
  const ipAddress = await getIp();
  const { data, error } = await supabase.from('searches').insert([
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
      userId,
      friendId,
      resultCount,
      ipAddress,
    },
  ]);
  if (error) {
    console.error(error);
  }
  return data;
};
