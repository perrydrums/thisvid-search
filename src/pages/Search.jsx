import React, { useRef, useState } from 'react';
import cheerio from 'cheerio';
import '../App.css';
import Result from '../components/Result';
import { getFriends } from '../helpers/getFriends';
import FriendResult from '../components/Result/friendResult';
import debug from '../helpers/debug';
import InputTags from '../components/input/Tags';
import LoadingBar from 'react-top-loading-bar';
import { log } from '../helpers/supabase/log';

const modes = {
  user: 'User ID',
  friend: 'Friend',
  category: 'Category with tags',
  tags: 'Tags',
};

const types = {
  category: [{ value: 'popular', label: 'Popular' }],
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

const categories = [
  { value: 'gay', label: 'Gay' },
  { value: '3d-gay', label: 'Gay 3D' },
  { value: 'gay-asian', label: 'Gay Asian' },
  { value: 'gay-bareback', label: 'Gay Bareback' },
  { value: 'gay-bdsm', label: 'Gay BDSM' },
  { value: 'gay-bear', label: 'Gay Bear' },
  { value: 'gay-big-cock', label: 'Gay Big Cock' },
  { value: 'gay-bizarre', label: 'Gay Bizarre' },
  { value: 'gay-black-men', label: 'Gay Black Men' },
  { value: 'gay-blowjob', label: 'Gay Blowjob' },
  { value: 'gay-feet', label: 'Gay Feet' },
  { value: 'gay-fetish', label: 'Gay Fetish' },
  { value: 'gay-fisting', label: 'Gay Fisting' },
  { value: 'gay-glory-hole', label: 'Gay Glory Hole' },
  { value: 'gay-handjob', label: 'Gay Handjob' },
  { value: 'gay-interracial', label: 'Gay Interracial' },
  { value: 'gay-massage', label: 'Gay Massage' },
  { value: 'gay-muscle-men', label: 'Gay Muscle Men' },
  { value: 'gay-orgy', label: 'Gay Orgy' },
  { value: 'male-pissing', label: 'Gay Pissing' },
  { value: 'male-scat', label: 'Gay Scat' },
  { value: 'gay-smoking', label: 'Gay Smoking' },
  { value: 'gay-twinks', label: 'Gay Twinks' },
  { value: 'male-farting', label: 'Gay Farting' },
  { value: 'male-voyeur', label: 'Gay Voyeur' },
  { value: 'men-flashing', label: 'Gay Flashing' },
  { value: 'str8-guys', label: 'Straight Guys' },
];

const Search = () => {
  const [mode, setMode] = useState('category');
  const [id, setId] = useState(null);
  const [tags, setTags] = useState([]);
  const [termsOperator, setTermsOperator] = useState('OR');
  const [primaryTag, setPrimaryTag] = useState('');
  const [category, setCategory] = useState('gay');
  const [start, setStart] = useState(1);
  const [type, setType] = useState('');
  const [quick, setQuick] = useState(true);
  const [omitPrivate, setOmitPrivate] = useState(false);
  const [preserveResults, setPreserveResults] = useState(false);
  const [videos, setVideos] = useState([]);
  const [progressCount, setProgressCount] = useState(0);
  const [amount, setAmount] = useState(50);
  const [minDuration, setMinDuration] = useState(0);
  const [pageLimit, setPageLimit] = useState(0);
  const [finished, setFinished] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendId, setFriendId] = useState(null);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendIdFieldHover, setFriendIdFieldHover] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [sourceExists, setSourceExists] = useState(true);
  const [sort, setSort] = useState('views');
  const [username, setUsername] = useState('');
  const [advanced, setAdvanced] = useState(false);

  const localUid = localStorage.getItem('uid');
  if (mode === 'friend' && localUid && !id) {
    setId(localUid);
  }

  const resultsRef = useRef(null);
  const executeScroll = () => resultsRef.current.scrollIntoView();

  const getFriendsById = async () => {
    setFriendsLoading(true);
    const f = await getFriends(id);

    if (f === false) {
      setErrorMessage('User not found');
      return;
    }

    if (f.length === 0) {
      setErrorMessage('No friends found');
      return;
    }

    setFriends(f);
    setFriendsLoading(false);
    localStorage.setItem('uid', id);
  };

  const getUrl = (page) => {
    // Define the base URLs for each search mode
    const baseUrl = {
      user: `/members/${id}/${type}_videos/${page}/`,
      friend: `/members/${friendId}/${type}_videos/${page}/`,
      tags: `/tags/${primaryTag}/${type}-males/${page}/`,
      category: `/categories/${category}/most-popular/${page}/`,
    };

    return baseUrl[mode];
  };

  const getSourceUrl = () => {
    // Define the base URLs for each search mode
    const baseUrl = {
      user: `/members/${id}/`,
      friend: `/members/${friendId}/`,
      tags: `/tags/${primaryTag}/`,
      category: `/categories/${category}/`,
    };

    return baseUrl[mode];
  };

  const urlExists = async (url) => {
    const response = await fetch(url);
    return response.status !== 404;
  };

  const checkSourceExists = async () => {
    const url = getSourceUrl();
    const exists = await urlExists(url);

    setSourceExists(exists);
  };

  const getVideos = async (page) => {
    if (pageLimit !== 0 && page > pageLimit) {
      return;
    }

    const url = getUrl(page);

    try {
      const response = await fetch(url);

      if (response.status === 404) {
        return { error: 404 };
      }

      const body = await response.text();
      const $ = cheerio.load(body);

      const urls = [];
      $('.tumbpu').each((i, element) => {
        const isPrivate = $('span', element).first().hasClass('private');
        if (omitPrivate && isPrivate) {
          return;
        }

        // const isFriend = friends.some(friend => friend.uid == 249732);
        const isFriend = false;
        const avatarElement = $('span .lazy-load', element).first();
        const avatar = isPrivate
          ? 'https://placehold.co/100x100/000000/b60707?text=Private+Video'
          : avatarElement.attr('data-original').replace('//', 'https://');

        const viewsHtml = $('.view', element).first().text();
        const views = viewsHtml.match(/\d+/)[0];
        const date = $('.date', element).first().text();

        const duration = $('span span.duration', element).text();
        const [minutes, seconds] = duration.split(':').map(Number);
        const time = minutes * 60 + seconds;

        const title = $(element).attr('title');
        if (quick) {
          const hasAllTags =
            termsOperator === 'AND'
              ? tags.every((tag) => title.toLowerCase().includes(tag.toLowerCase()))
              : tags.some((tag) => title.toLowerCase().includes(tag.toLowerCase()));

          const relevance = tags.reduce((score, tag) => {
            const regex = new RegExp(tag, 'gi');
            return score + (title.match(regex) || []).length;
          }, 0);

          if (hasAllTags || tags.length === 0) {
            if (time >= minDuration * 60) {
              setVideos((prevVideos) => [
                ...prevVideos,
                {
                  title,
                  url: $(element).attr('href'),
                  isPrivate,
                  duration,
                  avatar,
                  views,
                  date,
                  relevance,
                  isFriend,
                  page,
                },
              ]);
            }
          }
        } else {
          if (time >= minDuration * 60) {
            urls.push({
              title,
              url: $(element).attr('href'),
              isPrivate,
              duration,
              avatar,
              views,
              date,
              isFriend,
            });
          }
        }
      });

      if (!quick) {
        for (const video of urls) {
          try {
            const videoUrl = video.url.split('/').slice(3).join('/');
            const response = await fetch(videoUrl);
            const body = await response.text();
            const $ = cheerio.load(body);

            const hasAllTags =
              termsOperator === 'AND'
                ? tags.every((tag) => $(`.description a[title*="${tag}"]`).length > 0)
                : tags.some((tag) => $(`.description a[title*="${tag}"]`).length > 0);

            if (hasAllTags) {
              setVideos((prevVideos) => [
                ...prevVideos,
                {
                  title: video.title,
                  url: video.url,
                  isPrivate: video.isPrivate,
                  duration: video.duration,
                  avatar: video.avatar,
                  views: video.views,
                  date: video.date,
                  isFriend: video.isFriend,
                  page,
                },
              ]);
            }
          } catch (error) {
            console.log(error);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const logSearch = async () => {
    await log({
      mode,
      type,
      advanced,
      tags,
      pageAmount: amount,
      quick,
      minDuration,
      primaryTag,
      category,
      userId: id,
      friendId,
      resultCount: 0,
    });
  };

  const run = async (offset) => {
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
      promises.push(
        getVideos(i)
          // eslint-disable-next-line
          .then((s) => {
            if (s && s.error === 404) {
              // set page limit but only if it hasn't been set yet or if the current page limit is lower than the current page
              if (tempPageLimit === 0 || tempPageLimit > i) {
                tempPageLimit = i - 1;
                setPageLimit(tempPageLimit);
              }
            }
            progress++;
            setProgressCount(progress);
          }),
      );
    }

    try {
      await Promise.all(promises);
      setVideos((prevVideos) => prevVideos.sort((a, b) => b.views - a.views));
      setFinished(true);
      executeScroll();
      console.log('All pages done.');
      logSearch();
    } catch (error) {
      console.log('Error: ' + error);
    }
  };

  const sortVideos = (sortMode) => {
    const sortedVideos = videos;
    switch (sortMode) {
      default:
      case 'newest':
        sortedVideos.sort((a, b) => a.page - b.page);
        break;
      case 'oldest':
        sortedVideos.sort((a, b) => b.page - a.page);
        break;
      case 'longest':
        sortedVideos.sort((a, b) => {
          const [aMinutes, aSeconds] = a.duration.split(':').map(Number);
          const [bMinutes, bSeconds] = b.duration.split(':').map(Number);
          return bMinutes * 60 + bSeconds - (aMinutes * 60 + aSeconds);
        });
        break;
      case 'shortest':
        sortedVideos.sort((a, b) => {
          const [aMinutes, aSeconds] = a.duration.split(':').map(Number);
          const [bMinutes, bSeconds] = b.duration.split(':').map(Number);
          return aMinutes * 60 + aSeconds - (bMinutes * 60 + bSeconds);
        });
        break;
      case 'views':
        sortedVideos.sort((a, b) => b.views - a.views);
        break;
      case 'relevance':
        sortedVideos.sort((a, b) => b.relevance - a.relevance);
        break;
    }
    setVideos(sortedVideos);
  };

  // Run for the next set of pages.
  const next = () => {
    run(start + amount);
    setStart(start + amount);
  };

  const submit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setFinished(false);
    setSort('popular');
    if (e.nativeEvent.submitter.name === 'next') {
      next();
      return;
    }
    run(start);
  };

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
    // (!amount || amount > lastPage) && setAmount(lastPage);
    setAmount(lastPage);
  };

  return (
    <>
      <LoadingBar
        progress={progressCount ? Math.round((progressCount / amount) * 100) : 0}
        color="#ff0036"
        height={10}
        onLoaderFinished={() => setProgressCount(0)}
      />
      <div className="header">
        <span className="subtitle">ThisVid Advanced Search Site</span>
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
                {/*<p>{advanced && (pageLimit !== 0 && `Page Limit: ${pageLimit}`)}</p>*/}
                <label htmlFor="search-mode">Search by</label>
                <select id="search-mode" value={mode} onChange={(e) => setMode(e.target.value)}>
                  {Object.keys(modes).map((key) => {
                    return (
                      <option key={key} value={key}>
                        {modes[key]}
                      </option>
                    );
                  })}
                </select>
                {(mode === 'user' || mode === 'friend') && (
                  <>
                    <div>
                      <label htmlFor="id">{mode === 'friend' && 'Your '}User ID</label>
                      {username && (
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
                      onBlur={getPageLimit}
                      onChange={(e) => setId(e.target.value)}
                    />
                  </>
                )}
                {mode === 'friend' && (
                  <>
                    <label htmlFor="friendId">
                      Choose Friend
                      {friendsLoading && <div className="small-loading-spinner"></div>}
                    </label>
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
                    <select
                      id="category"
                      value={category}
                      required
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {categories.map(({ value, label }) => {
                        return (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
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
                <select
                  value={type}
                  id="type"
                  required
                  onChange={(e) => setType(e.target.value)}
                  onBlur={() => mode === 'user' || (mode === 'friend' && getPageLimit())}
                >
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
                <label htmlFor="tags">{mode === 'user' ? 'Title contains' : 'Tags'}:</label>
                <InputTags tags={tags} setTags={setTags} />
                {advanced && (
                  <>
                    <label htmlFor="tags-operator">Operator</label>
                    <select
                      id="tags-operator"
                      value={termsOperator}
                      required
                      onChange={(e) => setTermsOperator(e.target.value)}
                    >
                      <option value="OR">OR</option>
                      <option value="AND">AND</option>
                    </select>
                  </>
                )}
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
                  required
                  value={minDuration}
                  onChange={(e) => setMinDuration(parseInt(e.target.value || 0))}
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
        <div className="results-container" ref={resultsRef}>
          {mode === 'friend' && !friendId ? (
            <>
              <div className="results-header">
                {friends.length === 0 ? (
                  <h2>Search for friends</h2>
                ) : (
                  <h2>Found {friends.length} friends</h2>
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
              <div className="results">
                {/* show list of friends filtered on friendSearch username */}
                {friends
                  .filter(({ username }) =>
                    username.toLowerCase().includes(friendSearch.toLowerCase()),
                  )
                  .map(({ uid, username, avatar }) => (
                    <FriendResult
                      key={uid}
                      uid={uid}
                      username={username}
                      avatar={avatar}
                      selectFunction={() => setFriendId(uid)}
                    />
                  ))}
              </div>
            </>
          ) : (
            <>
              <div className="results-header">
                {finished ? <h2>Found {videos.length} videos</h2> : <h2>Search for videos</h2>}
                <div>
                  <label htmlFor="sort">Sort by</label>
                  <select
                    id="sort"
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);
                      sortVideos(e.target.value);
                    }}
                  >
                    <option value="views">Views</option>
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="longest">Longest</option>
                    <option value="shortest">Shortest</option>
                  </select>
                </div>
              </div>
              <div className="results">
                {videos.map((video, index) => (
                  <Result
                    key={index}
                    title={video.title}
                    url={video.url}
                    isPrivate={video.isPrivate}
                    duration={video.duration}
                    imageSrc={video.avatar}
                    date={video.date}
                    views={video.views}
                    isFriend={video.isFriend}
                    page={debug ? video.page : null}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Search;
