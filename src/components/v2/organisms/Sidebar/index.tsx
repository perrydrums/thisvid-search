import React from 'react';

import { Button } from '../../atoms/Button';
import { NavItem } from '../../molecules/NavItem';

import styles from './Sidebar.module.css';

export type SearchMode = 'user' | 'category' | 'tags' | 'extreme';

export type SidebarProps = {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
};

const items: { mode: SearchMode; icon: string; label: string }[] = [
  { mode: 'user', icon: 'person_search', label: 'User Search' },
  { mode: 'category', icon: 'category', label: 'Categories' },
  { mode: 'tags', icon: 'sell', label: 'Tags' },
  { mode: 'extreme', icon: 'warning', label: 'Extreme' },
];

export const Sidebar: React.FC<SidebarProps> = ({ mode, onModeChange }) => {
  return (
    <aside className={styles.aside}>
      <div className={styles.status}>
        <div className={styles.statusRow}>
          <span className={styles.dot} aria-hidden />
          <span className={styles.statusTitle}>Scraper Dashboard</span>
        </div>
        <p className={styles.statusSub}>High Performance Mode</p>
      </div>

      <nav className={styles.nav} aria-label="Search modes">
        {items.map((item) => (
          <NavItem
            key={item.mode}
            icon={item.icon}
            label={item.label}
            active={mode === item.mode}
            onClick={() => onModeChange(item.mode)}
          />
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.quick}>
          <span className={styles.quickLabel}>Quick Actions</span>
          <button type="button" className={styles.quickBtn} disabled title="Coming soon">
            <span className="material-symbols-outlined">auto_awesome</span>
            <span>Mood Presets</span>
          </button>
        </div>
        <Button variant="primary" fullWidth disabled title="Coming soon">
          Save Preset
        </Button>
      </div>
    </aside>
  );
};
