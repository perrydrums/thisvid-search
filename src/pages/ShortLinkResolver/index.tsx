import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { resolveShortLink } from '../../helpers/supabase/shortLinks';

import './ShortLinkResolver.css';

/**
 * Resolves `/s/:code` via Supabase and redirects to `/search` or `/legacy/search` with query params.
 */
export function ShortLinkResolver() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resolved = await resolveShortLink(code || '');
      if (cancelled) return;
      if (!resolved) {
        setError('This link is invalid or could not be found.');
        return;
      }
      const qs = new URLSearchParams({ ...resolved.params, run: 'true' });
      navigate(`${resolved.path}?${qs.toString()}`, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [code, navigate]);

  if (error) {
    return (
      <div className="short-link-resolver">
        <p className="short-link-resolver__error" role="alert">
          {error}
        </p>
        <p>
          <a href="/search">Back to search</a>
        </p>
      </div>
    );
  }

  return (
    <div className="short-link-resolver" aria-live="polite">
      <p className="short-link-resolver__loading">Opening link…</p>
    </div>
  );
}
