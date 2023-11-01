import { supabase } from './client';

export const logFeedback = async (searchId, rating) => {
  const { error } = await supabase.from('feedback').insert([{ searchId, rating }]);

  if (error) {
    console.error(error);
  }
};
