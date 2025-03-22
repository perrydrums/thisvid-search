import cheerio from 'cheerio';
import React, { useEffect, useRef, useState } from 'react';

import '../../App.css';
import { CirclePacking } from '../../components/CircularPacking';
import { Node } from '../../components/CircularPacking/data';
import Header from '../../components/Header';
import Result from '../../components/Result';

type User = {
  username: string;
  url: string;
  avatar: string;
  videos: Video[];
  count: number;
};

type Users = {
  [username: string]: User;
};

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

  const localUid = localStorage.getItem('tvass-user-id');
  if (localUid && !uid) {
    setUid(localUid);
  }

  const resultsRef = useRef<HTMLDivElement>(null);
  const executeScroll = () => resultsRef.current?.scrollIntoView();

  // Get users from local storage.
  useEffect(() => {
    const storedUsers = localStorage.getItem('tvass-analyse-users');
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

  // Save users to local storage.
  useEffect(() => {
    if (Object.keys(users).length > 0) {
      try {
        localStorage.setItem('tvass-analyse-users', JSON.stringify(users));
      } catch (error) {
        console.error('Error saving users to localStorage:', error);
      }
    }
  }, [users]);

  // Get container width on mount and on resize.
  // Used to calculate number of tags to show in circular packing.
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
    const getPageLimit = async () => {
      const response = await fetch(`/members/${uid}/favourite_videos/`);

      const body = await response.text();
      const $ = cheerio.load(body);

      const lastPage = parseInt(
        $('li.pagination-last a').text() || $('.pagination-list li:nth-last-child(2) a').text(),
      );
      setPageLimit(lastPage);
    };

    getPageLimit();
  }, [uid]);

  const getAvatar = async (username: string, uid: number) => {
    if (!users[username]) {
      const userResponse = await fetch(`/members/${uid}/`);
      const userBody = await userResponse.text();
      const $ = cheerio.load(userBody);

      return $('.avatar img').first().attr('src');
    }
    return users[username].avatar;
  };

  const analyseFavourites = async (page: number) => {
    const url = `/members/${uid}/favourite_videos/${page}/`;
    const response = await fetch(url);

    const body = await response.text();
    const $ = cheerio.load(body);

    const urls = $('.tumbpu')
      .map((i, el) => $(el).attr('href'))
      .get();

    // Fetch all videos
    await Promise.all(
      urls.map(async (url) => {
        const proxyUrl = url.split('/').slice(3).join('/');
        const response = await fetch(proxyUrl);
        const body = await response.text();
        const $ = cheerio.load(body);

        const title = $('.headline h1').first().text();
        const thumbnailElement = $('.video-holder img').first().attr('src');
        const thumbnail = thumbnailElement
          ? thumbnailElement.replace('//', 'https://')
          : 'https://placehold.co/100x100/000000/b60707?text=Private+Video';
        const videoInfo = $('.box ul.description').first();
        // videoInfo contains 4 li elements
        // first one contains description text
        // second one contains category
        // third one contains tags
        // fourth one user who uploaded the video
        const description = videoInfo.find('li').first().text();
        const category = videoInfo.find('li:nth-child(2) a').first().text();
        const tags = videoInfo
          .find('li:nth-child(3)')
          .find('a')
          .map((i, el) => $(el).text())
          .get();
        const username = videoInfo.find('li:nth-child(4) a').first().text();
        const userUrl = videoInfo.find('li:nth-child(4) a').first().attr('href');
        // userID is last part of url
        const userID = userUrl ? userUrl.split('/').slice(-2)[0] : '';
        const avatar = await getAvatar(username, parseInt(userID));

        const video = {
          title,
          thumbnail,
          description,
          category,
          tags,
          username,
          userUrl,
          url,
        };

        // Add or update the user object
        // @ts-ignore
        setUsers((users) => {
          const newUser = {
            ...users[username],
            username,
            url: userUrl,
            avatar,
            videos: [...(users[username] ? users[username].videos : []), video],
            count: (users[username] ? users[username].count : 0) + 1,
          };
          return { ...users, [username]: newUser };
        });
      }),
    );
  };

  const run = async () => {
    setProgressCount(0);
    setUsers({});

    // Fetch all pages
    await Promise.all(
      [...Array(pageLimit + 1).keys()].slice(1).map(async (page) => {
        await analyseFavourites(page);
        setProgressCount((progressCount) => progressCount + 1);
      }),
    );

    setFinished(true);
    executeScroll();
  };

  const next = async () => {
    await analyseFavourites(progressCount + 1);
    setProgressCount((progressCount) => progressCount + 1);
    setFinished(true);
    executeScroll();
  };

  const submit = (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    e.preventDefault();
    localStorage.setItem('uid', uid);
    setErrorMessage('');
    setFinished(false);
    if ((e.nativeEvent as SubmitEvent).submitter?.id === 'next') {
      next();
      return;
    }

    if (pageLimit > 10) {
      // show warning alert if page limit is greater than 10
      if (window.confirm(`This will take a while. Are you sure you want to continue?`)) {
        run();
      } else {
        setFinished(true);
      }
    } else {
      run();
    }
  };

  // returns array of category objects
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

  // returns array of tag objects
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
                {Object.keys(users).length > 0 && `Found ${Object.values(users).reduce((total, user) => total + user.videos.length, 0)} videos`}
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
