import React from 'react';

import { Icon } from '../../atoms/Icon';

import styles from './SectionHeader.module.css';

export type SectionHeaderProps = {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  subtitle,
  action,
  className = '',
}) => {
  return (
    <div className={[styles.row, className].filter(Boolean).join(' ')}>
      <div className={styles.left}>
        {icon && <Icon name={icon} size="sm" className={styles.icon} />}
        <div>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};
