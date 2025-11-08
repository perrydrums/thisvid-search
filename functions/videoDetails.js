const cheerio = require('cheerio');
const fetch = require('node-fetch');

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=31536000, s-maxage=31536000', // Cache permanently (1 year)
  'Netlify-Vary': 'query',
};

exports.handler = async function (event, context) {
  const videoUrl = event.queryStringParameters.url;

  if (!videoUrl) {
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

    // Extract category from ul.description
    // Structure: first li = description, second li = category, third li = tags, fourth li = uploader
    const descriptionList = $('.box ul.description').first();
    let category = '';

    // Try to find by span text first
    descriptionList.find('li').each((index, element) => {
      const $li = $(element);
      const spanText = $li.find('span').first().text().trim();

      if (spanText === 'Categories:') {
        // Extract category
        const categoryLink = $li.find('a').first();
        category = categoryLink.text().trim();
      }
    });

    // Fallback: use nth-child selector if span-based extraction didn't work
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
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'Internal Server Error',
        message: error.message || 'An error occurred while fetching video details',
        success: false,
      }),
      headers,
    };
  }
};
