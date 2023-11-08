import React, { useEffect, useState } from 'react';

import '../App.css';
import InputTags from '../components/input/Tags';

const Preferences = () => {
  const [preferences, setPreferences] = useState({
    id: '',
    tags: [],
    excludeTags: [],
    boosterTags: [],
    diminishingTags: [],
    minDuration: 0,
  });

  useEffect(() => {
    const p = ((p) => (p ? JSON.parse(p) : null))(localStorage.getItem('tvass-preferences'));

    Object.keys(p).forEach((key) => {
      if (p[key]) {
        setPreferences((prevState) => ({ ...prevState, [key]: p[key] }));
      }
    });
  }, []);

  const setPreference = (key, value) => {
    setPreferences({ ...preferences, [key]: value });
  };

  const savePreferences = (e) => {
    e.preventDefault();
    localStorage.setItem('tvass-preferences', JSON.stringify(preferences));
  };

  return (
    <>
      <div className="header">
        <span className="subtitle">ThisVid Advanced Search Site</span>
      </div>
      <div className="container">
        <div className="form-container">
          <h2>Preferences</h2>
          <form onSubmit={savePreferences}>
            <div className="form-columns">
              <label htmlFor="id">Your User ID</label>
              <input
                type="text"
                id="id"
                value={preferences.id}
                onChange={(e) => setPreference('id', e.target.value)}
              />
              <label htmlFor="tags">Default tags</label>
              <InputTags tags={preferences.tags} setTags={(t) => setPreference('tags', t)} />
              <label htmlFor="exclude-tags">Default exclude tags</label>
              <InputTags
                htmlId="exclude-tags"
                tags={preferences.excludeTags}
                setTags={(t) => setPreference('excludeTags', t)}
              />
              <label htmlFor="booster-tags">Default booster tags</label>
              <InputTags
                htmlId="booster-tags"
                tags={preferences.boosterTags}
                setTags={(t) => setPreference('boosterTags', t)}
              />
              <label htmlFor="diminishing-tags">Default diminishing tags</label>
              <InputTags
                htmlId="diminishing-tags"
                tags={preferences.diminishingTags}
                setTags={(t) => setPreference('diminishingTags', t)}
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
              <button type="submit">Save</button>
            </div>
          </form>
        </div>
        <div className="results-container">a</div>
      </div>
    </>
  );
};

export default Preferences;
