import cheerio from 'cheerio';
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import LoadingBar from 'react-top-loading-bar';

import '../../App.css';
import Feedback from '../../components/Feedback';
import ResultsContainer from '../../components/ResultsContainer';
import CategoriesContainer from '../../components/ResultsContainer/CategoriesContainer';
import FriendsContainer from '../../components/ResultsContainer/FriendsContainer';
import Share from '../../components/Share';
import InputTags from '../../components/input/Tags';
import { getCategories } from '../../helpers/getCategories';
import { getFriends } from '../../helpers/getFriends';
import { log } from '../../helpers/supabase/log';
import { Category, Friend, LogParams, Modes, Mood, Types, Video } from '../../helpers/types';
import { getVideos, sortVideos } from '../../helpers/videos';

const modes: Modes = {
  newest: 'Newest videos',
  user: 'User ID',
  friend: 'Friend',
  category: 'Category',
  tags: 'Tags',
};

const types: Types = {
  newest: [
    { value: 'newest', label: 'Straight' },
    { value: 'gay-newest', label: 'Gay' },
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
};

const Search = () => {
  const [searchParams] = useSearchParams();
  const params: {
    [key: string]: any;
  } = {};

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const [mode, setMode] = useState(params.mode || 'category');
  const [id, setId] = useState(params.id || '');
  const [includeTags, setIncludeTags] = useState(params.tags ? params.tags.split(',') : []);
  const [excludeTags, setExcludeTags] = useState(
    params.excludeTags ? params.excludeTags.split(',') : [],
  );
  const [boosterTags, setBoosterTags] = useState(
    params.boosterTags ? params.boosterTags.split(',') : [],
  );
  const [diminishingTags, setDiminishingTags] = useState(
    params.diminishingTags ? params.diminishingTags.split(',') : [],
  );
  const [termsOperator, setTermsOperator] = useState(
    params.termsOperator ? params.termsOperator : 'OR',
  );
  const [primaryTag, setPrimaryTag] = useState(params.primaryTag ? params.primaryTag : '');
  const [category, setCategory] = useState(`${params.category}` || '');
  const [start, setStart] = useState(params.start || 1);
  const [type, setType] = useState(params.type || '');
  const [quick, setQuick] = useState(true);
  const [omitPrivate, setOmitPrivate] = useState(false);
  const [preserveResults, setPreserveResults] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [progressCount, setProgressCount] = useState(0);
  const [amount, setAmount] = useState(params.amount ? params.amount : 30);
  const [minDuration, setMinDuration] = useState(params.minDuration ? params.minDuration : 0);
  const [pageLimit, setPageLimit] = useState(0);
  const [finished, setFinished] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendId, setFriendId] = useState(params.friendId || '');
  const [loading, setLoading] = useState(false);
  const [friendIdFieldHover, setFriendIdFieldHover] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [sourceExists, setSourceExists] = useState(true);
  const [sort, setSort] = useState(params.orderBy ? params.orderBy : 'relevance');
  const [username, setUsername] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [searchObject, setSearchObject] = useState<LogParams | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [activeMood, setActiveMood] = useState(localStorage.getItem('tvass-default-mood') || '');

  useEffect(() => {
    getCategories().then((categories: Category[]) => {
      setCategories(categories);
    });

    const m = ((p) => (p ? JSON.parse(p) : []))(localStorage.getItem('tvass-moods'));
    setMoods([{ name: 'Select a mood' }, ...m]);

    const u = localStorage.getItem('tvass-user-id');
    if (u && mode === 'friend') {
      setId(u);
    }
  }, [mode]);

  useEffect(() => {
    if (moods.length === 0) {
      return;
    }

    const mood = moods.find((m) => m.name === activeMood);

    if (mood?.name === 'Select a mood') {
      setIncludeTags([]);
      setExcludeTags([]);
      setBoosterTags([]);
      setDiminishingTags([]);
      setMinDuration(0);
      return;
    }

    const preferences = mood?.preferences;

    if (!preferences) {
      return;
    }

    preferences.tags && setIncludeTags(preferences.tags);
    preferences.excludeTags && setExcludeTags(preferences.excludeTags);
    preferences.boosterTags && setBoosterTags(preferences.boosterTags);
    preferences.diminishingTags && setDiminishingTags(preferences.diminishingTags);
    preferences.minDuration && setMinDuration(preferences.minDuration);
  }, [activeMood, moods]);

  useEffect(() => {
    if (params.run) {
      run(Number(params.start) || 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const getPageLimit = async () => {
      if (!id || (mode === 'friend' && !friendId) || !type) {
        return;
      }

      const userId = mode === 'friend' ? friendId : id;

      const userResponse = await fetch(`/members/${userId}/`);

      if (userResponse.status === 404) {
        setErrorMessage(`User ${userId} does not exist.`);
        return;
      }

      const userBody = await userResponse.text();
      const $user = cheerio.load(userBody);

      const username = $user('.profile-menu .headline h2').text() || 'username not found';
      setUsername(username);

      const response = await fetch(`/members/${userId}/${type}_videos/`);

      if (response.status === 404) {
        setErrorMessage(`User ${userId} does not have any ${type} videos.`);
        return;
      }

      const body = await response.text();
      const $ = cheerio.load(body);

      const lastPage =
        parseInt(
          $('li.pagination-last a').text() || $('.pagination-list li:nth-last-child(2) a').text(),
        ) || 1;
      setPageLimit(lastPage);
      setAmount(lastPage);
    };
    getPageLimit();
  }, [mode, id, type, friendId]);

  const resultsRef = useRef<HTMLDivElement>(null);
  const executeScroll = () => resultsRef.current?.scrollIntoView();

  const getFriendsById = async () => {
    setLoading(true);
    const f = await getFriends(id, setAmount, setProgressCount);

    if (f === false) {
      setErrorMessage('User not found');
      return;
    }

    if ((f as Array<Friend>).length === 0) {
      setErrorMessage('No friends found');
      return;
    }

    setFriends(f as Array<Friend>);
    setLoading(false);
    localStorage.setItem('uid', id);
  };

  const getUrl = (page: number): string => {
    const baseUrl: {
      [key: string]: string;
    } = {
      newest: `/${type}/${page}/`,
      user: `/members/${id}/${type}_videos/${page}/`,
      friend: `/members/${friendId}/${type}_videos/${page}/`,
      tags: `/tags/${primaryTag}/${type}-males/${page}/`,
      category: `/categories/${category}/${type}/${page}/`,
    };

    if (mode === 'category' && type === 'latest') {
      return `/categories/${category}/${page}/`;
    }

    return baseUrl[mode] || '';
  };

  const getSourceUrl = () => {
    // Define the base URLs for each search mode
    const baseUrl: {
      [key: string]: string;
    } = {
      newest: `/${type}/`,
      user: `/members/${id}/`,
      friend: `/members/${friendId}/`,
      tags: `/tags/${primaryTag}/`,
      category: `/categories/${category}/`,
    };

    return baseUrl[mode] || '';
  };

  const urlExists = async (url: string) => {
    const response = await fetch(url);
    return response.status !== 404;
  };

  const checkSourceExists = async () => {
    const url = getSourceUrl();
    const exists = await urlExists(url);

    setSourceExists(exists);
  };

  const logSearch = async () => {
    const s: LogParams | null = await log({
      id,
      mode,
      type,
      advanced,
      tags: includeTags,
      pageAmount: amount,
      quick,
      duration: minDuration,
      primaryTag,
      category,
      userId: id,
      friendId,
      resultCount: 0,
    });
    setSearchObject(s);
  };

  const run = async (offset: number) => {
    setLoading(true);
    setProgressCount(0);

    if (!preserveResults) {
      setVideos([]);
    }
    const promises = [];

    // We need this because setting state is async.
    let tempPageLimit = 0;
    let progress = 0;

    const urlFirstPage = getUrl(offset);
    const firstPageExists = await urlExists(urlFirstPage);

    if (!firstPageExists) {
      setFinished(true);
      setErrorMessage(`Page ${offset} does for ${mode} not exist.`);
      return;
    }

    for (let i = offset; i <= offset - 1 + amount; i++) {
      const url = getUrl(i);
      promises.push(
        getVideos({
          url,
          includeTags,
          excludeTags,
          termsOperator,
          boosterTags,
          diminishingTags,
          minDuration,
          quick,
          page: i,
          omitPrivate,
          // eslint-disable-next-line
        }).then((s) => {
          // @ts-ignore
          if (s && s.error === 404) {
            // Set page limit but only if it hasn't been set yet or
            // if the current page limit is lower than the current page.
            if (tempPageLimit === 0 || tempPageLimit > i) {
              tempPageLimit = i - 1;
              setPageLimit(tempPageLimit);
            }
          }
          progress++;
          setProgressCount(progress);
          return s;
        }),
      );
    }

    try {
      // Add all the videos to array and remove duplicates.
      const videos = (await Promise.all(promises)).flat().filter(
        // @ts-ignore
        (value, index, self) => index === self.findIndex((v) => v.url === value.url),
      );

      preserveResults
        ? setVideos((prevVideos) => sortVideos([...prevVideos, ...videos] as Video[], sort))
        : setVideos(sortVideos(videos as Video[], sort));

      setFinished(true);
      executeScroll();
      logSearch();
    } catch (error) {
      console.log('Error: ' + error);
    }

    setLoading(false);
  };

  // Run for the next set of pages.
  const next = () => {
    run(start + amount);
    setStart(start + amount);
  };

  const submit = (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    e.preventDefault();
    setErrorMessage('');
    setFinished(false);
    setSearchObject(null);

    if ((e.nativeEvent as SubmitEvent).submitter?.id === 'share') {
      next();
      return;
    }
    run(start);
  };

  const getShareUrl = () => {
    // @ts-ignore
    const params = new URLSearchParams({
      mode,
      type,
      tags: includeTags.join(','),
      amount,
      minDuration,
      primaryTag,
      category,
      id,
      friendId,
      termsOperator,
      orderBy: sort,
      start,
      run: true,
    });
    return `${window.location.origin}/search?${params.toString()}`;
  };

  return (
    <>
      <LoadingBar
        progress={progressCount ? Math.round((progressCount / amount) * 100) : 0}
        color="var(--accent-color)"
        height={10}
        onLoaderFinished={() => setProgressCount(0)}
      />
      <div className="header">
        <span className="subtitle">
          <a href="/">ThisVid Advanced Search Site</a>
        </span>
      </div>
      <div className="container">
        <div className="form-container">
          <div className="button-columns-3">
            <input
              type="radio"
              id="basic"
              name="mode"
              value="basic"
              checked={!advanced}
              onChange={() => setAdvanced(false)}
            />
            <label className="checkbox-button" htmlFor="basic">
              Basic search
            </label>
            <input
              type="radio"
              id="advanced"
              name="mode"
              value="advanced"
              checked={advanced}
              onChange={() => setAdvanced(true)}
            />
            <label className="checkbox-button" htmlFor="advanced">
              Advanced search
            </label>
          </div>
          <span className="error"> {errorMessage} </span>
          <form onSubmit={submit}>
            <div>
              <div className="form-columns">
                <label htmlFor="mood">
                  Mood{' '}
                  <a className="username" href="/preferences">
                    Manage moods
                  </a>
                </label>
                <div>
                  <div className="select-wrapper">
                    <select
                      id="mood"
                      value={activeMood}
                      onChange={(e) => setActiveMood(e.target.value)}
                      data-tooltip-id="mood"
                    >
                      {moods.map((mood) => {
                        return (
                          <option key={mood.name} value={mood.name}>
                            {mood.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <Tooltip id="mood" className="label-tooltip" place="left-start">
                    Prefill the search options.
                  </Tooltip>
                </div>

                {/*<p>{advanced && (pageLimit !== 0 && `Page Limit: ${pageLimit}`)}</p>*/}
                <label htmlFor="search-mode">Search by</label>
                <div className="select-wrapper">
                  <select id="search-mode" value={mode} onChange={(e) => setMode(e.target.value)}>
                    {Object.keys(modes).map((key) => {
                      return (
                        <option key={key} value={key}>
                          {modes[key]}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {(mode === 'user' || mode === 'friend') && (
                  <>
                    <div>
                      <label htmlFor="id">{mode === 'friend' && 'Your '}User ID</label>
                      {mode === 'user' && username && (
                        <a
                          href={`https://thisvid.com/members/${id}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="username"
                        >
                          {username}
                        </a>
                      )}
                    </div>
                    <input
                      type="text"
                      id="id"
                      value={id}
                      required
                      onChange={(e) => setId(e.target.value)}
                      data-tooltip-id="id"
                    />
                    <Tooltip id="id" className="label-tooltip" place="left-start">
                      The ID of the ThisVid user profile. You can find this in the URL of the
                      profile page on ThisVid.
                    </Tooltip>
                  </>
                )}
                {mode === 'friend' && (
                  <>
                    <div>
                      <label htmlFor="friendId">
                        <span>Choose Friend</span>
                      </label>
                      {friendId && (
                        <a
                          href={`https://thisvid.com/members/${friendId}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="username"
                        >
                          {friends.find((friend) => friend.uid === friendId)?.username}
                        </a>
                      )}
                    </div>
                    {friends.length === 0 ? (
                      <button type="button" onClick={getFriendsById} disabled={id === ''}>
                        Get Friends
                      </button>
                    ) : (
                      <input
                        type="text"
                        readOnly={true}
                        required={true}
                        id="friendId"
                        placeholder="Choose friend"
                        value={
                          friendIdFieldHover
                            ? 'Change friend'
                            : friends.find((friend) => friend.uid === friendId)?.username || ''
                        }
                        onClick={() => setFriendId(null)}
                        onMouseEnter={() => setFriendIdFieldHover(true)}
                        onMouseLeave={() => setFriendIdFieldHover(false)}
                        style={{ cursor: 'pointer' }}
                      />
                    )}
                  </>
                )}
                {mode === 'category' && (
                  <>
                    <label htmlFor="category">Category</label>
                    <div className="select-wrapper select-wrapper-alt">
                      <input
                        type="text"
                        readOnly={true}
                        required={true}
                        id="category"
                        placeholder="Choose category"
                        value={categories.find((c) => c.slug === category)?.name || ''}
                        onClick={() => setCategory('')}
                        onMouseEnter={() => setFriendIdFieldHover(true)}
                        onMouseLeave={() => setFriendIdFieldHover(false)}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  </>
                )}
                {mode === 'tags' && (
                  <>
                    <label htmlFor="primary-tag">
                      Primary Tag {!sourceExists && 'Tag does not exist'}
                    </label>
                    <input
                      type="text"
                      id="primary-tag"
                      value={primaryTag}
                      required
                      onChange={(e) => setPrimaryTag(e.target.value.toLowerCase())}
                      onBlur={checkSourceExists}
                    />
                  </>
                )}
                <label htmlFor="type">Type</label>
                <div className="select-wrapper">
                  <select value={type} id="type" required onChange={(e) => setType(e.target.value)}>
                    <option disabled value="">
                      {' '}
                      - Select -
                    </option>
                    {types[mode].map(({ value, label }) => {
                      return (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div className="form-columns form-columns-group">
                <label htmlFor="tags">Title</label>
                <InputTags
                  tags={includeTags}
                  setTags={setIncludeTags}
                  tooltip={`Find videos with ${
                    termsOperator === 'AND' ? 'all' : 'any'
                  } of these words in the title.`}
                />
                {advanced && (
                  <>
                    <label htmlFor="tags-operator">Operator</label>
                    <div>
                      <div className="select-wrapper">
                        <select
                          id="tags-operator"
                          value={termsOperator}
                          required
                          onChange={(e) => setTermsOperator(e.target.value)}
                          data-tooltip-id="tags-operator-tooltip"
                        >
                          <option value="OR">OR</option>
                          <option value="AND">AND</option>
                        </select>
                      </div>
                      <Tooltip
                        id="tags-operator-tooltip"
                        className="label-tooltip"
                        place="left-start"
                      >
                        OR will return videos that contain <b>any</b> of the tags. AND will return
                        videos that contain <b>all</b> of the tags.
                      </Tooltip>
                    </div>

                    <label htmlFor="exclude-tags">Title does not contain</label>
                    <InputTags
                      htmlId="exclude-tags"
                      tags={excludeTags}
                      setTags={setExcludeTags}
                      tooltip="Videos with these tags will be excluded from the search results."
                    />
                    <label htmlFor="booster-tags">Booster tags</label>
                    <InputTags
                      htmlId="booster-tags"
                      tags={boosterTags}
                      setTags={setBoosterTags}
                      tooltip="Videos with these tags will be boosted to the top of the search results, when sorting by relevance."
                    />
                    <label htmlFor="diminishing-tags">Diminishing tags</label>
                    <InputTags
                      htmlId="diminishing-tags"
                      tags={diminishingTags}
                      setTags={setDiminishingTags}
                      tooltip="Videos with these tags will be lower in the search results, when sorting by relevance."
                    />
                  </>
                )}
              </div>
              <div className="form-columns">
                {advanced && (
                  <>
                    <label htmlFor="start">Start Page</label>
                    <input
                      type="number"
                      id="start"
                      value={start}
                      required
                      onChange={(e) => setStart(parseInt(e.target.value))}
                    />
                  </>
                )}
                <label htmlFor="min-duration">Min Duration (minutes)</label>
                <input
                  type="number"
                  min="0"
                  id="min-duration"
                  value={minDuration}
                  onChange={(e) => setMinDuration(parseInt(e.target.value) || null)}
                />
                <label htmlFor="amount">Number of Pages</label>
                <input
                  type="number"
                  min="0"
                  max={pageLimit || 100}
                  id="amount"
                  value={amount}
                  required
                  onChange={(e) => setAmount(parseInt(e.target.value))}
                />
              </div>
            </div>
            <div>
              <div className="button-columns-3" style={{ margin: '12px 0' }}>
                <div>
                  <input
                    type="checkbox"
                    id="quick"
                    checked={quick}
                    onChange={() => setQuick(!quick)}
                    disabled={true}
                  />
                  <label htmlFor="quick" className="checkbox-button">
                    Quick Search
                  </label>
                </div>
                <div>
                  <input
                    type="checkbox"
                    id="preserve-results"
                    checked={preserveResults}
                    onChange={() => setPreserveResults(!preserveResults)}
                  />
                  <label htmlFor="preserve-results" className="checkbox-button">
                    Preserve Results
                  </label>
                </div>
                {(type === 'favourite' || mode !== 'user') && (
                  <div>
                    <input
                      type="checkbox"
                      id="omit-private"
                      checked={omitPrivate}
                      onChange={() => setOmitPrivate(!omitPrivate)}
                    />
                    <label htmlFor="omit-private" className="checkbox-button">
                      No Private Videos
                    </label>
                  </div>
                )}
              </div>
              <div className="button-columns">
                <button type="submit" name="run">
                  Run
                </button>
                <button
                  type="submit"
                  name="next"
                  disabled={start + amount > pageLimit && pageLimit !== 0}
                >
                  Next
                </button>
              </div>
            </div>
          </form>
        </div>
        <div className={`results-container ${loading ? 'inactive' : ''}`} ref={resultsRef}>
          {mode === 'category' && !category && (
            <>
              <div className="results-header">
                <h2>Select a category</h2>
              </div>
              <CategoriesContainer categories={categories} setCategory={setCategory} />
            </>
          )}
          {mode === 'friend' && !friendId ? (
            <>
              <div className="results-header">
                {loading ? (
                  <span>Collecting friends...</span>
                ) : finished ? (
                  `Found ${friends.length} friends`
                ) : (
                  <span></span>
                )}
                <div>
                  <input
                    type="text"
                    id="friend-search"
                    value={friendSearch}
                    placeholder="Username"
                    onChange={(e) => setFriendSearch(e.target.value)}
                    disabled={friends.length === 0}
                  />
                </div>
              </div>
              <FriendsContainer
                friends={friends}
                setFriendId={setFriendId}
                filterUsername={friendSearch}
              />
            </>
          ) : (
            <>
              <div className="results-header">
                <h2>
                  {loading
                    ? 'Searching...'
                    : finished
                    ? `Found ${videos.length} videos`
                    : 'Search for videos'}
                </h2>
                {searchObject && (
                  <>
                    <Feedback search={searchObject} />
                    <Share url={getShareUrl()} />
                  </>
                )}
                <div>
                  <label htmlFor="sort">Sort by</label>
                  <select
                    id="sort"
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);
                      setVideos(sortVideos(videos, e.target.value));
                    }}
                  >
                    <option value="relevance">Relevance</option>
                    <option value="views">Views</option>
                    <option value="newest">
                      Page {start} → {amount}
                    </option>
                    <option value="oldest">
                      Page {start} ← {amount}
                    </option>
                    <option value="longest">Longest</option>
                    <option value="shortest">Shortest</option>
                  </select>
                </div>
              </div>
              <ResultsContainer videos={videos} />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Search;
