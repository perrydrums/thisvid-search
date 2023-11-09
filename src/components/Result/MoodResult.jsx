import React from 'react';

import './style.css';

const MoodResult = ({
  name,
  preferences,
  defaultMood = false,
  editFunction,
  setDefaultFunction,
}) => (
  <div className="result" onClick={() => editFunction(name)} style={{ cursor: 'pointer' }}>
    <div className="title">
      {name}
      <div
        className={`default-mood ${defaultMood && 'active'}`}
        onClick={() => setDefaultFunction(defaultMood ? '' : name)}
      >
        &#9733;
      </div>
    </div>
    <div className="details">
      <span className="date">
        {preferences.tags.length > 0 ? (
          <span>
            <b>Tags</b>: {preferences.tags.join(', ')}{' '}
          </span>
        ) : (
          <span>No tags</span>
        )}
      </span>
    </div>
  </div>
);

export default MoodResult;
