import React, { useEffect, useState } from 'react';

import '../App.css';
import MoodResult from '../components/Result/MoodResult';
import InputTags from '../components/input/Tags';

const Moods = () => {
  const m = ((p) => (p ? JSON.parse(p) : []))(localStorage.getItem('tvass-moods'));

  const [preferences, setPreferences] = useState({
    id: '',
    tags: [],
    excludeTags: [],
    boosterTags: [],
    diminishingTags: [],
    minDuration: 0,
  });
  const [moods, setMoods] = useState(m);
  const [activeMood, setActiveMood] = useState('');
  const [newMoodName, setNewMoodName] = useState('');

  /**
   * @type {HTMLInputElement|null}
   */
  let newMoodInput = null;

  useEffect(() => {
    const p = moods.find((mood) => mood.name === activeMood)?.preferences;

    p &&
      Object.keys(p).forEach((key) => {
        if (p[key] !== undefined) {
          setPreferences((prevState) => ({ ...prevState, [key]: p[key] }));
        }
      });
  }, [activeMood, moods]);

  const newMood = (name) => {
    const mood = {
      name,
      preferences: {
        id: '',
        tags: [],
        excludeTags: [],
        boosterTags: [],
        diminishingTags: [],
        minDuration: 0,
      },
    };

    setMoods([...moods, mood]);
    setNewMoodName('');
    newMoodInput.blur();

    localStorage.setItem('tvass-moods', JSON.stringify([...moods, mood]));
  };

  const inputKeyDown = (e) => {
    const val = e.target.value;
    if (e.key === 'Enter' && val) {
      e.preventDefault();
      newMood(val);
    }
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
          <div className="results-header">
            <h2>Moods</h2>
            <div>
              <input
                type="text"
                onKeyDown={inputKeyDown}
                value={newMoodName}
                onChange={(e) => setNewMoodName(e.target.value)}
                placeholder="New mood name"
                ref={(c) => {
                  newMoodInput = c;
                }}
              />
              {newMoodName && (
                <div className="input-tag__tooltip" onClick={newMood}>
                  Add <b>{newMoodName}</b> ⏎
                </div>
              )}
            </div>
          </div>
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
        <div className="form-container">
          <h2>Preferences</h2>
          {activeMood && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <div className="form-columns">
                <label htmlFor="id">Your User ID</label>
                <input
                  type="text"
                  id="id"
                  value={preferences.id}
                  onChange={(e) => setPreference('id', e.target.value)}
                />
              </div>
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
          )}
        </div>
      </div>
    </>
  );
};

export default Moods;
