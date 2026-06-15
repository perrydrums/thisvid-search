import React from 'react';

import styles from './Switch.module.css';

export type SwitchProps = {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
};

export const Switch: React.FC<SwitchProps> = ({
  id,
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
}) => {
  const switchId = id ?? `switch-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <label className={[styles.root, className].filter(Boolean).join(' ')} htmlFor={switchId}>
      <span className={styles.label}>{label}</span>
      <input
        id={switchId}
        type="checkbox"
        role="switch"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.track} aria-hidden>
        <span className={styles.thumb} />
      </span>
    </label>
  );
};
