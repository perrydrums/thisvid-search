/** Runs at import time so the hash is captured before `createClient` processes the auth callback. */
export const supabaseCallbackHashSnapshot =
  typeof window !== 'undefined' && window.location?.hash?.length > 1 ? window.location.hash : '';
