const cheerio = require('cheerio');
const fetch = require('node-fetch');

const { requireSiteOrigin } = require('./allowedOrigins');
const { assertAbsoluteThisvidHttps } = require('./validateThisvidUrl');

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

    const descriptionList = $('.box ul.description').first();
    let category = '';

    descriptionList.find('li').each((index, element) => {
      const $li = $(element);
      const spanText = $li.find('span').first().text().trim();

      if (spanText === 'Categories:') {
        const categoryLink = $li.find('a').first();
        category = categoryLink.text().trim();
      }
    });

    if (!category) {
      category = descriptionList.find('li:nth-child(2) a').first().text().trim();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        category,
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
