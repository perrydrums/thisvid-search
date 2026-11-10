const cheerio = require('cheerio');
const fetch = require('node-fetch');

const { requireSiteOrigin } = require('./allowedOrigins');
const { parseVideoTile } = require('./parseVideoTile');
const { LISTING_BASE } = require('./validateThisvidUrl');

const successHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Netlify-CDN-Cache-Control': 'public, durable, max-age=1800, stale-while-revalidate=3600',
  'Netlify-Vary': 'query',
};

const errorHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function sectionKind(headline) {
  const text = String(headline || '').toLowerCase();
  if (text.includes('private video')) return 'private';
  if (text.includes('favourite video') || text.includes('favorite video')) return 'favourite';
  if (text.includes('public video')) return 'public';
  return null;
}

function usernameFromTitle(title) {
  const cleaned = String(title || '').replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/^(.*)'s Profile\b/i);
  return match ? match[1].trim() : '';
}

/**
 * One profile page: newest public uploads, newest private uploads, latest favourites.
 * Sections are missing entirely when the member has none.
 *
 * @param {import('cheerio').CheerioAPI} $
 */
function parseMemberFeedHtml($) {
  const buckets = { public: [], private: [], favourite: [] };
  const seen = { public: new Set(), private: new Set(), favourite: new Set() };
  let current = null;

  $('h2, a.tumbpu').each((_, el) => {
    const tag = String(el.name || el.tagName || '').toLowerCase();
    if (tag === 'h2') {
      current = sectionKind($(el).text());
      return;
    }
    if (!current) return;

    const parsed = parseVideoTile($, el);
    if (!parsed || seen[current].has(parsed.url)) return;
    seen[current].add(parsed.url);
    buckets[current].push({ ...parsed, page: 1 });
  });

  const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').first().text();

  return {
    username: usernameFromTitle(ogTitle),
    publicVideos: buckets.public,
    privateVideos: buckets.private,
    favouriteVideos: buckets.favourite,
  };
}

exports.parseMemberFeedHtml = parseMemberFeedHtml;

exports.handler = async function (event) {
  const forbidden = requireSiteOrigin(event);
  if (forbidden) return forbidden;

  const method = (event.httpMethod || 'GET').toUpperCase();
  if (method !== 'GET') {
    return {
      statusCode: 405,
      headers: errorHeaders,
      body: JSON.stringify({
        status: 'Method Not Allowed',
        message: 'Use GET with ?uid=',
        success: false,
      }),
    };
  }

  const uid = String(event.queryStringParameters?.uid || '').trim();
  if (!/^\d{1,12}$/.test(uid)) {
    return {
      statusCode: 400,
      headers: errorHeaders,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Missing or invalid query parameter: uid',
        success: false,
      }),
    };
  }

  const profileUrl = `${LISTING_BASE}/members/${uid}/`;

  try {
    const response = await fetch(profileUrl, {
      headers: { Referer: profileUrl },
    });

    if (response.status === 404) {
      return {
        statusCode: 400,
        headers: errorHeaders,
        body: JSON.stringify({
          status: 'Bad Request',
          message: 'User not found',
          success: false,
        }),
      };
    }

    const body = await response.text();
    const $ = cheerio.load(body);
    const parsed = parseMemberFeedHtml($);

    return {
      statusCode: 200,
      headers: successHeaders,
      body: JSON.stringify({
        success: true,
        uid,
        username: parsed.username,
        publicVideos: parsed.publicVideos,
        privateVideos: parsed.privateVideos,
        favouriteVideos: parsed.favouriteVideos,
      }),
    };
  } catch (error) {
    console.error('memberFeed:', error);
    return {
      statusCode: 500,
      headers: errorHeaders,
      body: JSON.stringify({
        status: 'Error',
        message: 'Failed to load member feed',
        success: false,
      }),
    };
  }
};
