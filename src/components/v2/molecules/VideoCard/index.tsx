import React from 'react';

import styles from './VideoCard.module.css';

export type VideoCardProps = {
  title: string;
  thumbnailUrl: string;
  duration?: string;
  metaLine?: string;
  onClick?: () => void;
};

export const VideoCard: React.FC<VideoCardProps> = ({
  title,
  thumbnailUrl,
  duration,
  metaLine,
  onClick,
}) => {
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.thumbWrap}>
        <img src={thumbnailUrl} alt="" className={styles.thumb} />
        {duration && <span className={styles.duration}>{duration}</span>}
        <div className={styles.playOverlay} aria-hidden>
          <span className="material-symbols-outlined">play_circle</span>
        </div>
      </div>
      <h3 className={styles.videoTitle}>{title}</h3>
      {metaLine && <p className={styles.meta}>{metaLine}</p>}
    </button>
  );
};
