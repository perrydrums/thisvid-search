import React from 'react';

import styles from './TopNav.module.css';

export type TopNavProps = {
  active?: 'dashboard';
};

/** Header for v2 dashboard — skips History/Library actions per redesign scope */
export const TopNav: React.FC<TopNavProps> = () => {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <a className={styles.logo} href="/search-v2">
          V-Search Pro
        </a>
        <nav className={styles.nav} aria-label="Primary">
          <span className={styles.navActive}>Dashboard</span>
          <span className={styles.navDisabled} title="Coming soon">
            History
          </span>
          <span className={styles.navDisabled} title="Coming soon">
            Library
          </span>
        </nav>
      </div>
      <div className={styles.right}>
        <a className={styles.prefs} href="/preferences" title="Preferences" aria-label="Preferences">
          <span className="material-symbols-outlined">settings</span>
        </a>
      </div>
    </header>
  );
};
