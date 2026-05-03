import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabaseCallbackHashSnapshot } from '../helpers/supabase/callbackHashSnapshot';
import { supabase } from '../helpers/supabase/client';

/** True if URL hash looks like Supabase email / magic-link callback. */
export function hashLooksLikeAuthCallback(hash: string): boolean {
  const h = hash.trim();
  if (!h || h === '#') return false;
  return (
    h.includes('access_token') ||
    h.includes('refresh_token') ||
    h.includes('type=email') ||
    h.includes('type=magiclink') ||
    h.includes('type=signup')
  );
}

const SNAP_LOOKS_LIKE_EMAIL_AUTH = hashLooksLikeAuthCallback(supabaseCallbackHashSnapshot);

/**
 * Sends users to `/search` after email magic-link sign-in when tokens arrive on another path (e.g. Site URL is `/`).
 * Also add `AUTH_REDIRECT`/Site URL redirects in Supabase (see docs).
 */
export function AuthEmailReturnHandler(): null {
  const navigate = useNavigate();

  useEffect(() => {
    if (!SNAP_LOOKS_LIKE_EMAIL_AUTH) return;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      navigate('/search', { replace: true });
      requestAnimationFrame(() => {
        if (typeof window.history?.replaceState === 'function') {
          window.history.replaceState(null, '', '/search');
        }
      });
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || done) return;
      if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return;
      finish();
      subscription.unsubscribe();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
}
