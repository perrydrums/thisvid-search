import React from 'react';

import styles from './RangeSlider.module.css';

export type RangeSliderProps = {
  min?: number;
  max?: number;
  value: number;
  onChange: (value: number) => void;
  id?: string;
  className?: string;
};

export const RangeSlider: React.FC<RangeSliderProps> = ({
  min = 0,
  max = 180,
  value,
  onChange,
  id,
  className = '',
}) => {
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={[styles.slider, className].filter(Boolean).join(' ')}
    />
  );
};
