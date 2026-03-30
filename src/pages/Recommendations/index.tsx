import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LazyLoadComponent } from 'react-lazy-load-image-component';

import '../../App.css';
import Header from '../../components/Header';
import Result from '../../components/Result';
import {
  ANALYSE_USERS_STORAGE_KEY,
  TVASS_USER_ID_STORAGE_KEY,
  getFavouriteListingPageLimit,
  runAnalyseFavourites,
} from '../../helpers/analyseFavourites';
import {
  RecommendationsBundle,
  ScoredVideo,
  TOP_CATEGORIES,
  TOP_TAGS_FOR_FILTER,
  TOP_UPLOADERS,
  TasteProfile,
  cacheRecommendations,
  extractProfileFromAnalyseData,
  generateRecommendations,
  getCachedRecommendations,
} from '../../helpers/recommendations';
import { sortVideos } from '../../helpers/videos';

type ResultsTab = 'categories' | 'uploaders';
type SortMode = 'relevance' | 'newest';

const Recommendations = () => {
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [profileResolving, setProfileResolving] = useState(
    () => !!localStorage.getItem(ANALYSE_USERS_STORAGE_KEY),
  );
  const [userIdInput, setUserIdInput] = useState('');
  const [recommendationsBundle, setRecommendationsBundle] = useState<RecommendationsBundle | null>(
    null,
  );
  const [resultsTab, setResultsTab] = useState<ResultsTab>('categories');
  const [sortMode, setSortMode] = useState<SortMode>('relevance');
  const [loading, setLoading] = useState(false);
  const [analyseLoading, setAnalyseLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setUserIdInput(localStorage.getItem(TVASS_USER_ID_STORAGE_KEY) || '');
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(ANALYSE_USERS_STORAGE_KEY);
    if (!stored) {
      setProfileResolving(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const users = JSON.parse(stored);
        if (!users || Object.keys(users).length === 0) {
          if (!cancelled) setProfileResolving(false);
          return;
        }
        const p = await extractProfileFromAnalyseData(users);
        if (!cancelled) {
          setProfile(p);
        }
      } catch {
        /* invalid data */
      } finally {
        if (!cancelled) setProfileResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!profile) return;
    const cached = getCachedRecommendations(profile);
    if (cached) setRecommendationsBundle(cached);
  }, [profile]);

  const handleGenerate = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setRecommendationsBundle(null);
    try {
      const results = await generateRecommendations(profile, setStatus);
      setRecommendationsBundle(results);
      cacheRecommendations(results, profile);
      setStatus('');
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      setStatus('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const handleAnalyseFavourites = useCallback(async () => {
    const uid = userIdInput.trim();
    if (!uid) {
      setStatus('Enter your ThisVid User ID (the number in your profile URL).');
      return;
    }

    try {
      const pageLimit = await getFavouriteListingPageLimit(uid);
      if (pageLimit > 10) {
        const ok = window.confirm(
          `You have ${pageLimit} pages of favourites. This will take a while. Continue?`,
        );
        if (!ok) return;
      }
    } catch {
      setStatus('Could not read your favourites listing. Check the User ID.');
      return;
    }

    setAnalyseLoading(true);
    setStatus('Starting analysis…');
    setRecommendationsBundle(null);
    try {
      localStorage.setItem(TVASS_USER_ID_STORAGE_KEY, uid);
      const users = await runAnalyseFavourites(uid, {
        onProgress: (done, total) => {
          setStatus(`Analysing favourites: page ${done} / ${total}…`);
        },
      });
      localStorage.setItem(ANALYSE_USERS_STORAGE_KEY, JSON.stringify(users));
      const p = await extractProfileFromAnalyseData(users);
      setProfile(p);
      setStatus('');
    } catch (error) {
      console.error('Analyse failed:', error);
      setStatus('Analysis failed. Check your User ID and connection, then try again.');
    } finally {
      setAnalyseLoading(false);
    }
  }, [userIdInput]);

  const busy = loading || analyseLoading;
  const noProfile = !profile && !busy && !profileResolving;

  const sortedRecommendationsList = useMemo(() => {
    if (!recommendationsBundle) return [];
    const raw =
      resultsTab === 'categories'
        ? recommendationsBundle.fromCategories
        : recommendationsBundle.fromUploaders;
    const copy = [...raw];
    if (sortMode === 'relevance') {
      copy.sort((a, b) => b.score - a.score || b.views - a.views);
    } else {
      sortVideos(copy, 'newest');
    }
    return copy;
  }, [recommendationsBundle, resultsTab, sortMode]);

  const rawRecommendationsList: ScoredVideo[] = recommendationsBundle
    ? resultsTab === 'categories'
      ? recommendationsBundle.fromCategories
      : recommendationsBundle.fromUploaders
    : [];

  const resultsSectionLabel =
    resultsTab === 'categories' ? 'Categories & tags' : 'From your top uploaders';

  return (
    <>
      <Header backButtonUrl="/" showPreferences={true} />
      <div className="container">
        <div className="form-container recommendations-form-shell">
          <div className="recommendations-form-main">
            <h2>Recommendations</h2>

            {profileResolving && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="small-loading-spinner"></div>
                <span>Loading your taste profile…</span>
              </div>
            )}

            {noProfile && (
              <div className="container-section">
                <p>
                  We analyse your ThisVid favourites (categories, tags, uploaders) to recommend new
                  videos. Your User ID is saved only after you run analysis.
                </p>
                <div className="form-columns" style={{ marginTop: '12px' }}>
                  <label htmlFor="rec-user-id">ThisVid User ID</label>
                  <input
                    id="rec-user-id"
                    type="text"
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    placeholder="e.g. 12345"
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAnalyseFavourites}
                  disabled={analyseLoading || !userIdInput.trim()}
                  style={{ marginTop: '12px' }}
                >
                  Analyse favourites
                </button>
                <p style={{ color: '#666', fontSize: '0.85em', marginTop: '12px' }}>
                  You can also use the{' '}
                  <a href="/analyse" style={{ color: 'var(--accent-color)' }}>
                    Analyse
                  </a>{' '}
                  page for the same analysis with per-page controls.
                </p>
              </div>
            )}

            {profile && (
              <details className="recommendations-taste-details">
                <summary className="recommendations-taste-summary">Your taste profile</summary>
                <div className="recommendations-taste-details-body">
                  {profile.categories.length > 0 && (
                    <>
                      <p>
                        <strong>Top categories</strong>
                      </p>
                      <ul>
                        {profile.categories.slice(0, TOP_CATEGORIES).map((c) => (
                          <li key={c.name}>
                            {c.name} ({c.count})
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {profile.tags.length > 0 && (
                    <>
                      <p>
                        <strong>Top tags</strong> (used to filter recommendations)
                      </p>
                      <ul>
                        {profile.tags.slice(0, TOP_TAGS_FOR_FILTER).map((t) => (
                          <li key={t.name}>
                            {t.name} ({t.count})
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {profile.uploaders.length > 0 && (
                    <>
                      <p>
                        <strong>Top uploaders</strong>
                      </p>
                      <ul>
                        {profile.uploaders.slice(0, TOP_UPLOADERS).map((u) => (
                          <li key={u.username}>
                            {u.username} ({u.count})
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <p style={{ color: '#666', fontSize: '0.85em' }}>
                    Based on {profile.totalVideos} analysed favourites.
                  </p>
                </div>
              </details>
            )}

            {busy && (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}
              >
                <div className="small-loading-spinner"></div>
                <span>{status}</span>
              </div>
            )}
          </div>

          {profile && (
            <div className="recommendations-form-footer">
              <button onClick={handleGenerate} disabled={loading}>
                {recommendationsBundle !== null
                  ? 'Refresh recommendations'
                  : 'Get recommendations'}
              </button>
            </div>
          )}
        </div>

        <div className={`results-container ${busy ? 'inactive' : ''}`}>
          <div className="results-scroll-container">
            <h2>Recommendations</h2>

            {recommendationsBundle !== null && (
              <>
                <div className="filter-buttons" style={{ marginBottom: '12px' }}>
                  <button
                    type="button"
                    disabled={resultsTab === 'categories'}
                    onClick={() => setResultsTab('categories')}
                  >
                    Categories & tags ({recommendationsBundle.fromCategories.length})
                  </button>
                  <button
                    type="button"
                    disabled={resultsTab === 'uploaders'}
                    onClick={() => setResultsTab('uploaders')}
                  >
                    From uploaders ({recommendationsBundle.fromUploaders.length})
                  </button>
                </div>
                <div className="results-header" style={{ marginBottom: '12px' }}>
                  <label htmlFor="recommendations-sort">Sort</label>
                  <select
                    id="recommendations-sort"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                  >
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest</option>
                  </select>
                </div>
              </>
            )}

            {!recommendationsBundle && !busy && (
              <p style={{ color: '#666' }}>
                {profile
                  ? 'Click "Get recommendations" to discover new videos based on your taste profile.'
                  : 'Set up your taste profile first to get personalised recommendations.'}
              </p>
            )}

            {recommendationsBundle !== null && (
              <>
                {rawRecommendationsList.length > 0 ? (
                  <p style={{ color: '#666', marginBottom: '8px' }}>
                    {rawRecommendationsList.length} from {resultsSectionLabel}
                    {sortMode === 'newest' ? ', sorted by newest' : ', sorted by relevance'}
                  </p>
                ) : (
                  <p style={{ color: '#666', marginBottom: '8px' }}>
                    No matches in this section (try refreshing or expanding your analysis).
                  </p>
                )}
                <div className="results">
                  {sortedRecommendationsList.map((video) => (
                    // @ts-ignore
                    <LazyLoadComponent height={150} key={video.url}>
                      <Result
                        title={video.title}
                        url={video.url}
                        isPrivate={video.isPrivate}
                        duration={video.duration}
                        imageSrc={video.avatar}
                        date={video.date}
                        views={video.views}
                        page={video.page}
                        relevance={Math.round(video.score)}
                        uploader={video.matchReasons.slice(0, 3).join(', ')}
                      />
                    </LazyLoadComponent>
                  ))}
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default Recommendations;
