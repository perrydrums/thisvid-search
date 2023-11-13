import React from 'react';

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
