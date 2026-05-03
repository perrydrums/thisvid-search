import React, { useEffect, useRef, useState } from 'react';

import { getLocalFavourites } from '../../../../helpers/favourites';
import debug from '../../../../helpers/debug';
import { Video } from '../../../../helpers/types';

import { VideoCard } from '../../molecules/VideoCard';
import { SectionHeader } from '../../molecules/SectionHeader';

import styles from './ResultsPreviewGrid.module.css';

const INITIAL_BATCH = 24;
const LOAD_MORE = 24;

export type ResultsPreviewGridProps = {
  videos: Video[];
  /** Profile display name for the active search user (when in user mode). */
  username?: string;
  /** Same values as classic /search Sort by control. */
  sort: string;
  onSortChange: (sort: string) => void;
};

function metaLine(username: string | undefined, date: string | undefined): string | undefined {
  const parts = [username?.trim(), date?.trim()].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export const ResultsPreviewGrid: React.FC<ResultsPreviewGridProps> = ({
  videos,
  username,
  sort,
  onSortChange,
}) => {
  const total = videos.length;
  const firstUrl = total > 0 ? videos[0].url : '';
  const favourites = new Set(getLocalFavourites());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(() => Math.min(INITIAL_BATCH, total));

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
  const subtitle =
    total === 0
      ? 'No results yet — run a search to load videos.'
      : `${total} result${total !== 1 ? 's' : ''} (scroll loads more)`;

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
      <SectionHeader icon="preview" title="RESULTS" subtitle={subtitle} action={sortBy} />
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
                metaLine={metaLine(username, v.date)}
                views={v.views}
                relevance={v.relevance}
                isPrivate={v.isPrivate}
                isFavourite={favourites.has(v.url)}
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
