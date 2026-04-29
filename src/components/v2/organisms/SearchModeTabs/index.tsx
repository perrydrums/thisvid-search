import React from 'react';

import { Icon } from '../../atoms/Icon';

import styles from './SearchModeTabs.module.css';

import type { SearchMode } from '../Sidebar';

export type SearchModeTabsProps = {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
};

const tabs: { mode: SearchMode; icon: string; label: string }[] = [
  { mode: 'user', icon: 'person', label: 'User ID' },
  { mode: 'category', icon: 'category', label: 'Category' },
  { mode: 'tags', icon: 'tag', label: 'Tag' },
  { mode: 'extreme', icon: 'bolt', label: 'Extreme' },
];

export const SearchModeTabs: React.FC<SearchModeTabsProps> = ({ mode, onModeChange }) => {
  return (
    <div className={styles.wrap} role="tablist" aria-label="Search mode">
      {tabs.map((t) => {
        const active = t.mode === mode;
        return (
          <button
            key={t.mode}
            type="button"
            role="tab"
            aria-selected={active}
            className={[styles.tab, active ? styles.active : ''].filter(Boolean).join(' ')}
            onClick={() => onModeChange(t.mode)}
          >
            <Icon name={t.icon} size="md" />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
};
