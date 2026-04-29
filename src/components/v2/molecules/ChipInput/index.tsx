import React, { KeyboardEvent, useCallback, useState } from 'react';

import { Chip } from '../../atoms/Chip';
import { Input } from '../../atoms/Input';

import styles from './ChipInput.module.css';

export type ChipInputProps = {
  id?: string;
  label?: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  /** If set, shown on chips instead of the raw tag text (still keyed/removable by raw tag value). */
  resolveChipDisplay?: (tag: string) => string;
  placeholder?: string;
  chipVariant?: 'primary' | 'neutral';
  helperText?: string;
  className?: string;
  tone?: 'default' | 'inverse';
  /** When set to 2, field height is limited to about two rows of tags, then scrolls vertically. */
  maxVisibleRows?: 2;
};

export const ChipInput: React.FC<ChipInputProps> = ({
  id,
  label,
  tags,
  onTagsChange,
  resolveChipDisplay,
  placeholder = 'Add…',
  chipVariant = 'neutral',
  helperText,
  className = '',
  tone = 'default',
  maxVisibleRows,
}) => {
  const [draft, setDraft] = useState('');

  const addTag = useCallback(
    (raw: string) => {
      const t = raw.trim();
      if (!t || tags.includes(t)) return;
      onTagsChange([...tags, t]);
      setDraft('');
    },
    [tags, onTagsChange],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onTagsChange(tags.slice(0, -1));
    }
  };

  return (
    <div
      className={[styles.root, tone === 'inverse' ? styles.inverse : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <div
        className={[
          styles.field,
          maxVisibleRows === 2 ? styles.fieldMaxRows2 : '',
        ]
          .filter(Boolean)
          .join(' ')}
        id={id}
      >
        {tags.map((tag) => {
          const chipLabel = resolveChipDisplay ? resolveChipDisplay(tag) : tag;
          return (
            <Chip
              key={tag}
              label={chipLabel}
              variant={chipVariant}
              onRemove={() => onTagsChange(tags.filter((x) => x !== tag))}
            />
          );
        })}
        <Input
          className={styles.input}
          inputSize="medium"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) addTag(draft);
          }}
        />
      </div>
      {helperText && <p className={styles.helper}>{helperText}</p>}
    </div>
  );
};
