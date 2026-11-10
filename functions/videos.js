const cheerio = require('cheerio');
const fetch = require('node-fetch');

const { requireSiteOrigin } = require('./allowedOrigins');
const { durationSeconds, parseVideoTile } = require('./parseVideoTile');
const { LISTING_BASE, assertSafeListingPath, resolvePageHrefToThisvid } = require('./validateThisvidUrl');

const WEEK_SECONDS = 7 * 24 * 60 * 60;

/**
 * Latest listings move within hours. Only slow-changing indexes stay cached for a week:
 * the category index, category "most popular", and tag popular/best sorts.
 */
function isLongLivedListing(pathname) {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  if (path === '/categories') return true;
  if (/^\/categories\/[^/]+\/most-popular(\/\d+)?$/.test(path)) return true;
  if (/^\/tags\/[^/]+\/(popular|best)-(males|females)(\/\d+)?$/.test(path)) return true;
  return false;
}

/** Browser always revalidates; Netlify CDN holds the JSON. */
function successHeadersForListing(pathSuffix) {
  const pathname = String(pathSuffix || '').split('?')[0];
  const longLived = isLongLivedListing(pathname);
  const maxAge = longLived ? WEEK_SECONDS : 3600;
  const staleWhileRevalidate = longLived ? WEEK_SECONDS * 2 : 7200;

  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Netlify-CDN-Cache-Control': `public, durable, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    'Netlify-Vary': 'query',
  };
}

const errorHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function readVideosInput(event) {
  const method = (event.httpMethod || 'POST').toUpperCase();

  if (method === 'GET') {
    const q = event.queryStringParameters || {};
    return {
      url: typeof q.url === 'string' ? q.url.trim() : '',
      page: q.page !== undefined ? parseInt(String(q.page), 10) || 1 : 1,
      minDuration:
        q.minDuration !== undefined && q.minDuration !== null && String(q.minDuration).trim() !== ''
          ? parseFloat(String(q.minDuration)) || 0
          : 0,
      quick: q.quick !== 'false',
    };
  }

  const raw = event.body && String(event.body).trim() ? JSON.parse(event.body) : {};
  return {
    url: raw.url ?? '',
    page: raw.page ?? 1,
    minDuration: Number(raw.minDuration) || 0,
    quick: raw.quick !== false,
  };
}

exports.handler = async function (event, context) {
  const forbidden = requireSiteOrigin(event);
  if (forbidden) return forbidden;

  let input;
  try {
    input = readVideosInput(event);
  } catch (e) {
    return {
      statusCode: 400,
      headers: errorHeaders,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Invalid JSON body',
        success: false,
        videos: [],
      }),
    };
  }

  const { url, page = 1, minDuration = 0, quick = true } = input;

  if (!url) {
    return {
      statusCode: 400,
      headers: errorHeaders,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Missing parameter: url (query string or JSON body)',
        success: false,
        videos: [],
      }),
    };
  }

  let pathSuffix;
  try {
    pathSuffix = assertSafeListingPath(url);
  } catch (e) {
    console.warn('videos: invalid listing path', e?.message || e);
    return {
      statusCode: 400,
      headers: errorHeaders,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Invalid url',
        success: false,
        videos: [],
      }),
    };
  }

  try {
    const response = await fetch(LISTING_BASE + pathSuffix, {
      headers: {
        'Referer': LISTING_BASE + pathSuffix,
      },
    });

    if (response.status === 404) {
      return {
        statusCode: 400,
        headers: errorHeaders,
        body: JSON.stringify({
          status: 'Bad Request',
          message: 'Url not found',
          success: false,
          videos: [],
        }),
      };
    }

    const body = await response.text();
    const $ = cheerio.load(body);

    const videos = [];
    const urls = [];
    const minSeconds = minDuration * 60;
    $('.tumbpu').each((i, element) => {
      const parsed = parseVideoTile($, element);
      if (!parsed) return;
      if (durationSeconds(parsed.duration) < minSeconds) return;

      const video = { ...parsed, page };
      if (quick) {
        videos.push(video);
      } else {
        urls.push(video);
      }
    });

    if (!quick) {
      for (const video of urls) {
        try {
          const absVideoUrl = resolvePageHrefToThisvid(video.url);
          const vidResponse = await fetch(absVideoUrl);
          await vidResponse.text();
          videos.push(video);
        } catch (error) {
          console.error('videos: skipped bad video url', error?.message || error);
        }
      }
    }

    return {
      statusCode: 200,
      headers: successHeadersForListing(pathSuffix),
      body: JSON.stringify({
        success: true,
        videos: videos,
      }),
    };
  } catch (error) {
    console.error('videos:', error);
    return {
      statusCode: 500,
      headers: errorHeaders,
      body: JSON.stringify({
        status: 'Error',
        message: 'Failed to load videos',
        success: false,
        videos: [],
      }),
    };
  }
};
