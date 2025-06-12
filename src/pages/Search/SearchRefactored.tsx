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
import { Modes, Types } from '../../helpers/types';

const modes: Modes = {
  newest: 'Newest videos',
  user: 'User ID',
  friend: 'Friend',
  category: 'Category',
  tags: 'Tags',
  extreme: 'Extreme',
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

const SearchRefactored = () => {
  // Custom hooks for state management
  const searchState = useSearchState();
  const videoFiltering = useVideoFiltering({ params: searchState.params });

  const resultsRef = useRef<HTMLDivElement>(null);
  const executeScroll = () => resultsRef.current?.scrollIntoView();

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
          ? categories.slice(0, 40)
          : searchState.categoryType === 'gay'
          ? categories.slice(40)
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
      searchLogic.run(Number(searchState.params.start) || 1);
    }
  }, []);

  // Form submission handler
  const submit = (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    e.preventDefault();
    searchState.setErrorMessage('');
    searchState.setFinished(false);
    searchState.setSearchObject(null);

    if (
      (e.nativeEvent.submitter as SubmitEvent['submitter'] as HTMLInputElement)?.name === 'next'
    ) {
      searchLogic.run(searchState.start + searchState.amount);
      searchState.setStart(searchState.start + searchState.amount);
      return;
    }
    searchLogic.run(searchState.start);
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

              <TypeSelector mode={searchState.mode} type={searchState.type} setType={searchState.setType} types={types} />
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

export default SearchRefactored;
