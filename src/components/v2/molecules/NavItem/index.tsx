import React from 'react';

import { Icon } from '../../atoms/Icon';

import styles from './NavItem.module.css';

export type NavItemProps = {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export const NavItem: React.FC<NavItemProps> = ({ icon, label, active = false, onClick }) => {
  return (
    <button type="button" className={[styles.item, active ? styles.active : ''].join(' ')} onClick={onClick}>
      <Icon name={icon} size="md" />
      <span className={styles.label}>{label}</span>
    </button>
  );
};
