import React from 'react';

import styles from './ToggleGroup.module.css';

export type ToggleOption<T extends string = string> = {
  value: T;
  label: string;
};

export type ToggleGroupProps<T extends string = string> = {
  label?: string;
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function ToggleGroup<T extends string = string>({
  label,
  options,
  value,
  onChange,
  className = '',
}: ToggleGroupProps<T>) {
  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.track} role="group" aria-label={label}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              className={[styles.segment, active ? styles.active : ''].filter(Boolean).join(' ')}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
