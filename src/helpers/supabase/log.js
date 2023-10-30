import { supabase } from './client';

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
    },
  ]);
  if (error) {
    console.error(error);
  }
  return data;
};
