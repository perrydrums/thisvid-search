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

  const parsePage = ($page: ReturnType<typeof cheerio.load>) =>
    $page('.tumbpu')
      .map((_i, e) => {
        const $e = $page(e);
        const url = $e.attr('href') || '';
        const uid = url.split('/').filter(Boolean).pop() || '';
        const avatar = $e.find('.thumb img').attr('src') || '';
        const username = $e.find('.title').text() || '';

        return { uid, username, avatar, url };
      })
      .get()
      .filter((f) => f.uid);

  const page1Friends = parsePage($);

  let progress = 1;
  updateProgress(progress);

  const restPages = await Promise.all(
    [...Array(lastPage).keys()].slice(1).map(async (page) => {
      const pageResponse = await fetch(`/members/${userId}/friends/${page}/`);
      const pageBody = await pageResponse.text();
      const $page = cheerio.load(pageBody);

      progress++;
      updateProgress(progress);

      return parsePage($page);
    }),
  );

  return [...page1Friends, ...restPages.flat()];
};
