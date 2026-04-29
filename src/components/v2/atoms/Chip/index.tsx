import React from 'react';

import styles from './Chip.module.css';

export type ChipVariant = 'primary' | 'neutral' | 'tertiary';

export type ChipProps = {
  label: string;
  variant?: ChipVariant;
  onRemove?: () => void;
  className?: string;
};

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'neutral',
  onRemove,
  className = '',
}) => {
  return (
    <span className={[styles.chip, styles[variant], className].filter(Boolean).join(' ')}>
      <span className={styles.label}>{label}</span>
      {onRemove && (
        <button type="button" className={styles.remove} onClick={onRemove} aria-label={`Remove ${label}`}>
          <span className="material-symbols-outlined" aria-hidden>
            close
          </span>
        </button>
      )}
    </span>
  );
};
