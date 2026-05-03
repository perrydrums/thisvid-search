import React, { useState } from 'react';

import { ChipInput } from '../../molecules/ChipInput';

import styles from './AdvancedScoringSection.module.css';

export type AdvancedScoringSectionProps = {
  boosterTags: string[];
  onBoosterChange: (t: string[]) => void;
  diminishingTags: string[];
  onDiminishingChange: (t: string[]) => void;
  excludeTags: string[];
  onExcludeChange: (t: string[]) => void;
};

export const AdvancedScoringSection: React.FC<AdvancedScoringSectionProps> = ({
  boosterTags,
  onBoosterChange,
  diminishingTags,
  onDiminishingChange,
  excludeTags,
  onExcludeChange,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <button type="button" className={styles.head} onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className={styles.headLabel}>
          <span className="material-symbols-outlined">psychology</span>
          ADVANCED RELEVANCE SCORING
        </span>
        <span
          className={['material-symbols-outlined', styles.chev, open ? styles.chevOpen : ''].join(' ')}
          aria-hidden
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.decor} aria-hidden>
            <span className="material-symbols-outlined">tune</span>
          </div>
          <div className={styles.cols}>
            <div>
              <div className={styles.colTitle}>
                <span className={`material-symbols-outlined ${styles.boostIcon}`}>add_circle</span>
                Booster terms (+)
              </div>
              <ChipInput tone="inverse" placeholder="Boost…" tags={boosterTags} onTagsChange={onBoosterChange} />
            </div>
            <div>
              <div className={styles.colTitle}>
                <span className={`material-symbols-outlined ${styles.dimIcon}`}>remove_circle</span>
                Diminishing terms (−)
              </div>
              <ChipInput tone="inverse" placeholder="Demote…" tags={diminishingTags} onTagsChange={onDiminishingChange} />
            </div>
            <div>
              <div className={styles.colTitle}>
                <span className={`material-symbols-outlined ${styles.exIcon}`}>cancel</span>
                Exclusion terms
              </div>
              <ChipInput tone="inverse" placeholder="Exclude…" tags={excludeTags} onTagsChange={onExcludeChange} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
