import React, { useEffect, useRef, useState } from 'react';

import { formatDurationRangeHms, parseDurationRangeText } from '../../../../helpers/duration';

import styles from './DurationRangeBadge.module.css';

export type DurationRangeBadgeProps = {
  minSeconds: number;
  maxSeconds: number | null;
  onChange: (min: number, max: number | null) => void;
  className?: string;
  id?: string;
};

export const DurationRangeBadge: React.FC<DurationRangeBadgeProps> = ({
  minSeconds,
  maxSeconds,
  onChange,
  className = '',
  id,
}) => {
  const formatted = formatDurationRangeHms(minSeconds, maxSeconds);
  const [text, setText] = useState(formatted);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setText(formatted);
    }
  }, [formatted]);

  const commit = () => {
    const parsed = parseDurationRangeText(text);
    if (parsed) {
      onChange(parsed.min, parsed.max);
    } else {
      setText(formatted);
    }
  };

  return (
    <input
      id={id}
      type="text"
      className={[styles.input, className].filter(Boolean).join(' ')}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          focusedRef.current = false;
          setText(formatted);
          (e.target as HTMLInputElement).blur();
        }
      }}
      aria-label="Duration range (HH:MM:SS - HH:MM:SS+)"
      spellCheck={false}
      autoComplete="off"
    />
  );
};
