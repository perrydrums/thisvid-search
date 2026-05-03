import React from 'react';
import { Link } from 'react-router-dom';

import styles from './AppSidebar.module.css';

export type AppSidebarActivePage = 'search' | 'moods' | 'history' | 'settings';

export type AppSidebarProps = {
  activePage: AppSidebarActivePage;
};

const NAV: { page: AppSidebarActivePage; to: string; icon: string; label: string }[] = [
  { page: 'search', to: '/search-v2', icon: 'search', label: 'Search' },
  { page: 'moods', to: '/moods', icon: 'mood', label: 'Moods' },
  { page: 'history', to: '/history', icon: 'history', label: 'History' },
  { page: 'settings', to: '/settings', icon: 'settings', label: 'Settings' },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({ activePage }) => {
  return (
    <aside className={styles.aside}>
      <div className={styles.brand}>
        <Link to="/search-v2" className={styles.logo}>
          ThisVid Advanced Search Site
        </Link>
      </div>

      <nav className={styles.nav} aria-label="App">
        <ul className={styles.ul}>
          {NAV.map((item) => (
            <li key={item.page}>
              <Link
                to={item.to}
                className={[styles.link, activePage === item.page ? styles.linkActive : ''].filter(Boolean).join(' ')}
                aria-current={activePage === item.page ? 'page' : undefined}
              >
                <span className={[styles.ico, 'material-symbols-outlined'].join(' ')} aria-hidden>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
