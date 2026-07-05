import React from 'react';

import { Category } from '../../../../helpers/types';

import { Input } from '../../atoms/Input';
import { DurationRangeSlider } from '../../atoms/DurationRangeSlider';
import { DurationRangeBadge } from '../../molecules/DurationRangeBadge';
import { ChipInput } from '../../molecules/ChipInput';
import { ToggleGroup } from '../../molecules/ToggleGroup';

import type { SearchMode } from '../../searchMode';

import styles from './PrimaryParametersCard.module.css';

type TypeOption = { value: string; label: string };

export type PrimaryParametersCardProps = {
  mode: SearchMode;
  userIds: string[];
  onUserIdsChange: (ids: string[]) => void;
  /** Minimum duration in seconds. */
  minDuration: number;
  /** Maximum duration in seconds; `null` = 1h+. */
  maxDuration: number | null;
  onDurationRangeChange: (min: number, max: number | null) => void;
  typeOptions: TypeOption[];
  type: string;
  onTypeChange: (v: string) => void;
  primaryTag: string;
  onPrimaryTagChange: (v: string) => void;
  categories: Category[];
  category: string;
  categoryType: string;
  onPickCategoryType: (v: string) => void;
  onCategorySlugChange: (slug: string) => void;
  /** User mode — chip shows resolved profile name + ID (tags still raw IDs). */
  resolveUserChipDisplay?: (userId: string) => string;
};

export const PrimaryParametersCard: React.FC<PrimaryParametersCardProps> = ({
  mode,
  userIds,
  onUserIdsChange,
  minDuration,
  maxDuration,
  onDurationRangeChange,
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
                onChange={(e) => onPickCategoryType(e.target.value)}
              >
                <option value="">— Orientation —</option>
                <option value="straight">Straight</option>
                <option value="gay">Gay</option>
              </select>
              {categoryType ? (
                <>
                  <p className={styles.categoryPickerHint}>Select a category</p>
                  <div className={styles.categoryScroll}>
                    <div className={styles.categoryGrid}>
                      {categories.map((c) => (
                        <button
                          key={c.slug}
                          type="button"
                          className={styles.categoryTile}
                          onClick={() => onCategorySlugChange(c.slug)}
                        >
                          <div className={styles.categoryThumbWrap}>
                            {c.image ? (
                              <img
                                className={styles.categoryThumb}
                                src={c.image}
                                alt=""
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className={styles.categoryThumbPlaceholder} aria-hidden />
                            )}
                          </div>
                          <span className={styles.categoryTileTitle}>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <button type="button" className={styles.chosenCat} onClick={() => onCategorySlugChange('')}>
              {(() => {
                const sel = categories.find((x) => x.slug === category);
                return (
                  <>
                    {sel?.image ? (
                      <span
                        className={styles.chosenThumb}
                        style={{ backgroundImage: `url(${sel.image})` }}
                        role="presentation"
                      />
                    ) : (
                      <span className={[styles.chosenThumb, styles.chosenThumbFallback].join(' ')} role="presentation" />
                    )}
                    <span className={styles.chosenCatLabel}>
                      <span className={styles.chosenCatTitle}>{sel?.name || category}</span>
                      <span className={styles.changeHint}>CHANGE</span>
                    </span>
                  </>
                );
              })()}
            </button>
          )}
        </div>
      )}

      <div className={styles.row2}>
        <div className={styles.durationBlock}>
          <label className={styles.lbl} htmlFor="v2-duration-range">
            Duration
          </label>
          <div className={styles.durationRow}>
            <div className={styles.durationSliderCol}>
              <DurationRangeSlider
                id="v2-duration-range"
                valueMin={minDuration}
                valueMax={maxDuration}
                onChange={onDurationRangeChange}
              />
              <div className={styles.durationTicks}>
                <span>0</span>
                <span>30m</span>
                <span>1h+</span>
              </div>
            </div>
            <div className={styles.durationInputCol}>
              <DurationRangeBadge
                id="v2-duration-input"
                minSeconds={minDuration}
                maxSeconds={maxDuration}
                onChange={onDurationRangeChange}
              />
            </div>
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
