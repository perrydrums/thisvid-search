import React from 'react';

import './style.css';

const MoodResult = ({ name, preferences, selectFunction }) => (
  <div className="result" onClick={() => selectFunction(name)} style={{ cursor: 'pointer' }}>
    <div className="title">{name}</div>
    <div className="details">
      <span className="date">
        {preferences.tags.length > 0 ? `Tags: ${preferences.tags.join(', ')}` : 'No tags'}
      </span>
    </div>
  </div>
);

export default MoodResult;
