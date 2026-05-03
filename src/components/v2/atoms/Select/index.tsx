import React from 'react';

import styles from './Select.module.css';

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectProps = {
  id?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
};

export const Select: React.FC<SelectProps> = ({
  id,
  options,
  value,
  onChange,
  className = '',
  disabled,
}) => {
  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <select
        id={id}
        className={styles.select}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value || 'empty'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="material-symbols-outlined v2-select-chevron" aria-hidden>
        expand_more
      </span>
    </div>
  );
};
