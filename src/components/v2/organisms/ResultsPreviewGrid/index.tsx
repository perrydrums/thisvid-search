import React, { useEffect, useMemo, useRef, useState } from 'react';

import { getLocalFavourites } from '../../../../helpers/favourites';
import {
  getLocalFriendIds,
  isFriendMemberId,
  resolveVideoMemberId,
} from '../../../../helpers/friendIds';
import debug from '../../../../helpers/debug';
import { Video } from '../../../../helpers/types';

import { Button } from '../../atoms/Button';
import { VideoCard } from '../../molecules/VideoCard';
import { SectionHeader } from '../../molecules/SectionHeader';

import styles from './ResultsPreviewGrid.module.css';

const INITIAL_BATCH = 24;
const LOAD_MORE = 24;

export type ResultsPreviewGridProps = {
  videos: Video[];
  /** Same values as classic /search sort control. */
  sort: string;
  onSortChange: (sort: string) => void;
  /** Resolves to a short public share URL (`/s/{code}`). */
  getShareUrl: () => Promise<string>;
  /** After the latest search run has completed, header shows FOUND count instead of RESULTS. */
  searchFinished: boolean;
  /** Comma-separated ThisVid member IDs (from Settings sync); falls back to localStorage. */
  friendIdsCsv?: string;
  /** Listing owner when searching a member's public/private videos (not favourites). */
  listingMemberId?: string;
  /** Profile owner when browsing favourite listings — excluded from uploader resolution. */
  favouriteListingOwnerId?: string;
};

function metaLine(date: string | undefined): string | undefined {
  const trimmed = date?.trim();
  return trimmed || undefined;
}

export const ResultsPreviewGrid: React.FC<ResultsPreviewGridProps> = ({
  videos,
  sort,
  onSortChange,
  getShareUrl,
  searchFinished,
  friendIdsCsv,
  listingMemberId = '',
  favouriteListingOwnerId = '',
}) => {
  const total = videos.length;
  const firstUrl = total > 0 ? videos[0].url : '';
  const favourites = new Set(getLocalFavourites());
  const friendIds = useMemo(() => {
    const raw = friendIdsCsv?.trim()
      ? friendIdsCsv.split(',').map((s) => s.trim()).filter(Boolean)
      : getLocalFriendIds();
    return new Set(raw);
  }, [friendIdsCsv]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const copyResetRef = useRef<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(() => Math.min(INITIAL_BATCH, total));
  const [copyState, setCopyState] = useState<'idle' | 'generating' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    return () => {
      if (copyResetRef.current != null) {
        window.clearTimeout(copyResetRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setVisibleCount(Math.min(INITIAL_BATCH, total));
  }, [total, firstUrl]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || total === 0 || visibleCount >= total) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setVisibleCount((prev) => Math.min(prev + LOAD_MORE, total));
        });
      },
      { root: null, rootMargin: '280px 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [total, visibleCount, firstUrl]);

  const visible = videos.slice(0, visibleCount);

  const headerTitle = searchFinished
    ? `FOUND ${total} ${total === 1 ? 'VIDEO' : 'VIDEOS'}`
    : 'RESULTS';

  const handleCopyShare = async () => {
    setCopyState('generating');
    try {
      const url = await getShareUrl();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    if (copyResetRef.current != null) {
      window.clearTimeout(copyResetRef.current);
    }
    copyResetRef.current = window.setTimeout(() => {
      setCopyState('idle');
      copyResetRef.current = null;
    }, 2000);
  };

  const copyShare = (
    <Button
      variant="ghost"
      size="small"
      className={styles.copyShareBtn}
      type="button"
      disabled={copyState === 'generating'}
      onClick={() => void handleCopyShare()}
    >
      {copyState === 'generating'
        ? 'Generating link…'
        : copyState === 'copied'
        ? 'Copied!'
        : copyState === 'failed'
        ? 'Copy failed'
        : 'Copy share link'}
    </Button>
  );

  const sortBy = (
    <div className={styles.sortBy}>
      <label className={styles.sortLabel} htmlFor="v2-results-sort">
        Sort by
      </label>
      <select
        id="v2-results-sort"
        className={styles.sortSelect}
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
      >
        <option value="relevance">Relevance</option>
        <option value="views">Views</option>
        <option value="viewsAsc">Least views</option>
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="longest">Longest</option>
        <option value="shortest">Shortest</option>
      </select>
    </div>
  );

  return (
    <section className={styles.section} id="v2-results">
      <SectionHeader
        icon="preview"
        title={headerTitle}
        center={copyShare}
        action={sortBy}
      />
      {total === 0 ? (
        <p className={styles.empty}>Nothing to show yet.</p>
      ) : (
        <>
          <div className={styles.grid}>
            {visible.map((v) => (
              <VideoCard
                key={v.url}
                title={v.title}
                thumbnailUrl={v.avatar}
                duration={v.duration}
                metaLine={metaLine(v.date)}
                views={v.views}
                relevance={v.relevance}
                isPrivate={v.isPrivate}
                isFavourite={favourites.has(v.url)}
                isPrivateWatchable={
                  v.isPrivate &&
                  isFriendMemberId(
                    resolveVideoMemberId(v, listingMemberId, favouriteListingOwnerId),
                    friendIds,
                  )
                }
                debug={debug}
                onClick={() => window.open(v.url, '_blank', 'noopener,noreferrer')}
              />
            ))}
          </div>
          {visibleCount < total && (
            <div ref={sentinelRef} className={styles.sentinel} aria-hidden>
              Loading more…
            </div>
          )}
        </>
      )}
    </section>
  );
};
