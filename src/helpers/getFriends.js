import cheerio from 'cheerio';


export const getFriends = async (userId) => {
  const response = await fetch(`/members/${userId}/friends/`);

  if (response.status === 404) {
    return false;
  }

  const body = await response.text();
  const $ = cheerio.load(body);

  // Get the text inside "a" inside li class="pagination-last".
  const lastPage = parseInt($('li.pagination-last a').text());

  // Fetch every page (except the first one) and get the friends.
  const friends = await Promise.all(
    [...Array(lastPage).keys()].slice(1).map(async (page) => {
      const response = await fetch(`/members/${userId}/friends/${page}/`);
      const body = await response.text();
      const $ = cheerio.load(body);

      return $('.tumbpu').map((i, e) => {
        const $e = $(e);

        // get profile ID from the last part of href inside $e. it has trailing slash
        const uid = $e.attr('href').split('/').filter(Boolean).pop();

        // get img src inside div class thumb
        const avatar = $e.find('.thumb img').attr('src');

        // get the username from span class title
        const username = $e.find('.title').text();

        return {uid, username, avatar};
      }).get();
    }),
  );

  return friends.flat().sort((a, b) => a.username.localeCompare(b.username));
};
