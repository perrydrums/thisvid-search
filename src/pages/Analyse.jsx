import React, {useRef, useState} from 'react';
import cheerio from 'cheerio';
import '../App.css';
import Result from '../components/Result';

const Analyse = () => {
  const [uid, setUid] = useState('');
  const [users, setUsers] = useState({});
  const [preserveResults, setPreserveResults] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const [pageLimit, setPageLimit] = useState(0);
  const [finished, setFinished] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const localUid = localStorage.getItem('uid');
  if (localUid && !uid) {
    setUid(localUid);
  }

  const resultsRef = useRef(null);
  const executeScroll = () => resultsRef.current.scrollIntoView();

  const getAvatar = async (username, uid) => {
    if (!users[username]) {
      const userResponse = await fetch(`/members/${uid}/`);
      const userBody = await userResponse.text();
      const $ = cheerio.load(userBody);

      return $('.avatar img').first().attr('src');
    }
    return users[username].avatar;
  };

  const analyseFavourites = async (page) => {
    const url = `/members/${uid}/favourite_videos/${page}/`;
    const response = await fetch(url);

    const body = await response.text();
    const $ = cheerio.load(body);

    const urls = $('.tumbpu').map((i, el) => $(el).attr('href')).get();

    // Fetch all videos
    await Promise.all(
      urls.map(async (url) => {
        const proxyUrl = url.split('/').slice(3).join('/');
        const response = await fetch(proxyUrl);
        const body = await response.text();
        const $ = cheerio.load(body);

        const title = $('.headline h1').first().text();
        const thumbnailElement = $('.video-holder img').first().attr('src');
        const thumbnail = thumbnailElement ? thumbnailElement.replace('//', 'https://') : '';
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
          .find('a').map((i, el) => $(el).text()).get();
        const username = videoInfo.find('li:nth-child(4) a').first().text();
        const userUrl = videoInfo.find('li:nth-child(4) a').first().attr('href');
        // userID is last part of url
        const userID = userUrl.split('/').slice(-2)[0];
        const avatar = await getAvatar(username, userID);

        const video = {
          title,
          thumbnail,
          description,
          category,
          tags,
          username,
          userUrl,
        };

        // Add or update the user object
        setUsers((users) => {
          const newUser = {
            ...users[username],
            username,
            url: userUrl,
            avatar,
            videos: [...(users[username] ? users[username].videos : []), video],
            count: (users[username] ? users[username].count : 0) + 1,
          };
          return {...users, [username]: newUser};
        });
      }),
    );
  };

  const run = async () => {
    setProgressCount(0);
    setUsers({});

    const response = await fetch(`/members/${uid}/favourite_videos/`);

    const body = await response.text();
    const $ = cheerio.load(body);

    const lastPage = parseInt($('li.pagination-last a').text() || $('.pagination-list li:nth-last-child(2) a').text());
    // const lastPage = 1;
    setPageLimit(lastPage);

    // Fetch all pages
    await Promise.all(
      [...Array(lastPage + 1).keys()].slice(1).map(async (page) => {
        await analyseFavourites(page);
        setProgressCount((progressCount) => progressCount + 1);
      }),
    );

    localStorage.setItem('uid', uid);
    setFinished(true);
    executeScroll();
  };

  const submit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setFinished(false);
    run();
  };

  return (
    <>
      <div className="header">
        <span className="subtitle">ThisVid Advanced Search Site</span>
      </div>
      <div className="container">
        <div className="form-container">
          <h2>Analyse Favourites</h2>
          <span className="error"> {errorMessage} </span>
          <form onSubmit={submit}>
            <div className="form-columns">
              <p>{`Progress: ${progressCount}/${pageLimit} (${Math.round((progressCount / pageLimit) * 100)}%)`}</p>
              <label htmlFor="id">Your User ID</label>
              <input type="text" id="id" value={uid} required onChange={(e) => setUid(e.target.value)}/>
              <div>
                <input type="checkbox" id="preserve-results" checked={preserveResults}
                       onChange={() => setPreserveResults(!preserveResults)}/>
                <label htmlFor="preserve-results" className="checkbox-button">Preserve Results</label>
              </div>
            </div>
            <div className="button-columns">
              <button type="submit" name="run">Run</button>
            </div>
          </form>
        </div>
        <div className="results-container" ref={resultsRef}>
          <h2>{finished && 'Users with most favourited videos'}</h2>
          <div className="results">
            {Object.values(users).sort((a, b) => b.count - a.count).map((user) => (
              <Result
                title={user.username}
                url={user.url}
                duration={`${user.count} videos`}
                imageSrc={user.avatar}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Analyse;
