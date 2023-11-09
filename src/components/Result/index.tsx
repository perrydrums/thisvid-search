import React from 'react';

import getDownloadUrl from '../../helpers/getDownloadUrl';
import friendsIcon from '../../images/friends.png';
import './style.css';

type ResultProps = {
  title: string;
  url: string;
  duration: string;
  views: number;
  date: string;
  isFriend?: boolean;
  imageSrc?: string;
  page?: string;
  isPrivate?: boolean;
  relevance?: string;
};

const Result = ({
  title,
  url,
  duration,
  views,
  date,
  isFriend = false,
  imageSrc = '',
  page = '',
  isPrivate = false,
  relevance = '',
}: ResultProps) => {
  const [downloadUrl, setDownloadUrl] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const fetchDownloadUrl = async () => {
    setLoading(true);
    const dUrl = await getDownloadUrl(url);
    setDownloadUrl(dUrl);
    setLoading(false);
  };

  return (
    <div className="result">
      <div>
        {imageSrc && (
          <div
            className="thumbnail"
            style={{ backgroundImage: `url(${imageSrc})` }}
            onClick={() => window.open(url, '_blank')}
          >
            <span className="info">
              {views && (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="90"
                    height="50"
                    viewBox="0 0 90 50"
                  >
                    <g id="Group_1" data-name="Group 1" transform="translate(-5 -25)">
                      <path
                        id="Path_1"
                        fill="white"
                        data-name="Path 1"
                        d="M50,34A16,16,0,1,0,66,50,16.047,16.047,0,0,0,50,34Zm0,28A12,12,0,1,1,62,50,12.035,12.035,0,0,1,50,62ZM94.4,48.6l-8.6-8.7a50.458,50.458,0,0,0-71.6,0L5.6,48.6a1.933,1.933,0,0,0,0,2.8l8.6,8.7a50.458,50.458,0,0,0,71.6,0l8.6-8.7A1.933,1.933,0,0,0,94.4,48.6ZM83,57.3a46.595,46.595,0,0,1-66,0L9.8,50,17,42.7a46.595,46.595,0,0,1,66,0L90.2,50Z"
                      />
                    </g>
                  </svg>
                  {views.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                </>
              )}
            </span>
            <span className="info">{duration}</span>
          </div>
        )}
        <div className="title">
          <span onClick={() => window.open(url, '_blank')}>
            {page !== null && `[${page}] `}
            {relevance !== null && `(${relevance}) `}
            {title}
          </span>
        </div>
      </div>

      <div className="details">
        {date && <span className="date">{date}</span>}
        {!isPrivate ? (
          <div
            className={`download ${loading ? 'loading' : ''} ${downloadUrl ? 'done' : ''}`}
            onClick={() => {
              if (downloadUrl) {
                window.open(downloadUrl, '_blank');
              } else {
                if (!loading) {
                  fetchDownloadUrl();
                }
              }
            }}
          >
            <svg
              width="800px"
              height="800px"
              viewBox="0 0 24 24"
              stroke="#FFFFFF"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 3V16M12 16L16 11.625M12 16L8 11.625"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : (
          <div className="download">
            {isFriend ? (
              <div className="friends">
                <img src={friendsIcon} alt="Friends" />
              </div>
            ) : (
              <span className="private">Private</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Result;
