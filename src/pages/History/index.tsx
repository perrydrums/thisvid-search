import React from 'react';

import '../../components/v2/tokens.css';
import { Button } from '../../components/v2/atoms/Button';
import { AppSidebar } from '../../components/v2/organisms/AppSidebar';
import { TopNav } from '../../components/v2/organisms/TopNav';

import chrome from '../../components/v2/V2Chrome.module.css';

import styles from './History.module.css';

type ModeKind = 'extreme' | 'user' | 'category' | 'tag';

const MOCK: Array<{
  id: string;
  mode: ModeKind;
  title: string;
  idBadge: string;
  tags: string[];
  meta: string;
  thumbHue: number;
}> = [
  {
    id: '1',
    mode: 'extreme',
    title: 'Hardware_Benchmark_2024',
    idBadge: 'ID: #XS-92831',
    tags: ['# RTX 4090', '# 4K Ultra', 'Last 30 Days'],
    meta: 'Executed 2 hours ago • 1,240 results found',
    thumbHue: 200,
  },
  {
    id: '2',
    mode: 'user',
    title: 'TechReviewer_Official',
    idBadge: 'ID: #U-55201',
    tags: ['@tech_guru', 'Exclude shorts'],
    meta: 'Executed Yesterday, 14:20 • 85 results found',
    thumbHue: 40,
  },
  {
    id: '3',
    mode: 'category',
    title: 'Education / Science / AI',
    idBadge: 'ID: #C-10332',
    tags: ['English only', 'HD+'],
    meta: 'Executed Oct 12, 2023 • 4,502 results found',
    thumbHue: 280,
  },
  {
    id: '4',
    mode: 'tag',
    title: 'Modern_UI_Design_Trends',
    idBadge: 'ID: #T-77219',
    tags: ['TailwindCSS', 'Figma', 'Glass morphism'],
    meta: 'Executed Oct 10, 2023 • 312 results found',
    thumbHue: 340,
  },
];

const BADGE_LABEL: Record<ModeKind, string> = {
  extreme: 'Extreme',
  user: 'User',
  category: 'Category',
  tag: 'Tag',
};

const MODE_CLASS_MAP: Record<ModeKind, keyof typeof styles> = {
  extreme: 'mode_extreme',
  user: 'mode_user',
  category: 'mode_category',
  tag: 'mode_tag',
};

const HistoryPage = () => {
  return (
    <div className={`v2-root ${chrome.page}`}>
      <TopNav variant="historySearch" />
      <AppSidebar activePage="history" />

      <main className={`${chrome.main} ${styles.wrap}`}>
        <header className={styles.hdr}>
          <div>
            <h1 className={styles.hero}>Search History</h1>
            <p className={styles.sub}>Review and re-run your previous scraping configurations.</p>
          </div>
          <div className={styles.hdrBtns}>
            <Button variant="secondary" size="medium" type="button" title="Coming soon">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                filter_list
              </span>
              Filter
            </Button>
            <button type="button" className={styles.clearBtn} disabled title="Coming soon">
              <span className="material-symbols-outlined">delete_sweep</span>
              Clear all
            </button>
          </div>
        </header>

        <div className={styles.grid}>
          {MOCK.map((row) => (
            <article key={row.id} className={styles.card}>
              <div className={styles.media} style={{ ['--hue' as string]: `${row.thumbHue}deg` }}>
                <div className={styles.thumbTint} aria-hidden />
                <span className={[styles.modePill, styles[MODE_CLASS_MAP[row.mode]]].join(' ')}>{BADGE_LABEL[row.mode]}</span>
              </div>

              <div className={styles.body}>
                <div className={styles.centerStack}>
                  <div className={styles.titleRow}>
                    <h2 className={styles.entryTitle}>{row.title}</h2>
                    <span className={styles.idChip}>{row.idBadge}</span>
                  </div>
                  <div className={styles.chips}>
                    {row.tags.map((t) => (
                      <span key={t} className={styles.chip}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className={styles.meta}>{row.meta}</p>
                </div>

                <div className={styles.actions}>
                  <button type="button" className={styles.heart} title="Coming soon">
                    <span className="material-symbols-outlined">favorite_border</span>
                  </button>
                  <Button variant="primary" size="medium" type="button" disabled title="Coming soon">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      refresh
                    </span>
                    Repeat Search
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.moreWrap}>
          <button type="button" className={styles.showMore}>
            Show more history
            <span className="material-symbols-outlined">expand_more</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default HistoryPage;
