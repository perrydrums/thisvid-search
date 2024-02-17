import React from 'react';
import { LazyLoadComponent } from 'react-lazy-load-image-component';

import { getLocalFavourites } from '../../helpers/favourites';
import { Video } from '../../helpers/types';
import Result from '../Result';

type ResultsContainerProps = {
  videos: Array<Video>;
};

const ResultsContainer = ({ videos = [] }: ResultsContainerProps) => {
  const favourites = getLocalFavourites();
  return (
    <div className="results-scroll-container">
      <div className="results">
        {videos.map((video: Video, index) => (
          // @ts-ignore
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
              page={video.page}
              relevance={video.relevance}
              isFavourite={favourites.includes(video.url)}
            />
          </LazyLoadComponent>
        ))}
      </div>
    </div>
  );
};

export default ResultsContainer;
