const cheerio = require('cheerio');
const fetch = require('node-fetch');

const { requireSiteOrigin } = require('./allowedOrigins');
const { assertAbsoluteThisvidHttps } = require('./validateThisvidUrl');

function uniqueTexts(values) {
  const seen = new Set();
  const out = [];
  values.forEach((value) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    out.push(text);
  });
  return out;
}

function memberIdFromHref(href) {
  const match = String(href || '').match(/\/members\/(\d+)/);
  return match ? match[1] : '';
}

/**
 * Video page metadata. `category` stays the first category for older callers.
 * Rating is 0–100, converted from the page's 5-star score.
 *
 * @param {import('cheerio').CheerioAPI} $
 */
function parseVideoDetailsHtml($) {
  const descriptionList = $('.box ul.description').first();
  let categories = [];
  let tags = [];
  let uploaderName = '';
  let uploaderHref = '';

  descriptionList.find('li').each((_, element) => {
    const $li = $(element);
    const label = $li.find('span').first().text().replace(/\s+/g, ' ').trim().toLowerCase();
    if (label.startsWith('categor')) {
      categories = uniqueTexts($li.find('a').map((i, a) => $(a).text()).get());
    } else if (label.startsWith('tag')) {
      tags = uniqueTexts($li.find('a').map((i, a) => $(a).text()).get());
    } else if (label.startsWith('added by') || label.startsWith('uploaded by')) {
      const link = $li.find('a').first();
      uploaderName = link.text().replace(/\s+/g, ' ').trim();
      uploaderHref = link.attr('href') || '';
    }
  });

  if (categories.length === 0) {
    categories = uniqueTexts(
      descriptionList.find('li:nth-child(2) a').map((i, a) => $(a).text()).get(),
    );
  }
  if (tags.length === 0) {
    tags = uniqueTexts(descriptionList.find('li:nth-child(3) a').map((i, a) => $(a).text()).get());
  }
  if (!uploaderName) {
    const link = descriptionList.find('li:nth-child(4) a').first();
    uploaderName = link.text().replace(/\s+/g, ' ').trim();
    uploaderHref = link.attr('href') || '';
  }

  let rating = null;
  $('.tools-left li').each((_, element) => {
    if (rating != null) return;
    const match = $(element).text().replace(/\s+/g, ' ').match(/Rating:\s*(\d+(?:\.\d+)?)/i);
    if (!match) return;
    const stars = parseFloat(match[1]);
    if (!Number.isFinite(stars)) return;
    rating = Math.round((Math.min(5, Math.max(0, stars)) / 5) * 100);
  });

  return {
    category: categories[0] || '',
    categories,
    tags,
    uploader: {
      username: uploaderName,
      uid: memberIdFromHref(uploaderHref),
    },
    rating,
  };
}

exports.parseVideoDetailsHtml = parseVideoDetailsHtml;

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=31536000, s-maxage=31536000',
  'Netlify-Vary': 'query',
};

exports.handler = async function (event, context) {
  const forbidden = requireSiteOrigin(event);
  if (forbidden) return forbidden;

  const videoUrlParam = event.queryStringParameters?.url;

  if (!videoUrlParam) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Missing url query parameter',
        success: false,
      }),
      headers,
    };
  }

  let videoUrl;
  try {
    videoUrl = assertAbsoluteThisvidHttps(videoUrlParam);
  } catch {
    console.warn('videoDetails: rejected non-ThisVid URL');
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Invalid url',
        success: false,
      }),
      headers,
    };
  }

  try {
    const response = await fetch(videoUrl);

    if (response.status === 404) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          status: 'Not Found',
          message: 'Video not found',
          success: false,
        }),
        headers,
      };
    }

    const body = await response.text();
    const $ = cheerio.load(body);
    const details = parseVideoDetailsHtml($);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        category: details.category,
        categories: details.categories,
        tags: details.tags,
        uploader: details.uploader,
        rating: details.rating,
      }),
      headers,
    };
  } catch (error) {
    console.error('videoDetails:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'Internal Server Error',
        message: 'Failed to load video details',
        success: false,
      }),
      headers,
    };
  }
};
