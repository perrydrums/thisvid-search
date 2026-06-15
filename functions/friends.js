const cheerio = require('cheerio');
const fetch = require('node-fetch');

const { requireSiteOrigin } = require('./allowedOrigins');

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=86400',
  'Netlify-Vary': 'query',
};

function memberIdFromProfileHref(href) {
  const m = String(href || '').match(/\/members\/([^/?#]+)/);
  return m ? m[1] : '';
}

function parseFriendsFromPage($) {
  return $('.tumbpu')
    .map((i, e) => {
      const $e = $(e);
      const url = $e.attr('href') || '';
      const uid = memberIdFromProfileHref(url);
      const avatar = $e.find('.thumb img').attr('src') || '';
      const username = $e.find('.title').text() || '';

      return { uid, username, avatar, url };
    })
    .get()
    .filter((f) => f.uid);
}

exports.handler = async function (event, context) {
  const forbidden = requireSiteOrigin(event);
  if (forbidden) return forbidden;

  const userId = event.queryStringParameters?.userId;

  if (!userId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Missing query parameter: "userId"',
        success: false,
      }),
    };
  }

  try {
    const encoded = encodeURIComponent(userId);

    const response = await fetch(`https://thisvid.com/members/${encoded}/friends/`);

    if (response.status === 404) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          status: 'Bad Request',
          message: 'User not found',
          success: false,
        }),
      };
    }

    const body = await response.text();
    const $ = cheerio.load(body);

    const pageAmount =
      parseInt($('li.pagination-last a').text()) ||
      parseInt($('ul.pagination-list li:nth-last-child(2) a').text()) ||
      1;

    const page1Friends = parseFriendsFromPage($);

    const restPages = await Promise.all(
      [...Array(pageAmount).keys()].slice(1).map(async (page) => {
        const res = await fetch(`https://thisvid.com/members/${encoded}/friends/${page}/`);
        const b = await res.text();
        const $$ = cheerio.load(b);
        return parseFriendsFromPage($$);
      }),
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        pageAmount,
        friends: [page1Friends, ...restPages].flat(),
      }),
    };
  } catch (error) {
    console.error('friends:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'Internal Server Error',
        message: 'Failed to load friends',
        success: false,
      }),
    };
  }
};
