import React from 'react';
import { LazyLoadComponent } from 'react-lazy-load-image-component';

import debug from '../../helpers/debug';
import Result from '../Result';

const ResultsContainer = ({ videos = [] }) => {
  return (
    <div className="results-scroll-container">
      <div className="results">
        {videos.map((video, index) => (
          <LazyLoadComponent height={150} key={index}>
            <Result
              title={video.title}
              url={video.url}
              isPrivate={video.isPrivate}
              duration={video.duration}
              imageSrc={video.avatar}
              date={video.date}
              views={video.views}
              // isFriend={mode === 'friend'}
              page={debug ? video.page : null}
            />
          </LazyLoadComponent>
        ))}
      </div>
    </div>
  );
};

export default ResultsContainer;
