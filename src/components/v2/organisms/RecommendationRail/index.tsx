import React, { useEffect, useRef, useState } from 'react';

import debug from '../../../../helpers/debug';
import { getLocalFavourites } from '../../../../helpers/favourites';
import type { RecommendedVideo } from '../../../../helpers/types';
import { canonicalVideoUrl } from '../../../../helpers/videoUrl';
import { VideoCard } from '../../molecules/VideoCard';
import { SectionHeader } from '../../molecules/SectionHeader';

import styles from './RecommendationRail.module.css';

const INITIAL_BATCH = 24;
const LOAD_MORE = 24;

export type RecommendationRailProps = {
  icon: string;
  title: string;
  subtitle?: string;
  videos: RecommendedVideo[];
  empty: string;
  onHide: (url: string) => void;
};

function metaLine(video: RecommendedVideo): string | undefined {
  const reason = video.reasons[0]?.trim();
  const date = video.date?.trim();
  const line = [reason, date].filter(Boolean).join(' · ');
  return line || undefined;
}

export const RecommendationRail: React.FC<RecommendationRailProps> = ({
  icon,
  title,
  subtitle,
  videos,
  empty,
  onHide,
}) => {
  const total = videos.length;
  const firstUrl = total > 0 ? videos[0].url : '';
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(() => Math.min(INITIAL_BATCH, total));
  const favourites = new Set(getLocalFavourites().map((url) => canonicalVideoUrl(url)));

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

  return (
    <section className={styles.section}>
      <SectionHeader icon={icon} title={title} subtitle={subtitle} />
      {total === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <>
          <div className={styles.grid}>
            {visible.map((video) => (
              <div className={styles.cardWrap} key={video.url}>
                <VideoCard
                  title={video.title}
                  thumbnailUrl={video.avatar}
                  duration={video.duration}
                  metaLine={metaLine(video)}
                  views={video.views}
                  relevance={Math.round(video.score)}
                  isPrivate={video.isPrivate}
                  isFavourite={favourites.has(canonicalVideoUrl(video.url))}
                  debug={debug}
                  onClick={() => window.open(video.url, '_blank', 'noopener,noreferrer')}
                />
                <button
                  type="button"
                  className={styles.hideBtn}
                  aria-label={`Hide ${video.title}`}
                  onClick={() => onHide(video.url)}
                >
                  <span className="material-symbols-outlined" aria-hidden>
                    visibility_off
                  </span>
                  Hide
                </button>
              </div>
            ))}
          </div>
          {visibleCount < total ? (
            <div ref={sentinelRef} className={styles.sentinel} aria-hidden>
              Loading more…
            </div>
          ) : null}
        </>
      )}
    </section>
  );
};
