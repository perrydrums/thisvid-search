import { useCallback } from 'react';
import cheerio from 'cheerio';
import { Video } from '../helpers/types';
import { getVideos } from '../helpers/videos';
import { getFriends } from '../helpers/friends';
import { getUsername } from '../helpers/users';
import { log } from '../helpers/supabase/log';

interface UseSearchLogicProps {
  mode: string;
  type: string;
  id: string;
  friendId: string;
  primaryTag: string;
  category: string;
  minDuration: number;
  quick: boolean;
  omitPrivate: boolean;
  preserveResults: boolean;
  rawVideos: Video[];
  includeTags: string[];
  advanced: boolean;
  amount: number;
  setLoading: (loading: boolean) => void;
  setProgressCount: (count: number) => void;
  setRawVideos: (videos: Video[]) => void;
  setFinished: (finished: boolean) => void;
  setErrorMessage: (message: string) => void;
  setPageLimit: (limit: number) => void;
  setAmount: (amount: number) => void;
  setSourceExists: (exists: boolean) => void;
  setUsername: (username: string) => void;
  setFriends: (friends: any[]) => void;
  setSearchObject: (obj: any) => void;
  executeScroll: () => void;
}

export const useSearchLogic = ({
  mode,
  type,
  id,
  friendId,
  primaryTag,
  category,
  minDuration,
  quick,
  omitPrivate,
  preserveResults,
  rawVideos,
  includeTags,
  advanced,
  amount,
  setLoading,
  setProgressCount,
  setRawVideos,
  setFinished,
  setErrorMessage,
  setPageLimit,
  setAmount,
  setSourceExists,
  setUsername,
  setFriends,
  setSearchObject,
  executeScroll,
}: UseSearchLogicProps) => {

  const getUrl = useCallback((page: number): string => {
    const baseUrl: { [key: string]: string } = {
      newest: `/${type}/${page}/`,
      user: `/members/${id}/${type}_videos/${page}/`,
      friend: `/members/${friendId}/${type}_videos/${page}/`,
      tags: `/tags/${primaryTag}/${type}-males/${page}/`,
      category: `/categories/${category}/${type}/${page}/`,
      extreme: `/${type}/${page}/?q=${primaryTag}`,
    };

    if (mode === 'category' && type === 'latest') {
      return `/categories/${category}/${page}/`;
    }

    return baseUrl[mode] || '';
  }, [mode, type, id, friendId, primaryTag, category]);

  const getPageLimitUrl = useCallback((): string => {
    const baseUrl: { [key: string]: string } = {
      newest: `/${type}/`,
      user: `/members/${id}/${type}_videos/`,
      friend: `/members/${friendId}/${type}_videos/`,
      tags: `/tags/${primaryTag}/popular-males/`,
      category: `/categories/${category}/`,
      extreme: `/${type}/1/?q=${primaryTag}`,
    };

    return baseUrl[mode] || '';
  }, [mode, type, id, friendId, primaryTag, category]);

  const getSourceUrl = useCallback(() => {
    const baseUrl: { [key: string]: string } = {
      newest: `/${type}/`,
      user: `/members/${id}/`,
      friend: `/members/${friendId}/`,
      tags: `/tags/${primaryTag}/`,
      category: `/categories/${category}/`,
    };

    return baseUrl[mode] || '';
  }, [mode, type, id, friendId, primaryTag, category]);

  const urlExists = async (url: string) => {
    const response = await fetch(url);
    return response.status !== 404;
  };

  const checkSourceExists = async () => {
    const url = getSourceUrl();
    const exists = await urlExists(url);
    setSourceExists(exists);
    return exists;
  };

  const getPageLimit = useCallback(async () => {
    const url = getPageLimitUrl();

    let response;
    if (
      (mode === 'extreme' && (!type || !primaryTag)) ||
      (mode === 'newest' && !type)
    ) {
      return;
    } else {
      response = await fetch(url);
    }

    if (response) {
      if (response.status === 404) {
        return;
      }

      const body = await response.text();
      const $ = cheerio.load(body);

      const lastPage =
        parseInt(
          $('li.pagination-last a').text() || $('.pagination-list li:nth-last-child(2) a').text(),
        ) || 1;

      setPageLimit(lastPage);
      setAmount(lastPage < 100 ? lastPage : 100);
    }
  }, [getPageLimitUrl, mode, type, primaryTag, setPageLimit, setAmount]);

  const updateUsername = useCallback(async () => {
    const username = await getUsername(id);

    if (username) {
      setUsername(username);
    } else {
      setErrorMessage(`User ${id} does not exist.`);
      setUsername('');
    }
  }, [id, setUsername, setErrorMessage]);

  const getFriendsById = async () => {
    setLoading(true);
    const f = await getFriends(id, setAmount, setProgressCount);

    if (!f.success) {
      setErrorMessage('User not found');
    } else if (f.friends.length === 0) {
      setErrorMessage('No friends found');
    }

    setFriends(f.friends);
    setLoading(false);
    setFinished(true);
    localStorage.setItem('uid', id);
  };

  const logSearch = async () => {
    const s = await log({
      id: parseInt(id) || 0,
      mode,
      type,
      advanced,
      tags: includeTags,
      pageAmount: amount,
      quick,
      duration: minDuration,
      primaryTag,
      category,
      userId: id,
      friendId,
      resultCount: 0, // Will be updated after filtering
      visitorId: localStorage.getItem('visitorId') || '',
      visitorName: localStorage.getItem('visitorName') || '',
    });
    setSearchObject(s);
  };

  const run = async (offset: number) => {
    setLoading(true);
    setProgressCount(0);

    if (!preserveResults) {
      setRawVideos([]);
    }
    const promises = [];

    const urlFirstPage = getUrl(offset);
    const firstPageExists = await urlExists(urlFirstPage);

    if (!firstPageExists) {
      setFinished(true);
      setErrorMessage(`Page ${offset} does for ${mode} not exist.`);
      setLoading(false);
      return;
    }

    for (let i = offset; i <= offset - 1 + amount; i++) {
      const url = getUrl(i);
      const currentPage = i;
      promises.push(
        getVideos({
          url,
          minDuration,
          quick,
          page: currentPage,
          omitPrivate,
        }).then((s) => {
          // Return both the result and page info for later processing
          return {
            videos: s,
            page: currentPage,
            // @ts-ignore
            hasError: s && s.error === 404
          };
        }),
      );
    }

    try {
      const results = await Promise.all(promises);

      // Update progress
      setProgressCount(results.length);

      // Handle page limits
      const errorPages = results.filter(r => r.hasError).map(r => r.page);
      if (errorPages.length > 0) {
        const minErrorPage = Math.min(...errorPages);
        setPageLimit(minErrorPage - 1);
      }

      // Extract videos
      const videos = results.flatMap(r => r.videos).filter(
        // @ts-ignore
        (value, index, self) => index === self.findIndex((v) => v.url === value.url),
      );

      const newRawVideos = preserveResults
        ? [...rawVideos, ...videos] as Video[]
        : videos as Video[];

      setRawVideos(newRawVideos);
      setFinished(true);
      executeScroll();
      logSearch();
    } catch (error) {
      console.log('Error: ' + error);
    }

    setLoading(false);
  };

  return {
    getUrl,
    getPageLimitUrl,
    getSourceUrl,
    urlExists,
    checkSourceExists,
    getPageLimit,
    updateUsername,
    getFriendsById,
    logSearch,
    run,
  };
};
