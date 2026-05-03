import React from 'react';

import styles from './Badge.module.css';

export type BadgeVariant = 'default' | 'success' | 'muted';

export type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  return (
    <span className={[styles.badge, styles[variant], className].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
};
