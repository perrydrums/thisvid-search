import React from 'react';
import { Tooltip } from 'react-tooltip';

import styles from './Header.module.css';

type HeaderProps = {
  backButtonUrl?: string;
  showPreferences?: boolean;
  /** Optional external “link in bio” URL (e.g. Linktree), opens in a new tab */
  linktreeUrl?: string;
};

const Header = ({ backButtonUrl, showPreferences = false, linktreeUrl }: HeaderProps) => {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        {backButtonUrl && (
          <a className={styles.backButton} href={backButtonUrl}>
            ←
          </a>
        )}
      </div>
      <div className={styles.headerCenter}>
        <span className={styles.title}>
          <a href="/">ThisVid Advanced Search Site</a>
          <span className={styles.infoIcon} data-tooltip-id="info">
            ⓘ
          </span>
          <Tooltip clickable={true} id="info" className="label-tooltip" place="bottom">
            Need help, found a bug or are interested in how this site works?{' '}
            <a style={{ color: 'white' }} href="mailto:psperryjanssen@gmail.com">
              <b>Send me an email!</b>
            </a>
          </Tooltip>
        </span>
      </div>
      <div className={styles.headerRight}>
        {linktreeUrl && (
          <>
            <a
              className={styles.followButton}
              href={linktreeUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Reach out and follow the creator — opens Linktree in a new tab"
              data-tooltip-id="creator-link"
            >
              Who made this?
            </a>
            <Tooltip id="creator-link" className="label-tooltip label-tooltip-wide" place="bottom">
              Reach out, follow along, and explore my other links (opens in a new tab).
            </Tooltip>
          </>
        )}
        {showPreferences && (
          <a className={styles.preferences} href="/settings">
            ⚙
          </a>
        )}
      </div>
    </div>
  );
};

export default Header;
