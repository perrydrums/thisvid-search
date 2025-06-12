import React from 'react';
import { Video, Friend, Category, LogParams } from '../../helpers/types';
import { sortVideos } from '../../helpers/videos';
import ResultsContainer from '../ResultsContainer';
import CategoriesContainer from '../ResultsContainer/CategoriesContainer';
import FriendsContainer from '../ResultsContainer/FriendsContainer';
import Feedback from '../Feedback';
import Share from '../Share';

interface SearchResultsProps {
  mode: string;
  category: string;
  categoryType: string;
  friendId: string;
  loading: boolean;
  finished: boolean;
  videos: Video[];
  setVideos: (videos: Video[]) => void;
  categories: Category[];
  setCategory: (category: string) => void;
  friends: Friend[];
  setFriendId: (friendId: string) => void;
  friendSearch: string;
  errorMessage: string;
  searchObject: LogParams | null;
  sort: string;
  setSort: (sort: string) => void;
  getShareUrl: () => string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  mode,
  category,
  categoryType,
  friendId,
  loading,
  finished,
  videos,
  setVideos,
  categories,
  setCategory,
  friends,
  setFriendId,
  friendSearch,
  errorMessage,
  searchObject,
  sort,
  setSort,
  getShareUrl,
}) => {
  if (mode === 'category' && !category && categoryType !== '') {
    return (
      <>
        <div className="results-header">
          <h2>Select a category</h2>
        </div>
        <CategoriesContainer categories={categories} setCategory={setCategory} />
      </>
    );
  }

  if (mode === 'friend' && !friendId) {
    return (
      <>
        <div className="results-header">
          {errorMessage ? (
            <span className="error">{errorMessage}</span>
          ) : (
            <h2>
              {loading
                ? 'Collecting friends...'
                : finished
                ? `Found ${friends.length} friends`
                : ''}
            </h2>
          )}
          <div>
            <input
              type="text"
              id="friend-search"
              value={friendSearch}
              placeholder="Username"
              disabled={friends.length === 0}
              readOnly={true}
            />
          </div>
        </div>
        <FriendsContainer
          friends={friends}
          setFriendId={setFriendId}
          filterUsername={friendSearch}
        />
      </>
    );
  }

  return (
    <>
      <div className="results-header">
        <h2>
          {loading
            ? 'Searching...'
            : finished
            ? `Found ${videos.length} videos`
            : 'Search for videos'}
        </h2>
        {searchObject && (
          <>
            <Feedback search={searchObject} />
            <Share url={getShareUrl()} />
          </>
        )}
        <div>
          <label htmlFor="sort">Sort by</label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setVideos(sortVideos(videos, e.target.value));
            }}
          >
            <option value="relevance">Relevance</option>
            <option value="views">Views</option>
            <option value="viewsAsc">Least views</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="longest">Longest</option>
            <option value="shortest">Shortest</option>
          </select>
        </div>
      </div>
      <ResultsContainer videos={videos} />
    </>
  );
};
