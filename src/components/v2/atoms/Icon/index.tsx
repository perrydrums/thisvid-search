import React from 'react';

import styles from './Icon.module.css';

export type IconProps = {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  filled?: boolean;
};

export const Icon: React.FC<IconProps> = ({ name, className = '', size = 'md', filled = false }) => {
  return (
    <span
      className={['material-symbols-outlined', styles.icon, styles[size], className].filter(Boolean).join(' ')}
      style={{ fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0" }}
      aria-hidden
    >
      {name}
    </span>
  );
};
