import cheerio from 'cheerio';

import { Friend } from './types';

export const getFriends = async (
  userId: string,
  setTotalPages: (totalPages: number) => void,
  updateProgress: (progress: number) => void,
): Promise<Array<Friend> | boolean> => {
  const response = await fetch(`/members/${userId}/friends/`);

  if (response.status === 404) {
    return false;
  }

  const body = await response.text();
  const $ = cheerio.load(body);

  // Get the text inside "a" inside li class="pagination-last".
  const lastPage = parseInt($('li.pagination-last a').text());

  // Set the total pages.
  setTotalPages(lastPage);

  let progress = 1;
  // Fetch every page (except the first one) and get the friends.
  const friends = await Promise.all(
    [...Array(lastPage).keys()].slice(1).map(async (page) => {
      const response = await fetch(`/members/${userId}/friends/${page}/`);
      const body = await response.text();
      const $ = cheerio.load(body);

      progress++;
      updateProgress(progress);

      return $('.tumbpu')
        .map((i, e) => {
          const $e = $(e);
          const url = $e.attr('href') || '';
          const uid = $e.attr('href')?.split('/').filter(Boolean).pop() || '';
          const avatar = $e.find('.thumb img').attr('src') || '';
          const username = $e.find('.title').text() || '';

          return { uid, username, avatar, url };
        })
        .get();
    }),
  );

  return friends.flat();
};
