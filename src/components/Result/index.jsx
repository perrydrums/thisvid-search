import React from 'react';
import './style.css';

const Result = ({title, url, duration, page, imageSrc = null, isPrivate = false}) => (
  <div
    className="result"
    onClick={() => window.open(url, '_blank')}
  >
    {imageSrc &&
      <div className="thumbnail">
        <img src={imageSrc} alt={title} />
      </div>
    }
    <div className="details">
      [{page}] {title}
      <p className="duration">{duration}</p>
      {isPrivate && <span className="private">Private</span>}
    </div>
  </div>
);

export default Result;
