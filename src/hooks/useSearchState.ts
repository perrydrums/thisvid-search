import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Video, Friend, Category, Mood, LogParams } from '../helpers/types';

export const useSearchState = () => {
  const [searchParams] = useSearchParams();
  const params: { [key: string]: any } = {};

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Core search parameters
  const [mode, setMode] = useState(params.mode || 'category');
  const [id, setId] = useState(params.id || '');
  const [type, setType] = useState(params.type || '');
  const [category, setCategory] = useState(params.category || '');
  const [categoryType, setCategoryType] = useState('');
  const [primaryTag, setPrimaryTag] = useState(params.primaryTag || '');
  const [friendId, setFriendId] = useState(params.friendId || '');

  // Pagination and limits
  const [start, setStart] = useState(params.start || 1);
  const [amount, setAmount] = useState(params.amount || 30);
  const [pageLimit, setPageLimit] = useState(0);

  // UI state
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sourceExists, setSourceExists] = useState(true);
  const [progressCount, setProgressCount] = useState(0);
  const [username, setUsername] = useState('');

  // Data collections
  const [friends, setFriends] = useState<Friend[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [searchObject, setSearchObject] = useState<LogParams | null>(null);

  // Friend search UI
  const [friendIdFieldHover, setFriendIdFieldHover] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');

  return {
    // Search parameters
    mode, setMode,
    id, setId,
    type, setType,
    category, setCategory,
    categoryType, setCategoryType,
    primaryTag, setPrimaryTag,
    friendId, setFriendId,

    // Pagination
    start, setStart,
    amount, setAmount,
    pageLimit, setPageLimit,

    // UI state
    loading, setLoading,
    finished, setFinished,
    advanced, setAdvanced,
    errorMessage, setErrorMessage,
    sourceExists, setSourceExists,
    progressCount, setProgressCount,
    username, setUsername,

    // Data collections
    friends, setFriends,
    categories, setCategories,
    moods, setMoods,
    searchObject, setSearchObject,

    // Friend search UI
    friendIdFieldHover, setFriendIdFieldHover,
    friendSearch, setFriendSearch,

    // URL params for easy access
    params,
  };
};
