const cheerio = require('cheerio');
const fetch = require('node-fetch');

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=31536000, s-maxage=31536000', // Cache permanently (1 year)
  'Netlify-Vary': 'query',
};

exports.handler = async function (event, context) {
  const rawVideoUrl = event.queryStringParameters.url;

  if (!rawVideoUrl) {
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

  // Ensure absolute URL
  const videoUrl = rawVideoUrl.startsWith('http')
    ? rawVideoUrl
    : 'https://thisvid.com' + (rawVideoUrl.startsWith('/') ? rawVideoUrl : '/' + rawVideoUrl);

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

    let tags = [];

    // Try to find by span text first
    descriptionList.find('li').each((index, element) => {
      const $li = $(element);
      const spanText = $li.find('span').first().text().trim();

      if (spanText === 'Categories:') {
        // Extract category
        const categoryLink = $li.find('a').first();
        category = categoryLink.text().trim();
      } else if (spanText === 'Tags:') {
        $li.find('a').each((i, el) => {
          tags.push($(el).text().trim());
        });
      }
    });

    // Fallback: use nth-child selector if span-based extraction didn't work
    if (!category) {
      category = descriptionList.find('li:nth-child(2) a').first().text().trim();
    }

    const recommendedVideos = [];
    $('.tumbpu').each((i, element) => {
      const $el = $(element);
      const isPrivate = $el.find('span').first().hasClass('private');
      const isHD = $el.find('span').first().hasClass('hd');

      let avatar = '';
      if (isPrivate) {
        const style = $el.find('span').first().attr('style') || '';
        const match = style.match(/url\(['"]?(.*?)['"]?\)/);
        if (match) avatar = match[1].replace('//', 'https://');
      } else {
        avatar = $el.find('span .lazy-load').first().attr('data-original') || '';
        avatar = avatar.replace('//', 'https://');
      }

      const viewsHtml = $el.find('.view').first().text();
      const viewMatch = viewsHtml.match(/\d+/);
      const views = viewMatch ? parseInt(viewMatch[0], 10) : 0;
      const date = $el.find('.date').first().text().trim();
      const duration = $el.find('span span.duration').first().text().trim();
      const title = $el.attr('title') || '';
      let url = $el.attr('href') || '';
      url = url.replace('https://thisvid.com', '');

      if (url && title) {
        recommendedVideos.push({
          title,
          url,
          isPrivate,
          isHD,
          duration,
          avatar,
          views,
          date,
          relevance: 0
        });
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        category,
        tags,
        recommendedVideos
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
