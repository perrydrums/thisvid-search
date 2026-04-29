import React, { useEffect, useMemo, useRef, useState } from 'react';
import LoadingBar from 'react-top-loading-bar';

import '../../components/v2/tokens.css';
import { Button } from '../../components/v2/atoms/Button';
import { Badge } from '../../components/v2/atoms/Badge';
import { AdvancedScoringSection } from '../../components/v2/organisms/AdvancedScoringSection';
import { MoodTermsCard } from '../../components/v2/organisms/MoodTermsCard';
import { PrimaryParametersCard } from '../../components/v2/organisms/PrimaryParametersCard';
import { ResultsPreviewGrid } from '../../components/v2/organisms/ResultsPreviewGrid';
import { SearchModeTabs } from '../../components/v2/organisms/SearchModeTabs';
import { Sidebar, SearchMode } from '../../components/v2/organisms/Sidebar';
import { TopNav } from '../../components/v2/organisms/TopNav';
import { getCategories } from '../../helpers/getCategories';
import { Modes, Types } from '../../helpers/types';
import { getUsername } from '../../helpers/users';
import { useSearchLogic } from '../../hooks/useSearchLogic';
import { useSearchState } from '../../hooks/useSearchState';
import { useVideoFiltering } from '../../hooks/useVideoFiltering';

import styles from './SearchV2.module.css';

const modes: Modes = {
  newest: 'Newest videos',
  user: 'User ID',
  friend: 'Friend',
  category: 'Category',
  tags: 'Tags',
  extreme: 'Extreme',
  friendsEvents: "What's New",
};

const types: Types = {
  newest: [
    { value: 'newest', label: 'Straight' },
    { value: 'new-private', label: 'Straight (Private)' },
    { value: 'gay-newest', label: 'Gay' },
    { value: 'gay-private', label: 'Gay (Private)' },
  ],
  category: [
    { value: 'most-popular', label: 'Popular' },
    { value: 'latest', label: 'Newest' },
  ],
  tags: [
    { value: 'popular', label: 'Popular' },
    { value: 'latest', label: 'Newest' },
  ],
  user: [
    { value: 'public', label: 'Public' },
    { value: 'private', label: 'Private' },
    { value: 'favourite', label: 'Favorite' },
  ],
  friend: [
    { value: 'public', label: 'Public' },
    { value: 'private', label: 'Private' },
    { value: 'favourite', label: 'Favorite' },
  ],
  extreme: [
    { value: 'female-extreme', label: 'Straight' },
    { value: 'male-extreme', label: 'Gay' },
  ],
};

const SearchV2 = () => {
  const searchState = useSearchState({ defaultMode: 'user' });
  const videoFiltering = useVideoFiltering({
    params: searchState.params,
    searchObject: searchState.searchObject,
  });

  const {
    setId,
    setCategories,
    setMoods,
    setErrorMessage,
    setFinished,
    setSearchObject,
    setProgressCount,
  } = searchState;

  const [userIds, setUserIds] = useState<string[]>(() =>
    searchState.params.id ? [String(searchState.params.id)] : [],
  );
  const userIdsRef = useRef(userIds);
  userIdsRef.current = userIds;

  const [userIdChipLabel, setUserIdChipLabel] = useState<Record<string, string>>({});

  const resultsRef = useRef<HTMLDivElement>(null);
  const executeScroll = () => resultsRef.current?.scrollIntoView({ behavior: 'smooth' });

  const searchLogic = useSearchLogic({
    mode: searchState.mode,
    type: searchState.type,
    id: searchState.id,
    friendId: searchState.friendId,
    primaryTag: searchState.primaryTag,
    category: searchState.category,
    minDuration: videoFiltering.minDuration,
    quick: videoFiltering.quick,
    omitPrivate: videoFiltering.omitPrivate,
    preserveResults: videoFiltering.preserveResults,
    rawVideos: videoFiltering.rawVideos,
    includeTags: videoFiltering.includeTags,
    advanced: true,
    amount: searchState.amount,
    setLoading: searchState.setLoading,
    setProgressCount,
    setRawVideos: videoFiltering.setRawVideos,
    setFinished,
    setErrorMessage,
    setPageLimit: searchState.setPageLimit,
    setAmount: searchState.setAmount,
    setSourceExists: searchState.setSourceExists,
    setUsername: searchState.setUsername,
    setFriends: searchState.setFriends,
    setSearchObject,
    executeScroll,
  });

  useEffect(() => {
    setId(userIds[0] || '');
  }, [userIds, setId]);

  useEffect(() => {
    const ids = userIds.map((u) => u.trim()).filter(Boolean);
    setUserIdChipLabel((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (!ids.includes(k)) delete next[k];
      });
      return next;
    });

    ids.forEach((uid) => {
      getUsername(uid).then((name) => {
        if (!userIdsRef.current.includes(uid)) return;
        const t = name?.trim();
        const label = t && t.length > 0 ? `${t} (${uid})` : uid;
        setUserIdChipLabel((prev) => (prev[uid] === label ? prev : { ...prev, [uid]: label }));
      });
    });
  }, [userIds]);

  const resolveUserChipDisplay = useMemo(() => {
    const labels = userIdChipLabel;
    return (uid: string) => labels[uid] ?? uid;
  }, [userIdChipLabel]);

  useEffect(() => {
    const title = 'ThisVid ASS';
    switch (searchState.mode) {
      case 'user':
        document.title = `${searchState.username || 'User'}'s ${searchState.type} videos — ${title}`;
        break;
      case 'tags':
        document.title = `Tag "${searchState.primaryTag}" — ${title}`;
        break;
      case 'category':
        document.title = `${(searchState.category || 'Category').replace(/-/g, ' ')} — ${title}`;
        break;
      case 'extreme':
        document.title = `Extreme — ${title}`;
        break;
      default:
        document.title = title;
    }
  }, [searchState.mode, searchState.username, searchState.type, searchState.category, searchState.primaryTag]);

  useEffect(() => {
    getCategories().then((categories) => {
      const filtered =
        searchState.categoryType === 'straight'
          ? categories.filter((c) => c.orientation === 'straight')
          : searchState.categoryType === 'gay'
            ? categories.filter((c) => c.orientation === 'gay')
            : categories;
      setCategories(filtered);
    });

    const m = ((p) => (p ? JSON.parse(p) : []))(localStorage.getItem('tvass-moods'));
    setMoods([{ name: 'Select a mood' }, ...m]);
  }, [searchState.categoryType, setCategories, setMoods]);

  useEffect(() => {
    if (searchState.moods.length === 0) return;

    const mood = searchState.moods.find((m) => m.name === videoFiltering.activeMood);

    if (mood?.name === 'Select a mood') {
      videoFiltering.clearMoodPreferences();
      return;
    }

    const preferences = mood?.preferences;

    if (!preferences) {
      return;
    }

    videoFiltering.applyMoodPreferences(preferences);
    // Same pattern as SearchRefactored — applyMoodPreferences identity is not stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoFiltering.activeMood, searchState.moods]);
  useEffect(() => {
    if (searchState.id) {
      searchLogic.updateUsername();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchState.mode, searchState.id]);

  useEffect(() => {
    searchLogic.getPageLimit();
    // Mirror SearchRefactored dependency list — getPageLimitUrl changes with these inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchState.sourceExists,
    searchState.type,
    searchState.mode,
    searchState.id,
    searchState.friendId,
    searchState.category,
    searchState.primaryTag,
  ]);

  useEffect(() => {
    if (searchState.params.run) {
      searchLogic.run(Number(searchState.params.start) || 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleV2Mode = (m: SearchMode) => {
    searchState.setMode(m);
    const opts = types[m];
    if (opts?.length) {
      searchState.setType(opts[0].value);
    }
  };

  const typeOptions = useMemo(() => {
    const m = searchState.mode as keyof Types;
    return types[m] || types.user;
  }, [searchState.mode]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setFinished(false);
    setSearchObject(null);
    searchLogic.run(searchState.start);
  };

  const getShareUrl = () => {
    const params = new URLSearchParams({
      mode: searchState.mode,
      activeMood: videoFiltering.activeMood,
      type: searchState.type,
      tags: videoFiltering.includeTags.join(','),
      excludeTags: videoFiltering.excludeTags.join(','),
      boosterTags: videoFiltering.boosterTags.join(','),
      diminishingTags: videoFiltering.diminishingTags.join(','),
      amount: String(searchState.amount),
      minDuration: String(videoFiltering.minDuration),
      primaryTag: searchState.primaryTag,
      category: searchState.category,
      id: searchState.id,
      friendId: searchState.friendId,
      termsOperator: videoFiltering.termsOperator,
      orderBy: videoFiltering.sort,
      start: String(searchState.start),
      run: 'true',
    });
    return `${window.location.origin}/search-v2?${params.toString()}`;
  };

  const v2Mode = searchState.mode as SearchMode;
  const isV2Mode = ['user', 'category', 'tags', 'extreme'].includes(searchState.mode);

  return (
    <div className={`v2-root ${styles.page}`}>
      <LoadingBar
        progress={
          searchState.progressCount
            ? Math.round((searchState.progressCount / searchState.amount) * 100)
            : 0
        }
        color="var(--v2-accent, #ff003c)"
        height={8}
        onLoaderFinished={() => setProgressCount(0)}
      />
      <TopNav />
      {isV2Mode && (
        <div className={styles.hiddenSm}>
          <Sidebar mode={v2Mode} onModeChange={handleV2Mode} />
        </div>
      )}

      <main className={styles.main}>
        <form className={styles.formBlock} onSubmit={submit}>
          <div className={styles.titleRow}>
            <h1 className={styles.heroTitle}>Advanced Search Engine</h1>
            <Badge>Pro Status</Badge>
          </div>

          {isV2Mode && (
            <div className={styles.tabsBlock}>
              <SearchModeTabs mode={v2Mode} onModeChange={handleV2Mode} />
            </div>
          )}

          {!isV2Mode && (
            <p className={styles.error}>
              This layout is optimized for User / Category / Tags / Extreme. Current mode:{' '}
              <strong>{modes[searchState.mode]}</strong>. Use the classic{' '}
              <a href="/search">/search</a> page for other modes.
            </p>
          )}

          {searchState.errorMessage && <p className={styles.error}>{searchState.errorMessage}</p>}

          {isV2Mode && (
            <>
              <div className={styles.grid12}>
                <PrimaryParametersCard
                  mode={v2Mode}
                  userIds={userIds}
                  onUserIdsChange={setUserIds}
                  minDuration={videoFiltering.minDuration}
                  onMinDurationChange={videoFiltering.setMinDuration}
                  typeOptions={typeOptions}
                  type={searchState.type}
                  onTypeChange={searchState.setType}
                  primaryTag={searchState.primaryTag}
                  onPrimaryTagChange={searchState.setPrimaryTag}
                  categories={searchState.categories}
                  category={searchState.category}
                  categoryType={searchState.categoryType}
                  onPickCategoryType={(v) => searchState.setCategoryType(v)}
                  onCategorySlugChange={searchState.setCategory}
                  resolveUserChipDisplay={resolveUserChipDisplay}
                />
                <MoodTermsCard
                  moods={searchState.moods}
                  activeMood={videoFiltering.activeMood}
                  onActiveMoodChange={videoFiltering.setActiveMood}
                  includeTags={videoFiltering.includeTags}
                  onIncludeTagsChange={videoFiltering.setIncludeTags}
                />
              </div>

              <AdvancedScoringSection
                boosterTags={videoFiltering.boosterTags}
                onBoosterChange={videoFiltering.setBoosterTags}
                diminishingTags={videoFiltering.diminishingTags}
                onDiminishingChange={videoFiltering.setDiminishingTags}
                excludeTags={videoFiltering.excludeTags}
                onExcludeChange={videoFiltering.setExcludeTags}
              />

              <div className={styles.actions}>
                <Button type="submit" variant="primary" size="large">
                  Run search
                </Button>
                <div className={styles.pagesReadout} aria-live="polite">
                  <span className={styles.pagesReadoutLabel}>Pages</span>
                  <span className={styles.pagesReadoutValue}>{searchState.amount}</span>
                </div>
              </div>
            </>
          )}
        </form>

        <div className={styles.resultsBlock} ref={resultsRef}>
          {isV2Mode && (
            <ResultsPreviewGrid
              videos={videoFiltering.videos}
              userId={searchState.id}
              username={searchState.username}
              sort={videoFiltering.sort}
              onSortChange={videoFiltering.setSort}
            />
          )}
          <p className={styles.footerNote}>
            Prefer the classic UI? <a href="/search">Open /search</a>
            {' · '}
            <a href={getShareUrl()}>Sharable link (with run=true)</a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default SearchV2;
