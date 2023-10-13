import React, {useState} from 'react';
import cheerio from 'cheerio';
import './App.css';
import Result from './components/Result';

const modes = {
  user: 'User ID',
  category: 'Category with tags',
  tags: 'Tags',
};

const types = {
  user: [
    {value: 'public', label: 'Public'},
    {value: 'private', label: 'Private'},
    {value: 'favourite', label: 'Favourites'},
  ],
  category: [
    {value: 'popular', label: 'Popular'},
  ],
  tags: [
    {value: 'popular', label: 'Popular'},
    {value: 'latest', label: 'Newest'},
  ],
};

const categories = [
  {value: 'gay', label: 'Gay'},
  {value: '3d-gay', label: 'Gay 3D'},
  {value: 'gay-asian', label: 'Gay Asian'},
  {value: 'gay-bareback', label: 'Gay Bareback'},
  {value: 'gay-bdsm', label: 'Gay BDSM'},
  {value: 'gay-bear', label: 'Gay Bear'},
  {value: 'gay-big-cock', label: 'Gay Big Cock'},
  {value: 'gay-bizarre', label: 'Gay Bizarre'},
  {value: 'gay-black-men', label: 'Gay Black Men'},
  {value: 'gay-blowjob', label: 'Gay Blowjob'},
  {value: 'gay-feet', label: 'Gay Feet'},
  {value: 'gay-fetish', label: 'Gay Fetish'},
  {value: 'gay-fisting', label: 'Gay Fisting'},
  {value: 'gay-glory-hole', label: 'Gay Glory Hole'},
  {value: 'gay-handjob', label: 'Gay Handjob'},
  {value: 'gay-interracial', label: 'Gay Interracial'},
  {value: 'gay-massage', label: 'Gay Massage'},
  {value: 'gay-muscle-men', label: 'Gay Muscle Men'},
  {value: 'gay-orgy', label: 'Gay Orgy'},
  {value: 'male-pissing', label: 'Gay Pissing'},
  {value: 'male-scat', label: 'Gay Scat'},
  {value: 'gay-smoking', label: 'Gay Smoking'},
  {value: 'gay-twinks', label: 'Gay Twinks'},
  {value: 'male-farting', label: 'Gay Farting'},
  {value: 'male-voyeur', label: 'Gay Voyeur'},
  {value: 'men-flashing', label: 'Gay Flashing'},
  {value: 'str8-guys', label: 'Straight Guys'},

];

const MyComponent = () => {
  const [mode, setMode] = useState('user');
  const [id, setId] = useState('100632');
  const [terms, setTerms] = useState('');
  const [termsOperator, setTermsOperator] = useState('OR');
  const [primaryTag, setPrimaryTag] = useState('');
  const [category, setCategory] = useState('');
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

  const getUrl = (page) => {
    // Define the base URLs for each search mode
    const baseUrl = {
      user: `/members/${id}/${type}_videos/${page}/`,
      tags: `/tags/${primaryTag}/${type}-males/${page}/`,
      category: `/categories/${category}/most-popular/${page}/`,
    };

    return baseUrl[mode];
  };

  const getVideos = async (page) => {
    if (pageLimit !== 0 && page > pageLimit) {
      return;
    }
    const tagsArray = terms.split(/[,\s]+/).filter(str => str.trim() !== '');

    const url = getUrl(page);

    try {
      const response = await fetch(url);

      if (response.status === 404) {
        return {error: 404};
      }

      const body = await response.text();
      const $ = cheerio.load(body);

      const urls = [];
      $('.tumbpu').each((i, element) => {
        const isPrivate = $('span', element).first().hasClass('private');
        const duration = $('span span.duration', element).text();
        const title = $(element).attr('title');
        const [minutes, seconds] = duration.split(':').map(Number);
        const time = minutes * 60 + seconds;

        if (omitPrivate && isPrivate) {
          return;
        }

        if (quick) {
          const hasAllTags = termsOperator === 'AND'
            ? tagsArray.every(tag => title.toLowerCase().includes(tag.toLowerCase()))
            : tagsArray.some(tag => title.toLowerCase().includes(tag.toLowerCase()));

          if (hasAllTags || tagsArray.length === 0) {
            if (time >= minDuration * 60) {
              setVideos((prevVideos) => [...prevVideos, {
                title,
                url: $(element).attr('href'),
                isPrivate,
                duration,
                page,
              }]);
            }
          }
        } else {
          if (time >= minDuration * 60) {
            urls.push({
              title,
              url: $(element).attr('href'),
              isPrivate,
              duration,
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

            const hasAllTags = termsOperator === 'AND'
              ? tagsArray.every(tag => $(`.description a[title*="${tag}"]`).length > 0)
              : tagsArray.some(tag => $(`.description a[title*="${tag}"]`).length > 0);

            const imageSrc = $('.video-holder img').attr('src').replace('//', 'https://');
            console.log(imageSrc);

            if (hasAllTags) {
              setVideos((prevVideos) => [
                ...prevVideos,
                {
                  title: video.title,
                  url: video.url,
                  isPrivate: video.isPrivate,
                  duration: video.duration,
                  imageSrc,
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

  const run = async (offset) => {
    setProgressCount(0);

    if (!preserveResults) {
      setVideos([]);
    }
    const promises = [];

    // We need this because setting state is async.
    let tempPageLimit = 0;
    let progress = 0;

    for (let i = offset; i <= offset - 1 + amount; i++) {
      promises.push(getVideos(i)
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
      setVideos((prevVideos) => prevVideos.sort((a, b) => a.page - b.page));
      setFinished(true);
      console.log('All pages done.');
    } catch (error) {
      console.log('Error: ' + error);
    }
  };

  // Run for the next set of pages.
  const next = () => {
    run(start + amount);
    setStart(start + amount);
  };

  const submit = (e) => {
    e.preventDefault();
    if (e.nativeEvent.submitter.name === 'next') {
      next();
      return;
    }
    run(start);
  };

  return (
    <>
      <div className="header">
        <h1>ThisVid A.S.S.</h1>
        <span className="subtitle">ThisVid Advanced Search Site</span>
      </div>
      <div className="container">
        <div className="form-container">
          <h2>Search</h2>
          <form onSubmit={submit}>
            <div className="form-columns">
              <p>{`Progress: ${progressCount}/${amount} (${Math.round((progressCount / amount) * 100)}%)`}</p>
              <p>{pageLimit !== 0 && `Page Limit: ${pageLimit}`}</p>
              <label htmlFor="search-mode">Search by</label>
              <select id="search-mode" value={mode} onChange={(e) => setMode(e.target.value)}>
                {
                  Object.keys(modes).map((key) => {
                    return <option key={key} value={key}>{modes[key]}</option>;
                  })
                }
              </select>
              {
                mode === 'user' &&
                <>
                  <label htmlFor="id">User ID</label>
                  <input type="text" id="id" value={id} required onChange={(e) => setId(e.target.value)}/>
                </>
              }
              {
                mode === 'category' &&
                <>
                  <label htmlFor="category">Category</label>
                  <select id="category" value={category} required onChange={(e) => setCategory(e.target.value)}>
                    {
                      categories.map(({value, label}) => {
                        return <option key={value} value={value}>{label}</option>;
                      })
                    }
                  </select>
                </>
              }
              {
                mode === 'tags' &&
                <>
                  <label htmlFor="primary-tag">Primary Tag</label>
                  <input type="text" id="primary-tag" value={primaryTag} required
                         onChange={(e) => setPrimaryTag(e.target.value)}/>
                </>
              }
              <label htmlFor="tags">{mode === 'user' ? 'Title contains' : 'Tags'}:</label>
              <input type="text" id="tags" value={terms} onChange={(e) => setTerms(e.target.value)}/>
              <label htmlFor="tags-operator">Operator</label>
              <select id="tags-operator" value={termsOperator} required
                      onChange={(e) => setTermsOperator(e.target.value)}>
                <option value="OR">OR</option>
                <option value="AND">AND</option>
              </select>
              <label htmlFor="start">Start Page</label>
              <input type="number" id="start" value={start} required
                     onChange={(e) => setStart(parseInt(e.target.value))}/>
              <label htmlFor="amount">Number of Pages</label>
              <input type="number" id="amount" value={amount} required
                     onChange={(e) => setAmount(parseInt(e.target.value))}/>
              <label htmlFor="min-duration">Min Duration (minutes)</label>
              <input type="number" min="0" id="min-duration" required value={minDuration}
                     onChange={(e) => setMinDuration(parseInt(e.target.value || 0))}/>
              <label htmlFor="type">Type</label>
              <select value={type} id="type" required onChange={(e) => setType(e.target.value)}>
                <option disabled value=""> - Select -</option>
                {
                  types[mode].map(({value, label}) => {
                    return <option key={value} value={value}>{label}</option>;
                  })
                }
              </select>
            </div>
            <div className="button-columns-3" style={{margin: "12px 0"}}>
              <div>
                <input type="checkbox" id="quick" checked={quick} onChange={() => setQuick(!quick)}/>
                <label htmlFor="quick" className="checkbox-button">Quick Search</label>
              </div>
              <div>
                <input type="checkbox" id="preserve-results" checked={preserveResults}
                       onChange={() => setPreserveResults(!preserveResults)}/>
                <label htmlFor="preserve-results" className="checkbox-button">Preserve Results</label>
              </div>
              {(type === 'favourite' || mode !== 'user') &&
                <div>
                  <input type="checkbox" id="omit-private" checked={omitPrivate}
                         onChange={() => setOmitPrivate(!omitPrivate)}/>
                  <label htmlFor="omit-private" className="checkbox-button">No Private Videos</label>
                </div>
              }
            </div>
            <div className="button-columns">
              <button type="submit" name="run">Run</button>
              <button type="submit" name="next"
                      disabled={start + amount > pageLimit && pageLimit !== 0}>
                Next
              </button>
            </div>
          </form>
        </div>
        <div className="results-container">
          {finished && <h2>Found {videos.length} videos</h2>}
          <div className="results">
            {videos.map((video, index) => (
              <Result
                key={index}
                title={video.title}
                url={video.url}
                isPrivate={video.isPrivate}
                duration={video.duration}
                imageSrc={video.imageSrc}
                page={video.page}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default MyComponent;
