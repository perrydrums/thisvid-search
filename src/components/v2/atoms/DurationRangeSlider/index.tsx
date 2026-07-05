import React, { useCallback, useMemo } from 'react';

import { DURATION_SLIDER_MAX_SECONDS } from '../../../../helpers/duration';

import styles from './DurationRangeSlider.module.css';

export type DurationRangeSliderProps = {
  min?: number;
  max?: number;
  /** Minimum duration in seconds. */
  valueMin: number;
  /** Maximum duration in seconds; `null` = 1h+ (no upper cap). */
  valueMax: number | null;
  onChange: (min: number, max: number | null) => void;
  id?: string;
  className?: string;
};

export const DurationRangeSlider: React.FC<DurationRangeSliderProps> = ({
  min = 0,
  max = DURATION_SLIDER_MAX_SECONDS,
  valueMin,
  valueMax,
  onChange,
  id,
  className = '',
}) => {
  const sliderMax = valueMax == null ? max : valueMax;

  const minPct = useMemo(() => ((valueMin - min) / (max - min)) * 100, [valueMin, min, max]);
  const maxPct = useMemo(() => ((sliderMax - min) / (max - min)) * 100, [sliderMax, min, max]);

  const handleMinChange = useCallback(
    (nextMin: number) => {
      const cappedMax = valueMax ?? max;
      onChange(Math.min(nextMin, cappedMax), valueMax);
    },
    [onChange, valueMax, max],
  );

  const handleMaxChange = useCallback(
    (nextMax: number) => {
      const unlimited = nextMax >= max;
      const cappedMax = unlimited ? null : nextMax;
      const effectiveMax = cappedMax ?? max;
      onChange(Math.min(valueMin, effectiveMax), cappedMax);
    },
    [onChange, valueMin, max],
  );

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      <div className={styles.track} aria-hidden>
        <div
          className={styles.fill}
          style={{
            left: `${minPct}%`,
            width: `${Math.max(0, maxPct - minPct)}%`,
          }}
        />
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={valueMin}
        onChange={(e) => handleMinChange(Number(e.target.value))}
        className={[styles.slider, styles.sliderMin].join(' ')}
        aria-label="Minimum duration"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={sliderMax}
        onChange={(e) => handleMaxChange(Number(e.target.value))}
        className={[styles.slider, styles.sliderMax].join(' ')}
        aria-label="Maximum duration"
      />
    </div>
  );
};
