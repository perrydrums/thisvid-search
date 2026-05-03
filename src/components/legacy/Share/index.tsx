import React, { useCallback, useEffect, useRef, useState } from 'react';

import './style.css';

type ShareProps = {
  getShareUrl: () => Promise<string>;
};

const Share = ({ getShareUrl }: ShareProps) => {
  const [state, setState] = useState<'idle' | 'generating' | 'copied' | 'failed'>('idle');
  const resetRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetRef.current != null) {
        window.clearTimeout(resetRef.current);
      }
    };
  }, []);

  const copyText = useCallback(async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }, []);

  const handleActivate = useCallback(async () => {
    if (state === 'generating') return;
    setState('generating');
    try {
      const url = await getShareUrl();
      await copyText(url);
      setState('copied');
    } catch {
      setState('failed');
    }
    if (resetRef.current != null) {
      window.clearTimeout(resetRef.current);
    }
    resetRef.current = window.setTimeout(() => {
      setState('idle');
      resetRef.current = null;
    }, 2000);
  }, [copyText, getShareUrl, state]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void handleActivate();
    }
  };

  if (state === 'copied') {
    return <span className="share-confirmation">Copied!</span>;
  }

  if (state === 'failed') {
    return <span className="share-error">Copy failed</span>;
  }

  return (
    <span
      className={`share-cta ${state === 'generating' ? 'share-cta--generating' : ''}`}
      role="button"
      tabIndex={0}
      aria-busy={state === 'generating'}
      onClick={() => void handleActivate()}
      onKeyDown={onKeyDown}
    >
      {state === 'generating' ? 'Generating link…' : 'Copy share link'}
    </span>
  );
};

export default Share;
