import React, { useEffect, useRef, useState } from 'react';

import '../../../App.css';
import { CirclePacking } from '../../../components/legacy/CircularPacking';
import { Node } from '../../../components/legacy/CircularPacking/data';
import Header from '../../../components/legacy/Header';
import Result from '../../../components/legacy/Result';
import {
  type AnalyseFavouriteUsers,
  ANALYSE_USERS_STORAGE_KEY,
  TVASS_USER_ID_STORAGE_KEY,
  analyseFavouritesListingPage,
  getFavouriteListingPageLimit,
  runAnalyseFavourites,
} from '../../../helpers/analyseFavourites';

type Users = AnalyseFavouriteUsers;

type Categories = {
  [category: string]: number;
};

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

type Tags = {
  [tag: string]: number;
};

const Analyse = () => {
  const [uid, setUid] = useState('');
  const [users, setUsers] = useState<Users>({});
  const [progressCount, setProgressCount] = useState(0);
  const [pageLimit, setPageLimit] = useState(0);
  const [finished, setFinished] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [show, setShow] = useState('users');
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const localUid = localStorage.getItem(TVASS_USER_ID_STORAGE_KEY);
  if (localUid && !uid) {
    setUid(localUid);
  }

  const resultsRef = useRef<HTMLDivElement>(null);
  const executeScroll = () => resultsRef.current?.scrollIntoView();

  useEffect(() => {
    const storedUsers = localStorage.getItem(ANALYSE_USERS_STORAGE_KEY);
    if (storedUsers) {
      try {
        const parsedUsers = JSON.parse(storedUsers);
        if (parsedUsers && Object.keys(parsedUsers).length > 0) {
          setUsers(parsedUsers);
        }
      } catch (error) {
        console.error('Error parsing users from localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (Object.keys(users).length > 0) {
      try {
        localStorage.setItem(ANALYSE_USERS_STORAGE_KEY, JSON.stringify(users));
      } catch (error) {
        console.error('Error saving users to localStorage:', error);
      }
    }
  }, [users]);

  useEffect(() => {
    const updateContainerWidth = () => {
      if (resultsRef.current) {
        setContainerWidth(resultsRef.current.clientWidth);
      }
    };

    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);

    return () => {
      window.removeEventListener('resize', updateContainerWidth);
    };
  }, []);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const last = await getFavouriteListingPageLimit(uid);
      setPageLimit(last);
    })();
  }, [uid]);

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

  const submit = (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    e.preventDefault();
    localStorage.setItem(TVASS_USER_ID_STORAGE_KEY, uid);
    setErrorMessage('');
    setFinished(false);
    if ((e.nativeEvent as SubmitEvent).submitter?.id === 'next') {
      next();
      return;
    }

    if (pageLimit > 10) {
      if (window.confirm(`This will take a while. Are you sure you want to continue?`)) {
        run();
      } else {
        setFinished(true);
      }
    } else {
      run();
    }
  };

  const getCategoriesAndCounts = () => {
    const categories: Categories = {};
    Object.values(users).forEach((user) => {
      user.videos.forEach((video: Video) => {
        if (!categories[video.category || '']) {
          categories[video.category || ''] = 0;
        }
        categories[video.category || '']++;
      });
    });
    return Object.entries(categories).sort((a, b) => b[1] - a[1]);
  };

  const getTagsAndCounts = () => {
    const tags: Tags = {};
    Object.values(users).forEach((user) => {
      user.videos.forEach((video) => {
        video.tags.forEach((tag) => {
          if (!tags[tag]) {
            tags[tag] = 0;
          }
          tags[tag]++;
        });
      });
    });
    return Object.entries(tags).sort((a, b) => b[1] - a[1]);
  };

  const getCircularPackingTagsData = () => {
    return getTagsAndCounts()
      .map(([tag, count]) => ({ id: tag, name: tag, value: count }) as Node)
      .slice(0, (containerWidth / 100) * 3);
  };

  const getCircularPackingCategoriesData = () => {
    return getCategoriesAndCounts()
      .map(([category, count]) => ({ id: category, name: category, value: count }) as Node)
      .slice(0, (containerWidth / 100) * 3);
  };

  const getCircularPackingUsersData = () => {
    const sortedUsers = Object.values(users).sort((a, b) => b.count - a.count);
    return sortedUsers
      .map((user) => ({ id: user.username, name: user.username, value: user.count }) as Node)
      .slice(0, 20);
  };

  return (
    <>
      <Header backButtonUrl="/" showPreferences={true} />
      <div className="container">
        <div className="form-container">
          <h2>Analyse Favourites</h2>
          <span className="error"> {errorMessage} </span>
          <form onSubmit={submit}>
            <div className="form-columns">
              <div>
                {`Progress: ${progressCount}/${pageLimit} (${Math.round(
                  (progressCount / pageLimit) * 100,
                )}%)`}
                {!finished && <div className="small-loading-spinner"></div>}
              </div>
              <div>
                {Object.keys(users).length > 0 &&
                  `Found ${Object.values(users).reduce((total, user) => total + user.videos.length, 0)} videos`}
              </div>
              <p></p>
              <label htmlFor="id">Your User ID</label>
              <input
                type="text"
                id="id"
                value={uid}
                required
                onChange={(e) => setUid(e.target.value)}
              />
            </div>
            <div className="button-columns">
              <button type="submit" name="next" id="next" disabled={!pageLimit || !finished}>
                Analyse page {progressCount + 1}/{pageLimit}
              </button>
              <button type="submit" name="run" id="run" disabled={!pageLimit || !finished}>
                Analyse all videos
              </button>
            </div>
          </form>
        </div>
        <div className="results-container" ref={resultsRef}>
          <div className="results-scroll-container">
            <h2>Favourite {show}</h2>
            {Object.keys(users).length > 0 && (
              <div className="filter-buttons">
                <button
                  name="show-summary"
                  disabled={show === 'summary'}
                  onClick={() => setShow('summary')}
                >
                  Summary
                </button>
                <button
                  name="show-favourite-users"
                  disabled={show === 'users'}
                  onClick={() => setShow('users')}
                >
                  Users
                </button>
                <button
                  name="show-favourite-categories"
                  disabled={show === 'categories'}
                  onClick={() => setShow('categories')}
                >
                  Categories
                </button>
                <button
                  name="show-favourite-tags"
                  disabled={show === 'tags'}
                  onClick={() => setShow('tags')}
                >
                  Tags
                </button>
              </div>
            )}
            {show === 'summary' ? (
              <div className="summary">
                <h2 style={{ textAlign: 'center', marginBottom: '-20px' }}>Favourite tags</h2>
                <CirclePacking data={getCircularPackingTagsData()} />

                <h2 style={{ textAlign: 'center', marginBottom: '-20px' }}>Favourite categories</h2>
                <CirclePacking data={getCircularPackingCategoriesData()} />

                <h2 style={{ textAlign: 'center', marginBottom: '-20px' }}>Favourite profiles</h2>
                <CirclePacking data={getCircularPackingUsersData()} />
              </div>
            ) : (
              <div className="results">
                {show === 'users' &&
                  Object.values(users)
                    .sort((a, b) => b.count - a.count)
                    .map((user) => (
                      <Result
                        key={user.username}
                        title={user.username}
                        url={user.url}
                        duration={`${user.count} videos`}
                        imageSrc={user.avatar}
                        date=""
                        views={0}
                        noDebug={true}
                      />
                    ))}
                {show === 'categories' &&
                  getCategoriesAndCounts().map(([category, count]) => (
                    <Result
                      key={category}
                      title={category}
                      url={`/categories/${category.replaceAll(' ', '-')}`}
                      duration={`${count} videos`}
                      imageSrc={`https://placehold.co/100x100/000000/b60707?text=${category.replaceAll(
                        ' ',
                        '+',
                      )}`}
                      views={0}
                      date=""
                      noDebug={true}
                    />
                  ))}
                {show === 'tags' &&
                  getTagsAndCounts().map(([tag, count]) => (
                    <Result
                      key={tag}
                      title={tag}
                      url={`/categories/${tag.replaceAll(' ', '-')}`}
                      duration={`${count} videos`}
                      imageSrc={`https://placehold.co/100x100/000000/b60707?text=${tag.replaceAll(
                        ' ',
                        '+',
                      )}`}
                      views={0}
                      date=""
                      noDebug={true}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Analyse;
