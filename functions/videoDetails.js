const cheerio = require('cheerio');
const fetch = require('node-fetch');

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=3600',
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

    // Extract thumbnail from .video-holder img
    const thumbnailElement = $('.video-holder img').first();
    let thumbnail = thumbnailElement.attr('src') || '';
    if (thumbnail && thumbnail.startsWith('//')) {
      thumbnail = 'https:' + thumbnail;
    }

    // Extract tags and category from ul.description
    // Structure: first li = description, second li = category, third li = tags, fourth li = uploader
    const descriptionList = $('.box ul.description').first();
    const tags = [];
    let category = '';

    // Try to find by span text first
    descriptionList.find('li').each((index, element) => {
      const $li = $(element);
      const spanText = $li.find('span').first().text().trim();

      if (spanText === 'Tags:') {
        // Extract all tag links
        $li.find('a').each((i, tagEl) => {
          const tagText = $(tagEl).text().trim();
          if (tagText) {
            tags.push(tagText);
          }
        });
      } else if (spanText === 'Categories:') {
        // Extract category
        const categoryLink = $li.find('a').first();
        category = categoryLink.text().trim();
      }
    });

    // Fallback: use nth-child selectors if span-based extraction didn't work
    if (tags.length === 0) {
      descriptionList
        .find('li:nth-child(3) a')
        .each((i, tagEl) => {
          const tagText = $(tagEl).text().trim();
          if (tagText) {
            tags.push(tagText);
          }
        });
    }

    if (!category) {
      category = descriptionList.find('li:nth-child(2) a').first().text().trim();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        tags,
        category,
        thumbnail,
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
