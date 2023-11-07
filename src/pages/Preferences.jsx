import React, { useEffect, useState } from 'react';

import '../App.css';
import InputTags from '../components/input/Tags';

const Preferences = () => {
  const [{ id, tags, boosterTags, minDuration }, setPreferences] = useState({
    id: '',
    tags: [],
    boosterTags: [],
    minDuration: 0,
  });

  useEffect(() => {
    const preferences = ((p) => (p ? JSON.parse(p) : null))(
      localStorage.getItem('tvass-preferences'),
    );

    preferences && setPreferences(preferences);
  }, []);

  const savePreferences = (e) => {
    e.preventDefault();
    localStorage.setItem(
      'tvass-preferences',
      JSON.stringify({ id, tags, boosterTags, minDuration }),
    );
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
                value={id}
                onChange={(e) =>
                  setPreferences({ tags, boosterTags, minDuration, id: e.target.value })
                }
              />
              <label htmlFor="tags">Default tags</label>
              <InputTags
                tags={tags}
                setTags={(tags) => setPreferences({ id, tags, boosterTags, minDuration })}
              />
              <label htmlFor="booster-tags">Default booster tags</label>
              <InputTags
                htmlId="booster-tags"
                tags={boosterTags}
                setTags={(boosterTags) => setPreferences({ id, tags, boosterTags, minDuration })}
              />
              <label htmlFor="min-duration">Min Duration (minutes)</label>
              <input
                type="number"
                min="0"
                id="min-duration"
                required
                value={minDuration}
                onChange={(e) =>
                  setPreferences({
                    id,
                    tags,
                    boosterTags,
                    minDuration: parseInt(e.target.value || 0),
                  })
                }
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
