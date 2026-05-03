const cheerio = require('cheerio');
const fetch = require('node-fetch');

/** Browser: avoid stale JSON in bfcache; Edge/Durable: cache by full query string. */
const successHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Netlify-CDN-Cache-Control': 'public, durable, max-age=3600, stale-while-revalidate=7200',
  'Netlify-Vary': 'query',
};

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
      omitPrivate: q.omitPrivate === 'true',
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
    omitPrivate: Boolean(raw.omitPrivate),
    minDuration: Number(raw.minDuration) || 0,
    quick: raw.quick !== false,
  };
}

exports.handler = async function (event, context) {
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

  const { url, page = 1, omitPrivate = false, minDuration = 0, quick = true } = input;

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

  try {
    const response = await fetch('https://thisvid.com' + url);

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
    $('.tumbpu').each((i, element) => {
      const isPrivate = $('span', element).first().hasClass('private');
      if (omitPrivate && isPrivate) {
        return;
      }

      const avatar = isPrivate
        ? // @ts-ignore
        $('span', element)
          .first()
          .attr('style')
          .match(/url\((.*?)\)/)[1]
          .replace('//', 'https://')
        : // @ts-ignore
        $('span .lazy-load', element).first().attr('data-original').replace('//', 'https://');

      const viewsHtml = $('.view', element).first().text();
      // @ts-ignore
      const views = viewsHtml.match(/\d+/)[0];
      const date = $('.date', element).first().text();

      const duration = $('span span.duration', element).text();
      const [minutes, seconds] = duration.split(':').map(Number);
      const time = minutes * 60 + seconds;

      const title = $(element).attr('title') || '';

      // Only filter by basic criteria (duration), tags will be filtered client-side
      if (time >= minDuration * 60) {
        if (quick) {
          videos.push({
            title,
            url: $(element).attr('href') || '',
            isPrivate,
            duration,
            avatar,
            views: parseInt(views),
            date,
            relevance: 0, // Will be calculated client-side
            page,
          });
        } else {
          urls.push({
            title,
            url: $(element).attr('href') || '',
            isPrivate,
            duration,
            avatar,
            views: parseInt(views),
            date,
            relevance: 0,
            page,
          });
        }
      }
    });

    if (!quick) {
      for (const video of urls) {
        try {
          const videoUrl = video.url;
          const response = await fetch(videoUrl);
          const body = await response.text();
          const $ = cheerio.load(body);

          // Just add the video, tags will be filtered client-side
          videos.push({
            relevance: video.relevance,
            title: video.title,
            url: video.url,
            isPrivate: video.isPrivate,
            duration: video.duration,
            avatar: video.avatar,
            views: video.views,
            date: video.date,
            page: video.page,
          });
        } catch (error) {
          console.log(error);
        }
      }
    }

    return {
      statusCode: 200,
      headers: successHeaders,
      body: JSON.stringify({
        success: true,
        videos: videos,
      }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      headers: errorHeaders,
      body: JSON.stringify({
        status: 'Error',
        message: error instanceof Error ? error.message : 'Unexpected error',
        success: false,
        videos: [],
      }),
    };
  }
};
