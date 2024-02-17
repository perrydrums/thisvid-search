import cheerio from 'cheerio';
import React, { useEffect, useState } from 'react';
import { Tooltip } from 'react-tooltip';

import '../../App.css';
import Header from '../../components/Header';
import MoodResult from '../../components/Result/MoodResult';
import InputTags from '../../components/input/Tags';
import { Mood, Preferences as PreferencesType } from '../../helpers/types';
import { getVideos } from '../../helpers/videos';

const Preferences = () => {
  const m = ((p) => (p ? JSON.parse(p) : []))(localStorage.getItem('tvass-moods'));

  const [userId, setUserId] = useState(localStorage.getItem('tvass-user-id') || '');
  const [defaultMood, setDefaultMood] = useState(localStorage.getItem('tvass-default-mood') || '');
  const [favourites, setFavourites] = useState(localStorage.getItem('tvass-favourites') || '');
  const [lastSyncDate, setLastSyncDate] = useState(
    localStorage.getItem('tvass-last-sync-date') || '',
  );
  const [preferences, setPreferences] = useState<PreferencesType>({
    tags: [],
    excludeTags: [],
    boosterTags: [],
    diminishingTags: [],
    minDuration: 0,
  });
  const [moods, setMoods] = useState<Array<Mood>>(m);
  const [activeMood, setActiveMood] = useState('');
  const [newMoodName, setNewMoodName] = useState('');

  useEffect(() => {
    const m: Mood | undefined = moods.find((mood: Mood) => mood.name === activeMood);
    const p = m?.preferences;

    p &&
      Object.keys(p).forEach((key) => {
        if (p[key] !== undefined) {
          setPreferences((prevState) => ({ ...prevState, [key]: p[key] }));
        }
      });
  }, [activeMood, moods]);

  useEffect(() => {
    localStorage.setItem('tvass-user-id', userId);
  }, [userId]);

  useEffect(() => {
    localStorage.setItem('tvass-default-mood', defaultMood);
  }, [defaultMood]);

  useEffect(() => {
    localStorage.setItem('tvass-favourites', favourites);
  }, [favourites]);

  useEffect(() => {
    localStorage.setItem('tvass-last-sync-date', lastSyncDate);
  }, [lastSyncDate]);

  const newMood = () => {
    const mood = {
      name: newMoodName,
      preferences: {
        tags: [],
        excludeTags: [],
        boosterTags: [],
        diminishingTags: [],
        minDuration: 0,
      },
    };

    setMoods([...moods, mood]);
    setNewMoodName('');

    localStorage.setItem('tvass-moods', JSON.stringify([...moods, mood]));
  };

  const setPreference = (key: string, value: any) => {
    setPreferences({ ...preferences, [key]: value });
  };

  const saveMood = () => {
    const mood = moods.find((mood) => mood.name === activeMood);

    if (mood) {
      mood.preferences = preferences;
      localStorage.setItem('tvass-moods', JSON.stringify(moods));
      const newMoods = moods.filter((mood) => mood.name !== activeMood);
      setMoods([...newMoods, mood]);
    }
  };

  const deleteMood = () => {
    const newMoods = moods.filter((mood) => mood.name !== activeMood);
    setMoods(newMoods);
    localStorage.setItem('tvass-moods', JSON.stringify(newMoods));
    setActiveMood('');
  };

  const getFavourites = async () => {
    const response = await fetch(`/members/${userId}/favourite_videos/`);

    const body = await response.text();
    const $ = cheerio.load(body);

    const lastPage =
      parseInt(
        $('li.pagination-last a').text() || $('.pagination-list li:nth-last-child(2) a').text(),
      ) || 1;

    let promises = [];

    for (let i = 1; i <= lastPage; i++) {
      promises.push(
        getVideos({
          url: `/members/${userId}/favourite_videos/${i}`,
          page: i,
        }),
      );
    }

    const videos = (await Promise.all(promises)).flat().filter(
      // @ts-ignore
      (value, index, self) => index === self.findIndex((v) => v.url === value.url),
    );

    const videoUrls = videos.map((v) => v.url);

    setFavourites(videoUrls.join(','));
    setLastSyncDate(new Date().toLocaleString());
  };

  return (
    <>
      <Header backButtonUrl="/search" />
      <div className="container">
        <div className="results-container">
          <div className="container-section">
            <div className="container-section-header">
              <h2>Preferences</h2>
            </div>
            <div className="form-columns">
              <label htmlFor="user-id">Your ThisVid User ID</label>
              <div>
                <input
                  type="text"
                  id="user-id"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  data-tooltip-id="user-id"
                />
                <Tooltip id="user-id" className="label-tooltip" place="left-start">
                  The ID of the ThisVid user profile. You can find this in the URL of the profile
                  page on ThisVid.
                </Tooltip>
              </div>
            </div>
          </div>
          <div className="container-section">
            <div className="container-section-header">
              <h2>Favourites</h2>
            </div>
            <p style={{ color: '#666' }}>Last sync date: {lastSyncDate}</p>
            <div className="form-columns">
              <div>Found {favourites.split(',').length} favourite videos</div>
              <div>
                <button data-tooltip-id="sync-date" onClick={getFavourites} disabled={!userId}>
                  Sync favourites
                </button>
                <Tooltip id="sync-date" className="label-tooltip" place="left-start">
                  Load your favourite videos from ThisVid, so they can be filtered out of search
                  results.
                </Tooltip>
              </div>
            </div>
          </div>
          <div className="container-section ">
            <div className="container-section-header">
              <h3>Add a new mood</h3>
            </div>
            <div className="form-columns" style={{ marginBottom: '12px' }}>
              <div>
                <input
                  type="text"
                  value={newMoodName}
                  onChange={(e) => setNewMoodName(e.target.value)}
                  placeholder="Name your mood"
                />
              </div>
              <button onClick={newMood}>Add</button>
            </div>
            <div className="container-section-header">
              <h2>Moods</h2>
            </div>
            <div className="mood-results-container">
              <div className="mood-results">
                {moods.map((mood) => (
                  <MoodResult
                    key={mood.name}
                    name={mood.name}
                    editFunction={setActiveMood}
                    setDefaultFunction={setDefaultMood}
                    defaultMood={defaultMood === mood.name}
                    preferences={mood.preferences}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="form-container"
        >
          {activeMood && (
            <>
              <h2>Preferences for {activeMood}</h2>
              <div className="form-container-scroll">
                <div className="form-columns form-columns-group">
                  <label htmlFor="tags">Default tags</label>
                  <InputTags
                    tags={preferences.tags}
                    setTags={(t) => setPreference('tags', t)}
                    tooltip="Find videos with any/all of these words in the title."
                  />
                  <label htmlFor="exclude-tags">Default exclude tags</label>
                  <InputTags
                    htmlId="exclude-tags"
                    tags={preferences.excludeTags}
                    setTags={(t) => setPreference('excludeTags', t)}
                    tooltip="Videos with these tags will be excluded from the search results."
                  />
                  <label htmlFor="booster-tags">Default booster tags</label>
                  <InputTags
                    htmlId="booster-tags"
                    tags={preferences.boosterTags}
                    setTags={(t) => setPreference('boosterTags', t)}
                    tooltip="Videos with these tags will be boosted to the top of the search results, when sorting by relevance."
                  />
                  <label htmlFor="diminishing-tags">Default diminishing tags</label>
                  <InputTags
                    htmlId="diminishing-tags"
                    tags={preferences.diminishingTags}
                    setTags={(t) => setPreference('diminishingTags', t)}
                    tooltip="Videos with these tags will be lower in the search results, when sorting by relevance."
                  />
                </div>
                <div className="form-columns">
                  <label htmlFor="min-duration">Min Duration (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    id="min-duration"
                    required
                    value={preferences.minDuration}
                    onChange={(e) => setPreference('minDuration', e.target.value)}
                  />
                </div>
              </div>
              <div className="button-columns" style={{ margin: '12px 0' }}>
                <button onClick={saveMood}>Save</button>
                <button onClick={deleteMood}>Delete</button>
              </div>
            </>
          )}
        </form>
      </div>
    </>
  );
};

export default Preferences;
