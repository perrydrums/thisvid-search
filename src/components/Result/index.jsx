import React from 'react';
import friendsIcon from '../../images/friends.png';
import './style.css';

const Result = ({title, url, duration, views, date, isFriend = false, imageSrc = null, page = null, isPrivate = false}) => (
  <div
    className="result"
    onClick={() => window.open(url, '_blank')}
  >
    {imageSrc &&
      <div className="thumbnail" style={{backgroundImage: `url(${imageSrc})`}}>
        {isFriend && <div className="friends">
          <img src={friendsIcon} alt="Friends" />
        </div>}
        <span className="info">
        {views &&
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="90" height="50" viewBox="0 0 90 50">
              <g id="Group_1" data-name="Group 1" transform="translate(-5 -25)">
                <path id="Path_1" fill="white" data-name="Path 1"
                      d="M50,34A16,16,0,1,0,66,50,16.047,16.047,0,0,0,50,34Zm0,28A12,12,0,1,1,62,50,12.035,12.035,0,0,1,50,62ZM94.4,48.6l-8.6-8.7a50.458,50.458,0,0,0-71.6,0L5.6,48.6a1.933,1.933,0,0,0,0,2.8l8.6,8.7a50.458,50.458,0,0,0,71.6,0l8.6-8.7A1.933,1.933,0,0,0,94.4,48.6ZM83,57.3a46.595,46.595,0,0,1-66,0L9.8,50,17,42.7a46.595,46.595,0,0,1,66,0L90.2,50Z"/>
              </g>
            </svg>
            {views.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} views
          </>
        }
        </span>
        <span className="info">{duration}</span>
      </div>
    }
    <div className="details">
      {page && `[${page}] `}{title}
      {date && <p className="date">{date}</p>}
      {isPrivate && <span className="private">Private</span>}
    </div>
  </div>
);

export default Result;
