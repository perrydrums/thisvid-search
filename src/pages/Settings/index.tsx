import cheerio from 'cheerio';
import React, { useCallback, useEffect, useState } from 'react';
import LoadingBar from 'react-top-loading-bar';

import '../../components/v2/tokens.css';
import { Button } from '../../components/v2/atoms/Button';
import { AppSidebar } from '../../components/v2/organisms/AppSidebar';
import { TopNav } from '../../components/v2/organisms/TopNav';
import chrome from '../../components/v2/V2Chrome.module.css';

import styles from './Settings.module.css';
import type { Mood } from '../../helpers/types';
import { getVideos } from '../../helpers/videos';
import { useAuth } from '../../hooks/useAuth';
import { useUserData } from '../../hooks/useUserData';

const LOG_LINES = [
  { ts: '[10:42:01]', line: 'INITIALIZING HANDSHAKE WITH THISVID.COM...', tone: 'ok' as const },
  { ts: '[10:42:02]', line: 'STATUS: 200 OK', tone: 'dim' as const },
  { ts: '[10:42:05]', line: 'FETCHING PAGINATED FAVORITES: PAGE 1/48', tone: 'ok' as const },
  { ts: '[10:42:08]', line: 'PARSING METADATA FOR 25 ASSETS...', tone: 'ok' as const },
  { ts: '[10:42:10]', line: 'WARNING: RATE LIMIT APPROACHING (75%)', tone: 'warn' as const },
  { ts: '[10:42:12]', line: 'SYNCING LOCAL CACHE WITH LOCAL STORAGE...', tone: 'ok' as const },
];

const Settings = () => {
  const { loading: authLoading } = useAuth();
  const userData = useUserData();
  const {
    isCloud,
    loading: userDataLoading,
    refreshProfileFromCloud,
  } = userData;

  const [loading, setLoading] = useState(false);
  const [favDone, setFavDone] = useState(0);
  const [favTotal, setFavTotal] = useState(0);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importError, setImportError] = useState('');

  const lastSyncDate = userData.lastSyncDate;

  const userId = userData.thisvidUserId;
  const favourites = userData.favourites;

  const favouritesCount =
    favourites.length === 0 ? 0 : favourites.split(',').filter((x) => x.trim()).length;

  /** react-top-loading-bar only finishes when progress hits 100; then it fades out and fires this callback. */
  const resetFetchFavsBar = useCallback(() => {
    setLoading(false);
    setFavDone(0);
    setFavTotal(0);
  }, []);

  /**
   * `useUserData` is per-component state: opening Settings mounts a fresh hook instance. Always pull profile+moods
   * from Supabase once session + initial load have settled so empty localStorage still shows cloud prefs.
   */
  useEffect(() => {
    if (!isCloud || authLoading || userDataLoading) return;
    void refreshProfileFromCloud({ quiet: true });
  }, [isCloud, authLoading, userDataLoading, refreshProfileFromCloud]);

  const fetchFavorites = async () => {
    if (!userId.trim()) return;
    setLoading(true);
    setFavDone(0);
    setFavTotal(0);
    try {
      const response = await fetch(`/members/${userId}/favourite_videos/`);
      const body = await response.text();
      const $ = cheerio.load(body);

      const lastPage =
        parseInt(
          $('li.pagination-last a').text() || $('.pagination-list li:nth-last-child(2) a').text(),
          10,
        ) || 1;

      setFavTotal(lastPage);

      const promises = [];
      for (let i = 1; i <= lastPage; i++) {
        promises.push(
          getVideos({
            url: `/members/${userId}/favourite_videos/${i}`,
            page: i,
            omitPrivate: false,
            minDuration: 0,
            quick: true,
          }).then((batch) => {
            setFavDone((n) => n + 1);
            return batch;
          }),
        );
      }

      const videos = (await Promise.all(promises)).flat().filter(
        (value, index, self) => index === self.findIndex((v) => v.url === value.url),
      );

      setFavDone(lastPage);

      const videoUrls = videos.map((v) => v.url);
      await userData.setFavouritesAndLastSync(videoUrls.join(','), new Date().toLocaleString());
    } catch (e) {
      console.error(e);
      alert('Failed to fetch favourites. Check console.');
      resetFetchFavsBar();
    }
  };

  const exportMoods = () => {
    navigator.clipboard.writeText(JSON.stringify(userData.moods));
    alert('Moods data copied to clipboard!');
  };

  const importMoods = async () => {
    try {
      setImportError('');
      const parsedMoods = JSON.parse(importText) as unknown;
      if (!Array.isArray(parsedMoods)) {
        throw new Error('Invalid moods data format');
      }
      await userData.persistMoods(parsedMoods as Mood[]);
      setImportText('');
      setShowImport(false);
      alert('Moods imported successfully!');
    } catch {
      setImportError('Invalid JSON format. Please check your import data.');
    }
  };

  return (
    <div className={`v2-root ${chrome.page}`}>
      <LoadingBar
        progress={
          loading && favTotal > 0
            ? Math.min(100, Math.round((Math.min(favDone, favTotal) / favTotal) * 100))
            : 0
        }
        color="var(--v2-accent, #ff003c)"
        height={8}
        onLoaderFinished={resetFetchFavsBar}
      />
      <TopNav />
      <AppSidebar activePage="settings" />

      <main className={`${chrome.main} ${styles.mainInner}`}>
        <div className={styles.restrict}>
          <div className={styles.grid}>
            <section className={`${styles.card} ${styles.wide}`}>
              <div className={styles.cardHead}>
                <div className={styles.icoWrap}>
                  <span className={[styles.ico, 'material-symbols-outlined'].join(' ')}>integration_instructions</span>
                </div>
                <h2 className={styles.cardTitle}>ThisVid Integration</h2>
              </div>
              <div className={styles.stack}>
                <label className={styles.lab} htmlFor="settings-user-id">
                  User ID
                </label>
                <div className={styles.inputWrap}>
                  <span className={[styles.prefIcon, 'material-symbols-outlined'].join(' ')}>fingerprint</span>
                  <input
                    id="settings-user-id"
                    className={styles.field}
                    placeholder="Enter your ThisVid profile ID"
                    value={userId}
                    onChange={(e) => void userData.setThisvidUserId(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="large"
                  onClick={() => void fetchFavorites()}
                  disabled={loading || !userId.trim()}
                  className={styles.ctaRow}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    sync
                  </span>
                  Fetch Favorites
                </Button>

                <div className={styles.stats}>
                  <div>
                    <span className={styles.statsLab}>Last fetched</span>
                    <span className={styles.statsVal}>{lastSyncDate || '—'}</span>
                  </div>
                  <div className={styles.statsSep} />
                  <div>
                    <span className={styles.statsLab}>Favorites Found</span>
                    <span className={styles.statsHighlight}>{favouritesCount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </section>

            <aside className={styles.sidebarCol}>
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={[styles.icoWrap, styles.icoTertiary].join(' ')}>
                    <span className={[styles.ico, 'material-symbols-outlined'].join(' ')}>database</span>
                  </div>
                  <h2 className={styles.cardTitle}>Data Management</h2>
                </div>
                <p className={styles.muted}>
                  Archive your curated moods or synchronize them across instances using the local JSON export utility.
                </p>
                <Button type="button" variant="secondary" fullWidth size="medium" className={styles.dmBtn} onClick={exportMoods}>
                  <span className="material-symbols-outlined">upload_file</span>
                  Export moods
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  size="medium"
                  className={styles.dmBtn}
                  onClick={() => setShowImport(true)}
                >
                  <span className="material-symbols-outlined">download_for_offline</span>
                  Import moods
                </Button>
              </section>
            </aside>

            <section className={[styles.card, styles.logs].join(' ')}>
              <div className={styles.logsHead}>
                <h3 className={styles.logsHeadTitle}>Live Scraping Logs</h3>
                <span className={styles.liveBadge}>
                  <span className={styles.liveDot} aria-hidden />
                  System Live
                </span>
              </div>
              <div className={styles.terminal}>
                {LOG_LINES.map(({ ts, line, tone }) => (
                  <div key={ts + line} className={styles.logRow}>
                    <span className={styles.logTs}>{ts}</span>
                    <span className={tone === 'warn' ? styles.logWarn : tone === 'dim' ? styles.logDim : styles.logTxt}>
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      {showImport && (
        <Modal onClose={() => setShowImport(false)}>
          <h3 className={styles.modalTitle}>Import moods</h3>
          <textarea className={styles.ta} value={importText} placeholder="Paste JSON array here…" onChange={(e) => setImportText(e.target.value)} />
          {importError && <p className={styles.err}>{importError}</p>}
          <div className={styles.modalActions}>
            <Button type="button" variant="secondary" size="medium" onClick={() => setShowImport(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="medium" disabled={!importText.trim()} onClick={importMoods}>
              Import
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  return (
    <div
      role="presentation"
      className={styles.overlay}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div role="dialog" className={styles.modal} onClick={stop}>
        {children}
      </div>
    </div>
  );
}

export default Settings;
