const cheerio = require('cheerio');
const fetch = require('node-fetch');

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=31536000',
  'Netlify-Vary': 'query',
};

exports.handler = async function (event, context) {
  const userId = event.queryStringParameters.userId;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Missing query parameter: "userId"',
        success: false,
      }),
    };
  }

  const response = await fetch(`https://thisvid.com/members/${userId}/friends/`);

  if (response.status === 404) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'User not found',
        success: false,
      }),
    };
  }

  const body = await response.text();
  const $ = cheerio.load(body);

  // Get the text inside "a" inside li class="pagination-last".
  const pageAmount = parseInt($('li.pagination-last a').text());

  // Fetch every page (except the first one) and get the friends.
  const friends = await Promise.all(
    [...Array(pageAmount).keys()].slice(1).map(async (page) => {
      const response = await fetch(`https://thisvid.com/members/${userId}/friends/${page}/`);
      const body = await response.text();
      const $ = cheerio.load(body);

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

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      pageAmount,
      friends: friends.flat(),
    }),
  };
};
