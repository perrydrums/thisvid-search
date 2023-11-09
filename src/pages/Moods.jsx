import React, { useEffect, useState } from 'react';

import '../App.css';
import MoodResult from '../components/Result/MoodResult';
import InputTags from '../components/input/Tags';

const Moods = () => {
  const m = ((p) => (p ? JSON.parse(p) : []))(localStorage.getItem('tvass-moods'));

  const [userId, setUserId] = useState('');
  const [preferences, setPreferences] = useState({
    tags: [],
    excludeTags: [],
    boosterTags: [],
    diminishingTags: [],
    minDuration: 0,
  });
  const [moods, setMoods] = useState(m);
  const [activeMood, setActiveMood] = useState('');
  const [newMoodName, setNewMoodName] = useState('');

  useEffect(() => {
    const p = moods.find((mood) => mood.name === activeMood)?.preferences;

    p &&
      Object.keys(p).forEach((key) => {
        if (p[key] !== undefined) {
          setPreferences((prevState) => ({ ...prevState, [key]: p[key] }));
        }
      });
  }, [activeMood, moods]);

  useEffect(() => {
    const u = localStorage.getItem('tvass-user-id');
    if (u) {
      setUserId(u);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tvass-user-id', userId);
  }, [userId]);

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

  const setPreference = (key, value) => {
    setPreferences({ ...preferences, [key]: value });
  };

  const saveMood = () => {
    const mood = moods.find((mood) => mood.name === activeMood);
    mood.preferences = preferences;

    localStorage.setItem('tvass-moods', JSON.stringify(moods));

    const newMoods = moods.filter((mood) => mood.name !== activeMood);
    setMoods([...newMoods, mood]);
  };

  const deleteMood = () => {
    const newMoods = moods.filter((mood) => mood.name !== activeMood);
    setMoods(newMoods);
    localStorage.setItem('tvass-moods', JSON.stringify(newMoods));
    setActiveMood('');
  };

  return (
    <>
      <div className="header">
        <span className="subtitle">
          <a href="/">ThisVid Advanced Search Site</a>
        </span>
      </div>
      <div className="container">
        <div className="results-container">
          <div className="container-section">
            <div className="container-section-header">
              <h2>Preferences</h2>
            </div>
            <div className="form-columns">
              <label htmlFor="user-id">Your ThisVid User ID</label>
              <input
                type="text"
                id="user-id"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          </div>
          <div className="container-section ">
            <div className="container-section-header">
              <h2>Moods</h2>
            </div>
            <div className="form-columns">
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
            <div className="mood-results-container">
              <div className="mood-results">
                {moods.map((mood) => (
                  <MoodResult
                    key={mood.name}
                    name={mood.name}
                    selectFunction={setActiveMood}
                    preferences={mood.preferences}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="form-container">
          {activeMood && (
            <>
              <h2>Preferences for {activeMood}</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
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
                <div className="button-columns">
                  <button onClick={saveMood}>Save</button>
                  <button onClick={deleteMood}>Delete</button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Moods;
