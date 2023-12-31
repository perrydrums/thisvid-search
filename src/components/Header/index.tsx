import React from 'react';
import { Tooltip } from 'react-tooltip';

import styles from './Header.module.css';

type HeaderProps = {
  backButtonUrl?: string;
  showPreferences?: boolean;
};

const Header = ({ backButtonUrl, showPreferences = false }: HeaderProps) => {
  return (
    <div className={styles.header}>
      <span className={styles.title}>
        {backButtonUrl && (
          <a className={styles.backButton} href={backButtonUrl}>
            ←
          </a>
        )}
      </span>
      <span className={styles.title}>
        <a href="/">ThisVid Advanced Search Site</a>
        <a style={{ fontWeight: 'bolder' }} data-tooltip-id="info">
          &nbsp;ⓘ
        </a>
        <Tooltip clickable={true} id="info" className="label-tooltip" place="bottom">
          Need help, found a bug or are interested in how this site works?{' '}
          <a style={{ color: 'white' }} href="mailto:psperryjanssen@gmail.com">
            <b>Send me an email!</b>
          </a>
        </Tooltip>
      </span>
      <span className={styles.title}>
        {showPreferences && (
          <a className={styles.preferences} href="/preferences">
            ⚙
          </a>
        )}
      </span>
    </div>
  );
};

export default Header;
