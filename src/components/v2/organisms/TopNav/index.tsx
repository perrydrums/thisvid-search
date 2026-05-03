import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';

import type { AppSidebarActivePage } from '../../appNavigation';
import { APP_NAV_ITEMS } from '../../appNavigation';

import styles from './TopNav.module.css';

/** Matches `Search/index.tsx` — opens creator links in a new tab. */
const CREATOR_LINKTREE_URL = 'https://linktr.ee/sdaynoam';

function activePageFromPath(pathname: string): AppSidebarActivePage | null {
  if (pathname.startsWith('/search-v2')) return 'search';
  if (pathname.startsWith('/moods')) return 'moods';
  if (pathname.startsWith('/history')) return 'history';
  if (pathname.startsWith('/settings')) return 'settings';
  return null;
}

export type TopNavProps = {
  /** Centered "Search history..." filter field (desktop) */
  variant?: 'default' | 'historySearch';
};

export const TopNav: React.FC<TopNavProps> = ({ variant = 'default' }) => {
  const { pathname } = useLocation();
  const activeNav = activePageFromPath(pathname);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktopSidebar, setIsDesktopSidebar] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  );

  const closeMenu = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      const wide = mq.matches;
      setIsDesktopSidebar(wide);
      if (wide) setMobileMenuOpen(false);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen, closeMenu]);

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
          {isDesktopSidebar && (
            <>
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
            </>
          )}

          <button
            type="button"
            className={styles.hamburgerBtn}
            aria-expanded={mobileMenuOpen}
            aria-controls="v2-mobile-nav"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileMenuOpen((o) => !o)}
          >
            <span className="material-symbols-outlined" aria-hidden>
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className={styles.menuBackdrop}
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div
            id="v2-mobile-nav"
            className={styles.menuPanel}
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
          >
            <nav aria-label="App">
              <ul className={styles.menuUl}>
                {APP_NAV_ITEMS.map((item) => (
                  <li key={item.page}>
                    <Link
                      to={item.to}
                      className={[
                        styles.menuLink,
                        activeNav === item.page ? styles.menuLinkActive : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-current={activeNav === item.page ? 'page' : undefined}
                      onClick={closeMenu}
                    >
                      <span className={[styles.menuIco, 'material-symbols-outlined'].join(' ')} aria-hidden>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </>
      )}
    </header>
  );
};
