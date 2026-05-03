import React, { type ReactNode } from 'react';

import { Icon } from '../../atoms/Icon';

import styles from './SectionHeader.module.css';

export type SectionHeaderProps = {
  icon?: string;
  title: ReactNode;
  subtitle?: string;
  /** Middle column (e.g. between title and trailing controls). */
  center?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  subtitle,
  center,
  action,
  className = '',
}) => {
  return (
    <div
      className={[
        styles.row,
        center ? styles.rowThreeCols : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.left}>
        {icon && <Icon name={icon} size="sm" className={styles.icon} />}
        <div>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {center !== undefined && center !== null ? <div className={styles.center}>{center}</div> : null}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};
