import React from 'react';

import { Category } from '../../../../helpers/types';

import { Input } from '../../atoms/Input';
import { RangeSlider } from '../../atoms/RangeSlider';
import { ChipInput } from '../../molecules/ChipInput';
import { ToggleGroup } from '../../molecules/ToggleGroup';

import type { SearchMode } from '../Sidebar';

import styles from './PrimaryParametersCard.module.css';

type TypeOption = { value: string; label: string };

export type PrimaryParametersCardProps = {
  mode: SearchMode;
  userIds: string[];
  onUserIdsChange: (ids: string[]) => void;
  minDuration: number;
  onMinDurationChange: (n: number) => void;
  typeOptions: TypeOption[];
  type: string;
  onTypeChange: (v: string) => void;
  primaryTag: string;
  onPrimaryTagChange: (v: string) => void;
  categories: Category[];
  category: string;
  categoryType: string;
  onPickCategoryType: (v: 'straight' | 'gay') => void;
  onCategorySlugChange: (slug: string) => void;
  /** User mode — chip shows resolved profile name + ID (tags still raw IDs). */
  resolveUserChipDisplay?: (userId: string) => string;
};

export const PrimaryParametersCard: React.FC<PrimaryParametersCardProps> = ({
  mode,
  userIds,
  onUserIdsChange,
  minDuration,
  onMinDurationChange,
  typeOptions,
  type,
  onTypeChange,
  primaryTag,
  onPrimaryTagChange,
  categories,
  category,
  categoryType,
  onPickCategoryType,
  onCategorySlugChange,
  resolveUserChipDisplay,
}) => {
  const durationLabel = minDuration >= 60 ? `${Math.floor(minDuration / 60)}h${minDuration % 60}m` : `${minDuration}m`;

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>
        <span className="material-symbols-outlined">search</span>
        PRIMARY PARAMETERS
      </h2>

      {mode === 'user' && (
        <ChipInput
          label="Target User IDs"
          tags={userIds}
          onTagsChange={onUserIdsChange}
          resolveChipDisplay={resolveUserChipDisplay}
          placeholder="Add ID..."
          chipVariant="primary"
        />
      )}

      {mode === 'tags' && (
        <div className={styles.field}>
          <label className={styles.lbl} htmlFor="v2-primary-tag">
            Primary Tag
          </label>
          <Input
            id="v2-primary-tag"
            inputSize="medium"
            value={primaryTag}
            placeholder="tag-name"
            onChange={(e) => onPrimaryTagChange(e.target.value.toLowerCase())}
          />
        </div>
      )}

      {mode === 'extreme' && (
        <div className={styles.field}>
          <label className={styles.lbl} htmlFor="v2-extreme-q">
            Search
          </label>
          <Input
            id="v2-extreme-q"
            inputSize="medium"
            value={primaryTag}
            placeholder="Query…"
            onChange={(e) => onPrimaryTagChange(e.target.value.toLowerCase())}
          />
        </div>
      )}

      {mode === 'category' && (
        <div className={styles.field}>
          <label className={styles.lbl}>Category</label>
          {!category ? (
            <div className={styles.categoryPick}>
              <select
                className={styles.nativeSelect}
                value={categoryType}
                required
                onChange={(e) => onPickCategoryType(e.target.value as 'straight' | 'gay')}
              >
                <option value="">— Orientation —</option>
                <option value="straight">Straight</option>
                <option value="gay">Gay</option>
              </select>
              {categoryType && (
                <div className={styles.categoryList}>
                  {categories.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      className={styles.categoryBtn}
                      onClick={() => onCategorySlugChange(c.slug)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button type="button" className={styles.chosenCat} onClick={() => onCategorySlugChange('')}>
              {categories.find((x) => x.slug === category)?.name || category}{' '}
              <span className={styles.changeHint}>Change</span>
            </button>
          )}
        </div>
      )}

      <div className={styles.row2}>
        <div className={styles.durationBlock}>
          <label className={styles.lbl} htmlFor="v2-min-dur">
            Minimal Duration (min)
          </label>
          <div className={styles.sliderRow}>
            <RangeSlider id="v2-min-dur" min={0} max={180} value={minDuration} onChange={onMinDurationChange} />
            <span className={styles.durBadge} aria-live="polite">
              {durationLabel}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.togglesRow}>
        <ToggleGroup
          label="Type"
          options={typeOptions.map((o) => ({ value: o.value, label: o.label }))}
          value={type}
          onChange={onTypeChange}
        />
      </div>
    </div>
  );
};
