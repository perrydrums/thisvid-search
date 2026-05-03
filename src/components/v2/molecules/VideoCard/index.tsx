import React from 'react';

import styles from './VideoCard.module.css';

/** Same eye metaphor as classic `Result`: views insight icon. */
function ViewsEyeIcon() {
  return (
    <svg
      className={styles.eyeIcon}
      xmlns="http://www.w3.org/2000/svg"
      width="90"
      height="50"
      viewBox="0 0 90 50"
      aria-hidden
    >
      <g transform="translate(-5 -25)">
        <path
          fill="currentColor"
          d="M50,34A16,16,0,1,0,66,50,16.047,16.047,0,0,0,50,34Zm0,28A12,12,0,1,1,62,50,12.035,12.035,0,0,1,50,62ZM94.4,48.6l-8.6-8.7a50.458,50.458,0,0,0-71.6,0L5.6,48.6a1.933,1.933,0,0,0,0,2.8l8.6,8.7a50.458,50.458,0,0,0,71.6,0l8.6-8.7A1.933,1.933,0,0,0,94.4,48.6ZM83,57.3a46.595,46.595,0,0,1-66,0L9.8,50,17,42.7a46.595,46.595,0,0,1,66,0L90.2,50Z"
        />
      </g>
    </svg>
  );
}

function formatViewsCount(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export type VideoCardProps = {
  title: string;
  thumbnailUrl: string;
  duration?: string;
  /** Line under title (e.g. uploader · date) — no views (those are on the thumbnail). */
  metaLine?: string;
  views: number;
  relevance: number;
  isPrivate: boolean;
  /** Mirrors `helpers/debug` (`localhost` or `?debug=true`). */
  debug?: boolean;
  onClick?: () => void;
};

export const VideoCard: React.FC<VideoCardProps> = ({
  title,
  thumbnailUrl,
  duration,
  metaLine,
  views,
  relevance,
  isPrivate,
  debug = false,
  onClick,
}) => {
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.thumbWrap}>
        <img src={thumbnailUrl} alt="" className={styles.thumb} />
        {isPrivate && (
          <span className={styles.privateBadge} aria-label="Private video">
            <span className={`material-symbols-outlined ${styles.lockIcon}`} aria-hidden>
              lock
            </span>
            <span className={styles.privateBadgeLabel}>PRIVATE</span>
          </span>
        )}
        <span
          className={[styles.thumbCornerLeft, debug ? styles.thumbCornerRelevance : ''].join(' ').trim()}
        >
          {debug ? (
            <>Relevance: {relevance}</>
          ) : (
            <>
              <ViewsEyeIcon />
              {formatViewsCount(views)}
            </>
          )}
        </span>
        {duration && <span className={styles.duration}>{duration}</span>}
        <div className={styles.playOverlay} aria-hidden>
          <span className="material-symbols-outlined">play_circle</span>
        </div>
      </div>
      <div className={styles.textBlock}>
        <h3 className={styles.videoTitle}>{title}</h3>
        {metaLine && <p className={styles.meta}>{metaLine}</p>}
      </div>
    </button>
  );
};
