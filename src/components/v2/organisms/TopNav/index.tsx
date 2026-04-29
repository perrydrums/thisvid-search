import React from 'react';
import { Link } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';

import styles from './TopNav.module.css';

/** Matches `Search/index.tsx` — opens creator links in a new tab. */
const CREATOR_LINKTREE_URL = 'https://linktr.ee/sdaynoam';

export type TopNavProps = {
  /** Centered "Search history..." filter field (desktop) */
  variant?: 'default' | 'historySearch';
};

export const TopNav: React.FC<TopNavProps> = ({ variant = 'default' }) => {
  return (
    <header className={styles.header} data-variant={variant}>
      <div className={styles.bar}>
        <div className={styles.left}>
          <Link className={styles.logo} to="/search-v2">
            ThisVid Advanced Search Site
          </Link>
        </div>

        {variant === 'historySearch' && (
          <div className={styles.searchWrap}>
            <span className={[styles.searchIcon, 'material-symbols-outlined'].join(' ')} aria-hidden>
              search
            </span>
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search history…"
              aria-label="Search history"
            />
          </div>
        )}

        <div className={styles.right}>
          <a
            className={styles.creatorBtn}
            href={CREATOR_LINKTREE_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-tooltip-id="v2-creator-link"
          >
            Who made this?
          </a>
          <Tooltip id="v2-creator-link" className="label-tooltip label-tooltip-wide" place="bottom">
            Reach out, follow along, and explore my other links (opens in a new tab).
          </Tooltip>
        </div>
      </div>
    </header>
  );
};
