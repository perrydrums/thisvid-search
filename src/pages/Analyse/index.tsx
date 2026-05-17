import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import '../../components/v2/tokens.css';
import { AppSidebar } from '../../components/v2/organisms/AppSidebar';
import { TopNav } from '../../components/v2/organisms/TopNav';
import chrome from '../../components/v2/V2Chrome.module.css';
import { Input } from '../../components/v2/atoms/Input';
import { Button } from '../../components/v2/atoms/Button';
import { SectionHeader } from '../../components/v2/molecules/SectionHeader';
import { ToggleGroup } from '../../components/v2/molecules/ToggleGroup';
import { AnalyseBarChart } from '../../components/v2/molecules/AnalyseBarChart';
import {
  type AnalyseFavouriteUsers,
  ANALYSE_USERS_STORAGE_KEY,
  TVASS_USER_ID_STORAGE_KEY,
  analyseFavouritesListingPage,
  getFavouriteListingPageLimit,
  runAnalyseFavourites,
} from '../../helpers/analyseFavourites';

import styles from './Analyse.module.css';

type Categories = Record<string, number>;
type Tags = Record<string, number>;

type Video = {
  title: string;
  thumbnail: string;
  description: string;
  category: string;
  tags: string[];
  username: string;
  userUrl: string;
  url: string;
};

type ResultsTab = 'summary' | 'users' | 'categories' | 'tags';

function openExternal(href: string) {
  if (!href) return;
  window.open(href, '_blank', 'noopener,noreferrer');
}

function categoryHref(category: string) {
  return `/categories/${category.replaceAll(' ', '-')}`;
}

function tagHref(tag: string) {
  const t = tag.trim();
  if (!t) return '/tags/';
  /** Proxied to ThisVid like `useSearchLogic` tag URLs. */
  return `/tags/${encodeURIComponent(t)}/`;
}

/** Row cap keeps the summary scroll area usable. */
const BAR_ROW_CAP = 54;

function barChartLabel(raw: string, maxLen = 42): string {
  const s = raw.trim();
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}

function fontSizeForCount(count: number, minC: number, maxC: number): number {
  const minPx = 12;
  const maxPx = 22;
  if (maxC <= minC) return Math.round((minPx + maxPx) / 2);
  const t = (count - minC) / (maxC - minC);
  return Math.round(minPx + t * (maxPx - minPx));
}

const Analyse = () => {
  const [uid, setUid] = useState('');
  const [users, setUsers] = useState<AnalyseFavouriteUsers>({});
  const [progressCount, setProgressCount] = useState(0);
  const [pageLimit, setPageLimit] = useState(0);
  const [finished, setFinished] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [show, setShow] = useState<ResultsTab>('summary');

  useEffect(() => {
    const stored = localStorage.getItem(TVASS_USER_ID_STORAGE_KEY);
    if (stored?.trim()) {
      setUid(stored.trim());
    }
  }, []);

  useEffect(() => {
    const storedUsers = localStorage.getItem(ANALYSE_USERS_STORAGE_KEY);
    if (!storedUsers) return;
    try {
      const parsed = JSON.parse(storedUsers) as AnalyseFavouriteUsers;
      if (parsed && Object.keys(parsed).length > 0) {
        setUsers(parsed);
      }
    } catch (e) {
      console.error('Error parsing analyse users from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(users).length === 0) return;
    try {
      localStorage.setItem(ANALYSE_USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving analyse users to localStorage:', e);
    }
  }, [users]);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const last = await getFavouriteListingPageLimit(uid);
        setPageLimit(last);
      } catch {
        setPageLimit(0);
      }
    })();
  }, [uid]);

  useEffect(() => {
    document.title = `Analyse favourites — ThisVid ASS`;
  }, []);

  const resultsRef = useRef<HTMLDivElement>(null);

  const executeScroll = useCallback(() => {
    requestAnimationFrame(() => {
      const el = resultsRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const headerClearance = Math.round(window.innerHeight * 0.12);
      const gap = 8;
      const y = window.scrollY + rect.top - headerClearance - gap;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    });
  }, []);

  const run = async () => {
    setProgressCount(0);
    setUsers({});
    setFinished(false);
    try {
      const result = await runAnalyseFavourites(uid, {
        onProgress: (done, total) => {
          setProgressCount(done);
          setPageLimit(total);
        },
      });
      setUsers(result);
    } catch (e) {
      console.error(e);
      setErrorMessage('Analysis failed. Check your User ID and try again.');
    } finally {
      setFinished(true);
      executeScroll();
    }
  };

  const next = async () => {
    setFinished(false);
    try {
      const draft = JSON.parse(JSON.stringify(users)) as AnalyseFavouriteUsers;
      await analyseFavouritesListingPage(uid, progressCount + 1, draft);
      setUsers(draft);
      setProgressCount((c) => c + 1);
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to analyse page.');
    } finally {
      setFinished(true);
      executeScroll();
    }
  };

  const submitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    localStorage.setItem(TVASS_USER_ID_STORAGE_KEY, uid.trim());
    setErrorMessage('');
    setFinished(false);
    const sub = (e.nativeEvent as SubmitEvent).submitter?.id;
    if (sub === 'next') {
      void next();
      return;
    }
    if (!pageLimit) {
      setFinished(true);
      return;
    }
    if (pageLimit > 10) {
      if (window.confirm('This will take a while. Are you sure you want to continue?')) {
        void run();
      } else {
        setFinished(true);
      }
    } else {
      void run();
    }
  };

  const categoriesEntries = useMemo(() => {
    const categories: Categories = {};
    Object.values(users).forEach((user) => {
      user.videos.forEach((video: Video) => {
        const key = video.category || '';
        categories[key] = (categories[key] ?? 0) + 1;
      });
    });
    return Object.entries(categories).sort((a, b) => b[1] - a[1]);
  }, [users]);

  const tagsEntries = useMemo(() => {
    const tags: Tags = {};
    Object.values(users).forEach((user) => {
      user.videos.forEach((video) => {
        video.tags.forEach((tag) => {
          tags[tag] = (tags[tag] ?? 0) + 1;
        });
      });
    });
    return Object.entries(tags).sort((a, b) => b[1] - a[1]);
  }, [users]);

  const sortedUsers = useMemo(
    () => Object.values(users).sort((a, b) => b.count - a.count),
    [users],
  );

  const tagsBarData = useMemo(
    () =>
      tagsEntries.slice(0, BAR_ROW_CAP).map(([id, value]) => ({
        id,
        name: barChartLabel(id),
        value,
      })),
    [tagsEntries],
  );

  const categoriesBarData = useMemo(
    () =>
      categoriesEntries.slice(0, BAR_ROW_CAP).map(([id, value]) => ({
        id,
        name: barChartLabel(id || '(none)'),
        value,
      })),
    [categoriesEntries],
  );

  const profilesBarData = useMemo(
    () =>
      sortedUsers.slice(0, 22).map((u) => ({
        id: u.username,
        name: barChartLabel(u.username),
        value: u.count,
      })),
    [sortedUsers],
  );

  const totalVideos = useMemo(
    () => Object.values(users).reduce((acc, u) => acc + u.videos.length, 0),
    [users],
  );

  const safeLimit = Math.max(1, pageLimit);
  const progressPct = finished ? 0 : Math.min(100, (progressCount / safeLimit) * 100);
  const busy = !finished;

  const tabOptions = useMemo(
    () =>
      [
        { value: 'summary' as const, label: 'Summary' },
        { value: 'users' as const, label: 'Users' },
        { value: 'categories' as const, label: 'Categories' },
        { value: 'tags' as const, label: 'Tags' },
      ] as const,
    [],
  );

  return (
    <div className={`v2-root ${chrome.page}`}>
      <TopNav />
      <AppSidebar activePage="analyse" />

      <main className={chrome.main}>
        <form className={styles.formBlock} onSubmit={submitForm}>
          <div className={styles.controlsCard}>
            <SectionHeader
              icon="analytics"
              title="Analyse favourites"
              subtitle="Scrape your ThisVid favourite videos and see uploaders, categories, and tags."
            />

            {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

            <div className={styles.controlsGrid}>
              <div className={styles.fieldCol}>
                <label className={styles.label} htmlFor="analyse-user-id">
                  Your User ID
                </label>
                <Input
                  id="analyse-user-id"
                  type="text"
                  value={uid}
                  required
                  autoComplete="off"
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="Numeric member ID"
                />
                <p className={styles.fieldHint}>
                  Saved to this device as <code>tvass-user-id</code> when you run analysis.
                </p>
              </div>
              <div className={styles.metaCol}>
                <div className={styles.metaRow}>
                  <span className={styles.metaMuted}>
                    <strong>Progress:</strong> {progressCount}/{safeLimit} (
                    {Math.round((progressCount / safeLimit) * 100)}%)
                  </span>
                  {busy ? <span className={styles.miniSpinner} aria-hidden /> : null}
                </div>
                {Object.keys(users).length > 0 ? (
                  <p className={styles.metaMuted}>
                    <strong>Found</strong> {totalVideos}{' '}
                    {totalVideos === 1 ? 'video' : 'videos'} across{' '}
                    <strong>{Object.keys(users).length}</strong> uploaders.
                  </p>
                ) : (
                  <p className={styles.metaMuted}>Run analysis to aggregate results.</p>
                )}
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="submit"
                id="run"
                className={styles.progressBtn}
                disabled={!pageLimit || !finished}
                aria-busy={busy}
              >
                <span className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                <span className={styles.progressLabel}>
                  {busy ? `ANALYSING ${progressCount}/${safeLimit}…` : 'ANALYSE ALL PAGES'}
                </span>
              </button>
              <div className={styles.secondaryBtnWrap}>
                <Button
                  type="submit"
                  id="next"
                  variant="secondary"
                  disabled={!pageLimit || !finished}
                >
                  Analyse page {progressCount + 1}/{safeLimit}
                </Button>
              </div>
            </div>
          </div>
        </form>

        <div className={styles.resultsBlock} ref={resultsRef}>
          {Object.keys(users).length > 0 ? (
            <>
              <div className={styles.tabsRow}>
                <ToggleGroup
                  label="Results"
                  options={[...tabOptions]}
                  value={show}
                  onChange={setShow}
                />
              </div>

              {show === 'summary' ? (
                <div>
                  <p className={styles.summaryHint}>
                    Bar length shows how often a tag, category, or uploader appears among your
                    favourites. Click a row to open its ThisVid page.
                  </p>
                  <div className={styles.summarySection}>
                    <h3 className={styles.summaryTitle}>Favourite tags</h3>
                    {tagsBarData.length > 0 ? (
                      <AnalyseBarChart
                        data={tagsBarData}
                        ariaLabel={`Bar chart of favourite tags, ${tagsBarData.length} items`}
                        onBarClick={(id) => openExternal(tagHref(id))}
                      />
                    ) : (
                      <p className={styles.emptyHint}>No tags found in this analysis.</p>
                    )}
                  </div>
                  <div className={styles.summarySection}>
                    <h3 className={styles.summaryTitle}>Favourite categories</h3>
                    {categoriesBarData.length > 0 ? (
                      <AnalyseBarChart
                        data={categoriesBarData}
                        ariaLabel={`Bar chart of favourite categories, ${categoriesBarData.length} items`}
                        onBarClick={(id) => openExternal(categoryHref(id))}
                      />
                    ) : (
                      <p className={styles.emptyHint}>No categories found in this analysis.</p>
                    )}
                  </div>
                  <div className={styles.summarySection}>
                    <h3 className={styles.summaryTitle}>Favourite profiles</h3>
                    {profilesBarData.length > 0 ? (
                      <AnalyseBarChart
                        data={profilesBarData}
                        ariaLabel={`Bar chart of favourite uploaders, ${profilesBarData.length} items`}
                        onBarClick={(username) => {
                          const u = sortedUsers.find((x) => x.username === username);
                          if (u?.url) openExternal(u.url);
                        }}
                      />
                    ) : (
                      <p className={styles.emptyHint}>No profiles in this analysis.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {show === 'users' ? (
                <div className={styles.userGrid}>
                  {sortedUsers.map((user) => (
                    <button
                      key={user.username}
                      type="button"
                      className={styles.userCard}
                      onClick={() => openExternal(user.url)}
                    >
                      <div
                        className={styles.userThumb}
                        style={
                          user.avatar
                            ? { backgroundImage: `url(${user.avatar})` }
                            : undefined
                        }
                        role="img"
                        aria-label=""
                      />
                      <div className={styles.userCardBody}>
                        <span className={styles.userBadge}>{user.count} videos</span>
                        <h3 className={styles.userName}>{user.username}</h3>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}

              {show === 'categories' ? (
                <div className={styles.pillGrid}>
                  {categoriesEntries.map(([category, count]) => (
                    <button
                      key={category}
                      type="button"
                      className={styles.pill}
                      style={{ fontSize: `${fontSizeForCount(count, categoriesEntries.at(-1)?.[1] ?? 1, categoriesEntries[0]?.[1] ?? 1)}px` }}
                      onClick={() => openExternal(categoryHref(category))}
                    >
                      <span>{category || '(uncategorised)'}</span>
                      <span className={styles.pillCount}>{count}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {show === 'tags' ? (
                <div className={styles.pillGrid}>
                  {tagsEntries.map(([tag, count]) => (
                    <button
                      key={tag}
                      type="button"
                      className={styles.pill}
                      style={{ fontSize: `${fontSizeForCount(count, tagsEntries.at(-1)?.[1] ?? 1, tagsEntries[0]?.[1] ?? 1)}px` }}
                      onClick={() => openExternal(tagHref(tag))}
                    >
                      <span>{tag}</span>
                      <span className={styles.pillCount}>{count}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className={styles.emptyHint}>
              No aggregated data yet. Enter your User ID and run analysis.
            </p>
          )}

          <p className={styles.footerNote}>
            <a href="/legacy/recommendations">Recommendations</a> uses the same saved data (
            <code>tvass-analyse-users</code>).{' '}
            <a href="/legacy/search">Legacy search</a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Analyse;
