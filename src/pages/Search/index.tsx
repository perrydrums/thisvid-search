import React, { useEffect, useRef } from 'react';
import LoadingBar from 'react-top-loading-bar';

import '../../App.css';
import Header from '../../components/Header';
import { SearchResults } from '../../components/SearchResults';
import {
  ModeSelector,
  MoodSelector,
  UserIdInput,
  TypeSelector,
  CategoryInput,
  SearchFilters,
  SearchOptions,
} from '../../components/SearchForm';

import { useSearchState } from '../../hooks/useSearchState';
import { useVideoFiltering } from '../../hooks/useVideoFiltering';
import { useSearchLogic } from '../../hooks/useSearchLogic';

import { getCategories } from '../../helpers/getCategories';
import { Modes, Types, Video } from '../../helpers/types';

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
    { value: 'favourite', label: 'Favourites' },
  ],
  friend: [
    { value: 'public', label: 'Public' },
    { value: 'private', label: 'Private' },
    { value: 'favourite', label: 'Favourites' },
  ],
  extreme: [
    { value: 'female-extreme', label: 'Straight' },
    { value: 'male-extreme', label: 'Gay' },
  ],
};

const Search = () => {
  // Custom hooks for state management
  const searchState = useSearchState();
  const videoFiltering = useVideoFiltering({
    params: searchState.params,
    searchObject: searchState.searchObject,
  });

  const resultsRef = useRef<HTMLDivElement>(null);
  const executeScroll = () => resultsRef.current?.scrollIntoView();

  // Enrich videos with tags, category, and thumbnail
  const enrichVideos = async (friendsEventsVideos: any[], mappedVideos: Video[]) => {
    searchState.setEnriching(true);
    searchState.setEnrichmentProgress(0);

    const batchSize = 5;
    let enrichedCount = 0;

    for (let i = 0; i < friendsEventsVideos.length; i += batchSize) {
      const batch = friendsEventsVideos.slice(i, i + batchSize);

      const enrichmentPromises = batch.map(async (video) => {
        try {
          const response = await fetch(`/videoDetails?url=${encodeURIComponent(video.url)}`);
          const data = await response.json();

          if (data.success) {
            return {
              ...video,
              category: data.category || '',
            };
          }
          return video;
        } catch (err) {
          console.error(`Error enriching video ${video.url}:`, err);
          return video;
        }
      });

      const enrichedBatch = await Promise.all(enrichmentPromises);

      // Update rawVideos with enriched data
      videoFiltering.setRawVideos((prevVideos) => {
        const updated = prevVideos.map((v) => {
          return v; // basically triggers rerender
        });
        return updated;
      });

      // Update enriched videos data map with category information
      searchState.setEnrichedVideosData((prevMap) => {
        const newMap = new Map(prevMap);
        enrichedBatch.forEach((enriched) => {
          if (enriched.category) {
            newMap.set(enriched.url, { category: enriched.category });
          }
        });
        return newMap;
      });

      enrichedCount += enrichedBatch.length;
      searchState.setEnrichmentProgress(enrichedCount);
    }

    searchState.setEnriching(false);
  };

  // Load friendsEvents videos from localStorage when mode is friendsEvents
  useEffect(() => {
    if (searchState.mode === 'friendsEvents') {
      const stored = localStorage.getItem('tvass-whats-new-videos');
      if (stored) {
        try {
          const parsedVideos = JSON.parse(stored);
          const mappedVideos: Video[] = parsedVideos.map((video: any) => ({
            title: video.title,
            url: video.url,
            isPrivate: false,
            duration: '',
            avatar: video.thumbnail || '',
            views: 0,
            date: '',
            relevance: 0,
            page: 1,
          }));
          videoFiltering.setRawVideos(mappedVideos);
          searchState.setFinished(true);

          enrichVideos(parsedVideos, mappedVideos);
        } catch (err) {
          console.error('Error parsing stored videos:', err);
        }
      }
    } else {
      searchState.setFinished(false);
    }
  }, [searchState.mode]);

  // Search logic hook
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
    advanced: searchState.advanced,
    amount: searchState.amount,
    setLoading: searchState.setLoading,
    setProgressCount: searchState.setProgressCount,
    setRawVideos: videoFiltering.setRawVideos,
    setFinished: searchState.setFinished,
    setErrorMessage: searchState.setErrorMessage,
    setPageLimit: searchState.setPageLimit,
    setAmount: searchState.setAmount,
    setSourceExists: searchState.setSourceExists,
    setUsername: searchState.setUsername,
    setFriends: searchState.setFriends,
    setSearchObject: searchState.setSearchObject,
    executeScroll,
  });

  // Update document title based on the search state
  useEffect(() => {
    const title = 'ThisVid ASS';
    switch (searchState.mode) {
      case 'newest':
        document.title = `Newest videos - ${title}`;
        break;
      case 'user':
        document.title = `${searchState.username}'s ${searchState.type} videos - ${title}`;
        break;
      case 'friend':
        document.title = `${searchState.friendId}'s ${searchState.type} videos - ${title}`;
        break;
      case 'tags':
        document.title = `Tag "${searchState.primaryTag}" videos - ${title}`;
        break;
      case 'category':
        document.title = `${searchState.category
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (char: string) => char.toUpperCase())} videos - ${title}`;
        break;
      case 'extreme':
        document.title = `${searchState.type
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (char: string) => char.toUpperCase())} videos - ${title}`;
        break;
      default:
        document.title = title;
    }
  }, [searchState.mode, searchState.username, searchState.type, searchState.category, searchState.primaryTag, searchState.friendId]);

  // Initialize categories and moods
  useEffect(() => {
    getCategories().then((categories) => {
      const filteredCategories =
        searchState.categoryType === 'straight'
          ? categories.filter((c) => c.orientation === 'straight')
          : searchState.categoryType === 'gay'
          ? categories.filter((c) => c.orientation === 'gay')
          : categories;

      searchState.setCategories(filteredCategories);
    });

    const m = ((p) => (p ? JSON.parse(p) : []))(localStorage.getItem('tvass-moods'));
    searchState.setMoods([{ name: 'Select a mood' }, ...m]);

    const u = localStorage.getItem('tvass-user-id');
    if (u && searchState.mode === 'friend') {
      searchState.setId(u);
    }
  }, [searchState.categoryType, searchState.mode]);

  // Handle mood preferences
  useEffect(() => {
    if (searchState.moods.length === 0) return;

    const mood = searchState.moods.find((m) => m.name === videoFiltering.activeMood);

    if (mood?.name === 'Select a mood') {
      videoFiltering.clearMoodPreferences();
      return;
    }

    if (mood?.preferences) {
      videoFiltering.applyMoodPreferences(mood.preferences);
    }
  }, [videoFiltering.activeMood, searchState.moods]);

  // Clear friend data when mode or id changes
  useEffect(() => {
    if (searchState.mode === 'friend') {
      searchState.setFriendId('');
      searchState.setFriends([]);
    }
  }, [searchState.mode, searchState.id]);

  // Update username when id changes
  useEffect(() => {
    if (searchState.id) {
      searchLogic.updateUsername();
    }
  }, [searchState.mode, searchState.id]);

  // Update page limit when search parameters change
  useEffect(() => {
    searchLogic.getPageLimit();
  }, [searchState.sourceExists, searchState.type, searchState.mode, searchState.id, searchState.friendId, searchState.category, searchState.primaryTag]);

  // Run search on initial load if params.run is set
  useEffect(() => {
    if (searchState.params.run) {
      searchLogic.run(Number(searchState.params.start) || 1, searchState.friendsEventsUsername, searchState.friendsEventsPassword);
    }
  }, []);

  // Form submission handler
  const submit = async (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    e.preventDefault();
    searchState.setErrorMessage('');
    searchState.setFinished(false);
    searchState.setSearchObject(null);

    let result;
    if (
      (e.nativeEvent.submitter as SubmitEvent['submitter'] as HTMLInputElement)?.name === 'next'
    ) {
      result = await searchLogic.run(searchState.start + searchState.amount, searchState.friendsEventsUsername, searchState.friendsEventsPassword);
      searchState.setStart(searchState.start + searchState.amount);
    } else {
      result = await searchLogic.run(searchState.start, searchState.friendsEventsUsername, searchState.friendsEventsPassword);
    }

    if (searchState.mode === 'friendsEvents' && result && result.videos) {
      enrichVideos(result.videos, result.mappedVideos);
    }
  };

  // Generate share URL
  const getShareUrl = () => {
    const params = new URLSearchParams({
      mode: searchState.mode,
      activeMood: videoFiltering.activeMood,
      type: searchState.type,
      tags: videoFiltering.includeTags.join(','),
      excludeTags: videoFiltering.excludeTags.join(','),
      boosterTags: videoFiltering.boosterTags.join(','),
      diminishingTags: videoFiltering.diminishingTags.join(','),
      amount: searchState.amount.toString(),
      minDuration: videoFiltering.minDuration.toString(),
      primaryTag: searchState.primaryTag,
      category: searchState.category,
      id: searchState.id,
      friendId: searchState.friendId,
      termsOperator: videoFiltering.termsOperator,
      orderBy: videoFiltering.sort,
      start: searchState.start.toString(),
      run: 'true',
    });
    return `${window.location.origin}/search?${params.toString()}`;
  };

  return (
    <>
      <LoadingBar
        progress={searchState.progressCount ? Math.round((searchState.progressCount / searchState.amount) * 100) : 0}
        color="var(--accent-color)"
        height={10}
        onLoaderFinished={() => searchState.setProgressCount(0)}
      />
      <Header backButtonUrl="/" showPreferences={true} />
      <div className="container">
        <form onSubmit={submit} className="form-container">
          <div className="button-columns-3">
            <input
              type="radio"
              id="basic"
              name="mode"
              value="basic"
              checked={!searchState.advanced}
              onChange={() => searchState.setAdvanced(false)}
            />
            <label className="checkbox-button" htmlFor="basic">
              Basic search
            </label>
            <input
              type="radio"
              id="advanced"
              name="mode"
              value="advanced"
              checked={searchState.advanced}
              onChange={() => searchState.setAdvanced(true)}
            />
            <label className="checkbox-button" htmlFor="advanced">
              Advanced search
            </label>
          </div>

          <div className="form-container-scroll">
            <div className="form-columns">
              <MoodSelector
                activeMood={videoFiltering.activeMood}
                setActiveMood={videoFiltering.setActiveMood}
                moods={searchState.moods}
              />

              <ModeSelector mode={searchState.mode} setMode={searchState.setMode} modes={modes} />

              <UserIdInput
                mode={searchState.mode}
                id={searchState.id}
                setId={searchState.setId}
                username={searchState.username}
                friendId={searchState.friendId}
                setFriendId={searchState.setFriendId}
                friends={searchState.friends}
                friendIdFieldHover={searchState.friendIdFieldHover}
                setFriendIdFieldHover={searchState.setFriendIdFieldHover}
                getFriendsById={searchLogic.getFriendsById}
              />

              <CategoryInput
                mode={searchState.mode}
                category={searchState.category}
                setCategory={searchState.setCategory}
                categoryType={searchState.categoryType}
                setCategoryType={searchState.setCategoryType}
                categories={searchState.categories}
                friendIdFieldHover={searchState.friendIdFieldHover}
                setFriendIdFieldHover={searchState.setFriendIdFieldHover}
                primaryTag={searchState.primaryTag}
                setPrimaryTag={searchState.setPrimaryTag}
                sourceExists={searchState.sourceExists}
                checkSourceExists={searchLogic.checkSourceExists}
              />

              {searchState.mode === 'friendsEvents' && (
                <>
                  <label htmlFor="friends-events-username">Thisvid Username</label>
                  <input
                    type="text"
                    id="friends-events-username"
                    value={searchState.friendsEventsUsername}
                    onChange={(e) => searchState.setFriendsEventsUsername(e.target.value)}
                    placeholder="Enter your username"
                    disabled={searchState.loading}
                    autoComplete="off"
                    data-1p-ignore
                  />
                  <label htmlFor="friends-events-password">Credential</label>
                  <input
                    type="password"
                    id="friends-events-password"
                    value={searchState.friendsEventsPassword}
                    onChange={(e) => searchState.setFriendsEventsPassword(e.target.value)}
                    placeholder="Enter your credential"
                    disabled={searchState.loading}
                    autoComplete="off"
                    data-1p-ignore
                  />

                  {searchState.enriching && (
                    <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '8px' }}>
                      Enriching videos... {searchState.enrichmentProgress} / {videoFiltering.rawVideos.length}
                    </div>
                  )}
                  {searchState.mode === 'friendsEvents' && videoFiltering.rawVideos.length > 0 && (() => {
                    const allCategories = Array.from(
                      new Set(
                        Array.from(searchState.enrichedVideosData.values())
                          .map((data) => data.category)
                          .filter((cat): cat is string => !!cat)
                      )
                    ).sort();

                    return (
                      <>
                        <label htmlFor="friends-events-category">Category</label>
                        <div className="select-wrapper">
                          <select
                            id="friends-events-category"
                            value={searchState.friendsEventsCategory}
                            onChange={(e) => searchState.setFriendsEventsCategory(e.target.value)}
                          >
                            <option value="">All Categories</option>
                            {allCategories.map((category) => {
                              const count = videoFiltering.rawVideos.filter((v) => {
                                const enriched = searchState.enrichedVideosData.get(v.url);
                                return enriched?.category === category;
                              }).length;
                              return (
                                <option key={category} value={category}>
                                  {category} ({count})
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        {searchState.friendsEventsCategory === '' && searchState.enrichedVideosData.size > 0 && (
                          <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '4px' }}>
                            {Array.from(
                              new Map(
                                Array.from(searchState.enrichedVideosData.values())
                                  .reduce((acc, curr) => {
                                    if (curr.category) {
                                      acc.set(curr.category, (acc.get(curr.category) || 0) + 1);
                                    }
                                    return acc;
                                  }, new Map<string, number>())
                              ).entries()
                            )
                              .sort((a, b) => b[1] - a[1]) // Sort by count descending
                              .slice(0, 5) // Top 5
                              .map(([cat, count]) => `${cat} (${count})`)
                              .join(' • ')}
                          </div>
                        )}
                        {!searchState.enriching && searchState.enrichedVideosData.size < videoFiltering.rawVideos.length && (
                          <button
                            type="button"
                            className="submit-button"
                            onClick={() => enrichVideos(videoFiltering.rawVideos, videoFiltering.rawVideos)}
                            style={{ marginTop: '8px' }}
                          >
                            Enrich Categories & Tags
                          </button>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
              {searchState.mode !== 'friendsEvents' && (
                <TypeSelector mode={searchState.mode} type={searchState.type} setType={searchState.setType} types={types} />
              )}
            </div>

            <SearchFilters
              advanced={searchState.advanced}
              includeTags={videoFiltering.includeTags}
              setIncludeTags={videoFiltering.setIncludeTags}
              excludeTags={videoFiltering.excludeTags}
              setExcludeTags={videoFiltering.setExcludeTags}
              boosterTags={videoFiltering.boosterTags}
              setBoosterTags={videoFiltering.setBoosterTags}
              diminishingTags={videoFiltering.diminishingTags}
              setDiminishingTags={videoFiltering.setDiminishingTags}
              termsOperator={videoFiltering.termsOperator}
              setTermsOperator={videoFiltering.setTermsOperator}
              minDuration={videoFiltering.minDuration}
              setMinDuration={videoFiltering.setMinDuration}
              start={searchState.start}
              setStart={searchState.setStart}
              amount={searchState.amount}
              setAmount={searchState.setAmount}
              pageLimit={searchState.pageLimit}
              omitFavourites={videoFiltering.omitFavourites}
              setOmitFavourites={videoFiltering.setOmitFavourites}
            />
          </div>

          <SearchOptions
            quick={videoFiltering.quick}
            setQuick={videoFiltering.setQuick}
            preserveResults={videoFiltering.preserveResults}
            setPreserveResults={videoFiltering.setPreserveResults}
            omitPrivate={videoFiltering.omitPrivate}
            setOmitPrivate={videoFiltering.setOmitPrivate}
            type={searchState.type}
            mode={searchState.mode}
            start={searchState.start}
            amount={searchState.amount}
            pageLimit={searchState.pageLimit}
          />
        </form>

        <div className={`results-container ${searchState.loading ? 'inactive' : ''}`} ref={resultsRef}>
          <SearchResults
            mode={searchState.mode}
            category={searchState.category}
            categoryType={searchState.categoryType}
            friendId={searchState.friendId}
            loading={searchState.loading}
            finished={searchState.finished}
            videos={videoFiltering.videos}
            setVideos={videoFiltering.setVideos}
            categories={searchState.categories}
            setCategory={searchState.setCategory}
            friends={searchState.friends}
            setFriendId={searchState.setFriendId}
            friendSearch={searchState.friendSearch}
            errorMessage={searchState.errorMessage}
            searchObject={searchState.searchObject}
            sort={videoFiltering.sort}
            setSort={videoFiltering.setSort}
            getShareUrl={getShareUrl}
          />
        </div>
      </div>
    </>
  );
};

export default Search;
