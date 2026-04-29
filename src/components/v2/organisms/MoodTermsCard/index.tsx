import React from 'react';

import { Mood } from '../../../../helpers/types';

import { Select } from '../../atoms/Select';
import { ChipInput } from '../../molecules/ChipInput';

import styles from './MoodTermsCard.module.css';

export type MoodTermsCardProps = {
  moods: Mood[];
  activeMood: string;
  onActiveMoodChange: (v: string) => void;
  includeTags: string[];
  onIncludeTagsChange: (tags: string[]) => void;
};

export const MoodTermsCard: React.FC<MoodTermsCardProps> = ({
  moods,
  activeMood,
  onActiveMoodChange,
  includeTags,
  onIncludeTagsChange,
}) => {
  const options = moods.map((m) => ({ value: m.name, label: m.name }));

  return (
    <div className={styles.card}>
      <div className={styles.block}>
        <h2 className={styles.cardTitle}>
          <span className="material-symbols-outlined">auto_awesome</span>
          MOOD
        </h2>
        <Select options={options} value={activeMood} onChange={onActiveMoodChange} />
      </div>
      <div className={styles.block}>
        <h2 className={styles.cardTitle}>
          <span className="material-symbols-outlined">tag</span>
          SEARCH TERMS
        </h2>
        <ChipInput
          tags={includeTags}
          onTagsChange={onIncludeTagsChange}
          placeholder="Add term…"
          chipVariant="neutral"
          maxVisibleRows={2}
          helperText="Terms apply to titles (OR). Use Advanced relevance for boosts."
        />
      </div>
    </div>
  );
};
