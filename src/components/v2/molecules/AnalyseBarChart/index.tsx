import React, { useMemo } from 'react';

import styles from './AnalyseBarChart.module.css';

export type AnalyseBarDatum = {
  id: string;
  name: string;
  value: number;
};

export type AnalyseBarChartProps = {
  data: AnalyseBarDatum[];
  /** Region label for screen readers. */
  ariaLabel: string;
  /** Opens the linked ThisVid resource for the row. */
  onBarClick: (id: string) => void;
};

export const AnalyseBarChart: React.FC<AnalyseBarChartProps> = ({ data, ariaLabel, onBarClick }) => {
  const maxVal = useMemo(() => Math.max(1, ...data.map((d) => d.value)), [data]);

  if (!data.length) {
    return null;
  }

  return (
    <div className={styles.wrap} role="region" aria-label={ariaLabel}>
      <ul className={styles.list}>
        {data.map((row) => {
          const pct = (row.value / maxVal) * 100;
          return (
            <li key={row.id} className={styles.row}>
              <button
                type="button"
                className={styles.barRow}
                aria-label={`${row.name}, ${row.value} videos. Open ThisVid listing.`}
                onClick={() => onBarClick(row.id)}
              >
                <div className={styles.rowTop}>
                  <span className={styles.name}>{row.name}</span>
                  <span className={styles.count}>{row.value}</span>
                </div>
                <div className={styles.barTrack} aria-hidden>
                  <span className={styles.barFill} style={{ width: `${pct}%` }} />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
