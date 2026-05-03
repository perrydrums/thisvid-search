import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import '../../components/v2/tokens.css';
import { Button } from '../../components/v2/atoms/Button';
import { AppSidebar } from '../../components/v2/organisms/AppSidebar';
import { TopNav } from '../../components/v2/organisms/TopNav';

import chrome from '../../components/v2/V2Chrome.module.css';

import {
  SEARCH_HISTORY_PAGE_SIZE,
  fetchSearchHistoryPage,
  searchHistoryReplayHref,
  type SearchHistoryRecord,
} from '../../helpers/supabase/searchHistory';
import { useAuth } from '../../hooks/useAuth';

import styles from './History.module.css';

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

/** Human-readable headline for search history row (video-free). */
function rowHeadline(row: SearchHistoryRecord): string {
  const typeLabel = row.type ? row.type.replace(/-/g, ' ') : '';
  switch (row.mode) {
    case 'user':
      return row.thisvidMemberId ? `Member ${row.thisvidMemberId}${typeLabel ? ` · ${typeLabel}` : ''}` : `User · ${typeLabel}`;
    case 'friend':
      return row.friendId ? `Friend ${row.friendId}${typeLabel ? ` · ${typeLabel}` : ''}` : `Friend · ${typeLabel}`;
    case 'category':
      return row.category ? `Category / ${row.category}` : 'Category';
    case 'tags':
      return row.primaryTag ? `Tag “${row.primaryTag}”` : 'Tags';
    case 'extreme':
      return row.primaryTag ? `Extreme · “${row.primaryTag}”` : 'Extreme';
    case 'newest':
      return `Newest${typeLabel ? ` · ${typeLabel}` : ''}`;
    case 'friendsEvents':
      return `Friends feed`;
    default:
      return row.mode ? `${row.mode}${typeLabel ? ` · ${typeLabel}` : ''}` : 'Search';
  }
}

function rowHaystack(row: SearchHistoryRecord): string {
  return [
    formatWhen(row.createdAtIso),
    row.mode,
    row.type,
    row.category,
    row.primaryTag,
    row.thisvidMemberId,
    row.friendId,
    row.tags.join(' '),
    String(row.resultCount),
  ]
    .join(' ')
    .toLowerCase();
}

const HistoryPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [filter, setFilter] = useState('');
  const [rows, setRows] = useState<SearchHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const pagingLock = useRef(false);

  const reload = useCallback(async () => {
    pagingLock.current = false;
    if (!user?.id || authLoading) return;
    setLoading(true);
    setFetchError(null);
    setInitialError(null);
    setHasMore(true);
    const { rows: first, error } = await fetchSearchHistoryPage(user.id, 0, SEARCH_HISTORY_PAGE_SIZE);
    setLoading(false);
    if (error) {
      setInitialError(error);
      setRows([]);
      setHasMore(false);
      return;
    }
    setRows(first);
    setHasMore(first.length >= SEARCH_HISTORY_PAGE_SIZE);
  }, [user?.id, authLoading]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (authLoading) return;
      if (!user?.id) {
        setRows([]);
        setHasMore(false);
        return;
      }
      if (!cancelled) await reload();
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, reload]);

  const loadMore = useCallback(async () => {
    if (!user?.id || loading || !hasMore || pagingLock.current) return;
    pagingLock.current = true;
    setLoading(true);
    setFetchError(null);
    const offset = rows.length;
    try {
      const { rows: next, error } = await fetchSearchHistoryPage(user.id, offset, SEARCH_HISTORY_PAGE_SIZE);
      if (error) {
        setFetchError(error);
        return;
      }
      setRows((prev) => [...prev, ...next]);
      setHasMore(next.length >= SEARCH_HISTORY_PAGE_SIZE);
    } finally {
      setLoading(false);
      pagingLock.current = false;
    }
  }, [user?.id, loading, hasMore, rows.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !user?.id || !hasMore || authLoading) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const [e] = entries;
        if (e?.isIntersecting && hasMore && !loading) void loadMore();
      },
      { root: null, rootMargin: '200px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [user?.id, hasMore, loading, loadMore, authLoading, rows.length]);

  const filterNorm = filter.trim().toLowerCase();

  const visibleRows = useMemo(() => {
    if (!filterNorm) return rows;
    return rows.filter((row) => rowHaystack(row).includes(filterNorm));
  }, [rows, filterNorm]);

  return (
    <div className={`v2-root ${chrome.page}`}>
      <TopNav variant="historySearch" historySearchValue={filter} onHistorySearchChange={setFilter} />
      <AppSidebar activePage="history" />

      <main className={`${chrome.main} ${styles.wrap}`}>
        <header className={styles.hdr}>
          <div>
            <h1 className={styles.hero}>Search history</h1>
            <p className={styles.sub}>
              Past searches you ran while signed in ({SEARCH_HISTORY_PAGE_SIZE} more load as you scroll). Filter applies to loaded
              items.
            </p>
          </div>
          {user?.id ? (
            <div className={styles.hdrBtns}>
              <Button variant="secondary" size="medium" type="button" onClick={() => void reload()} disabled={loading}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  refresh
                </span>
                Refresh
              </Button>
            </div>
          ) : null}
        </header>

        {!authLoading && !user?.id ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Sign in to see search history</p>
            <p className={styles.emptySub}>
              Searches are tied to your account when you use the sidebar <strong>LOGIN</strong>. Anonymous searches aren’t listed
              here (RLS only exposes rows with your Supabase auth id).
            </p>
            <Link className={styles.ctaPrimary} to="/search">
              Go to Search
            </Link>
          </div>
        ) : null}

        {initialError ? (
          <div className={styles.bannerErr}>
            <span className="material-symbols-outlined">error</span>
            <span>{initialError}</span>
          </div>
        ) : null}

        {fetchError ? (
          <div className={styles.bannerWarn}>
            <span className="material-symbols-outlined">warning</span>
            <span>{fetchError}</span>
          </div>
        ) : null}

        {user?.id && !initialError ? (
          <div className={styles.grid}>
            {visibleRows.length === 0 && !loading ? (
              <p className={styles.emptyInline}>No matching searches yet. Run a search on Search v2 while logged in.</p>
            ) : null}

            {visibleRows.map((row) => {
              const href = searchHistoryReplayHref(row);
              const resultPhrase =
                typeof row.resultCount === 'number'
                  ? `${row.resultCount.toLocaleString()} result${row.resultCount === 1 ? '' : 's'}`
                  : '— results';
              return (
                <article key={row.id} className={styles.card}>
                  <div className={styles.body}>
                    <div className={styles.centerStack}>
                      <div className={styles.titleRow}>
                        <h2 className={styles.entryTitle}>{rowHeadline(row)}</h2>
                      </div>
                      <p className={styles.dateLine}>{formatWhen(row.createdAtIso)}</p>

                      {row.pageAmount > 0 || row.duration > 0 ? (
                        <div className={styles.details}>
                          {row.pageAmount ? (
                            <span>
                              Pages: <strong>{row.pageAmount}</strong>
                            </span>
                          ) : null}
                          {row.duration > 0 ? (
                            <span>
                              Min duration: <strong>{row.duration} min</strong>
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {row.tags.length > 0 ? (
                        <div className={styles.chips}>
                          {row.tags.slice(0, 12).map((t, i) => (
                            <span key={`${row.id}-${i}-${t}`} className={styles.chip}>
                              {t}
                            </span>
                          ))}
                          {row.tags.length > 12 ? (
                            <span className={[styles.chip, styles.chipMuted].join(' ')}>+{row.tags.length - 12} tags</span>
                          ) : null}
                        </div>
                      ) : null}

                      <p className={styles.meta}>{resultPhrase}</p>
                    </div>

                    <div className={styles.actions}>
                      <Link className={styles.replayBtn} to={href}>
                        Replay search
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {user?.id ? (
          <>
            <div ref={sentinelRef} className={styles.sentinel} aria-hidden />
            {loading ? (
              <p className={styles.loadingFoot}>
                <span className={['material-symbols-outlined', styles.spinIco].join(' ')}>progress_activity</span>
                Loading…
              </p>
            ) : null}
            {!loading && !hasMore && rows.length > 0 ? (
              <p className={styles.endFoot}>End of history</p>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
};

export default HistoryPage;
