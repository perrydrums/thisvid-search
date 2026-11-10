import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

import '../../components/v2/tokens.css';
import { Button } from '../../components/v2/atoms/Button';
import { Input } from '../../components/v2/atoms/Input';
import { SectionHeader } from '../../components/v2/molecules/SectionHeader';
import { AppSidebar } from '../../components/v2/organisms/AppSidebar';
import { RecommendationRail } from '../../components/v2/organisms/RecommendationRail';
import { TopNav } from '../../components/v2/organisms/TopNav';
import chrome from '../../components/v2/V2Chrome.module.css';
import { useRecommendations } from '../../hooks/useRecommendations';

import styles from './Recommendations.module.css';

function formatUpdated(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const RecommendationsPage = () => {
  const recs = useRecommendations();

  useEffect(() => {
    document.title = 'For you — ThisVid ASS';
  }, []);

  const hasProfile = !!recs.profile && recs.analysedCount > 0;
  const needsUserId = !recs.userId.trim();
  const needsSync = !needsUserId && recs.friendCount === 0 && recs.favouriteCount === 0;
  const progressPct = recs.refreshing ? Math.round((recs.progress?.fraction ?? 0.02) * 100) : 0;
  const progressLabel = recs.refreshing
    ? recs.progress?.label || 'Loading recommendations…'
    : recs.cachedAt
      ? 'Refresh'
      : 'Get recommendations';

  const friendsEmpty = !recs.refreshing
    ? recs.friendCount === 0
      ? 'Sync your friends to see what they have posted recently.'
      : 'Nothing new from the friends checked this time. Refresh later, or sync again if your friend list changed.'
    : 'Checking friends…';

  const forYouEmpty = recs.refreshing
    ? 'Looking for videos you might like…'
    : recs.hasRelated
      ? 'Nothing matched closely enough this time. Refresh to look again.'
      : 'Nothing matched yet. Run Analyse again so related videos can be saved, then refresh.';

  return (
    <div className={`v2-root ${chrome.page}`}>
      <TopNav />
      <AppSidebar activePage="recommendations" />

      <main className={chrome.main}>
        <div className={styles.wrap}>
          <section className={styles.card}>
            <SectionHeader
              icon="auto_awesome"
              title="For you"
              subtitle="Videos picked based on your favourites."
            />
            <p className={styles.hint}>
              Two lists from your favourites: videos friends posted recently, and videos that resemble
              what you already like. Favourites are left out. Private videos only appear when you are
              friends with the uploader.
            </p>

            {recs.error ? <p className={styles.error}>{recs.error}</p> : null}

            {recs.loading && !hasProfile ? (
              <p className={styles.hint}>Loading your taste profile…</p>
            ) : (
              <ol className={styles.steps}>
                <li className={needsUserId ? undefined : styles.stepDone}>
                  {needsUserId ? (
                    <>
                      <label htmlFor="for-you-user-id">Your ThisVid user ID</label>
                      <div className={styles.field}>
                        <Input
                          id="for-you-user-id"
                          value={recs.userId}
                          placeholder="Numeric member ID"
                          autoComplete="off"
                          onChange={(event) => void recs.setUserId(event.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      User ID {recs.userId.trim()} is saved.{' '}
                      <Link to="/settings">Change it in Settings</Link>
                    </>
                  )}
                </li>
                <li className={needsSync ? undefined : styles.stepDone}>
                  {recs.favouriteCount > 0 || recs.friendCount > 0 ? (
                    <>
                      {recs.favouriteCount.toLocaleString()} favourites and {recs.friendCount.toLocaleString()}{' '}
                      friends synced.
                    </>
                  ) : (
                    <>Sync favourites and friends.</>
                  )}
                  <div className={styles.actions}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="medium"
                      disabled={needsUserId || recs.syncing}
                      onClick={() => void recs.syncProfile()}
                    >
                      {recs.syncing ? recs.syncLabel || 'Syncing…' : 'Sync favourites & friends'}
                    </Button>
                  </div>
                </li>
                <li className={hasProfile ? styles.stepDone : undefined}>
                  {hasProfile ? (
                    <>
                      Taste profile from {recs.analysedCount.toLocaleString()} analysed favourites
                      {recs.analyseDate
                        ? `, last run ${formatUpdated(new Date(recs.analyseDate).getTime())}`
                        : ''}
                      .{' '}
                      <Link to="/analyse">Open Analyse</Link>
                    </>
                  ) : (
                    <>
                      Analyse your favourites so recommendations can be scored.{' '}
                      <Link to="/analyse">Open Analyse</Link>
                    </>
                  )}
                </li>
              </ol>
            )}

            {recs.stale ? (
              <p className={styles.stale}>
                You have synced more favourites than Analyse has read. Run Analyse again so the taste
                profile catches up. <Link to="/analyse">Open Analyse</Link>
              </p>
            ) : null}

            {hasProfile ? (
              <>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.progressBtn}
                    onClick={recs.refresh}
                    disabled={recs.refreshing}
                    aria-busy={recs.refreshing}
                  >
                    <span className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                    <span className={styles.progressLabel}>{progressLabel}</span>
                  </button>
                </div>
                {recs.cachedAt && !recs.refreshing ? (
                  <p className={styles.updated}>Last updated {formatUpdated(recs.cachedAt)}</p>
                ) : null}
              </>
            ) : null}
          </section>

          {hasProfile ? (
            <>
              <RecommendationRail
                icon="group"
                title="New from your friends"
                subtitle="Recent uploads from your friends, ranked against your favourites."
                videos={recs.fromFriends}
                empty={friendsEmpty}
                onHide={recs.hideRecommendation}
              />
              <RecommendationRail
                icon="auto_awesome"
                title="You might like"
                subtitle="Related videos, friends' favourites, and the latest in the tags and categories you actually favour."
                videos={recs.forYou}
                empty={forYouEmpty}
                onHide={recs.hideRecommendation}
              />
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default RecommendationsPage;
