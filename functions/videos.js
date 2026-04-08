const cheerio = require('cheerio');
const fetch = require('node-fetch');

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=3600',
  'Netlify-Vary': 'query',
};

exports.handler = async function (event, context) {
  let params = {};

  if (event.httpMethod === 'POST' && event.body) {
    try {
      params = JSON.parse(event.body);
    } catch (e) {
      // Ignore parse error
    }
  } else if (event.httpMethod === 'GET') {
    params = event.queryStringParameters || {};
  }

  // Permite recibir search y construir la URL o permite recibir directamente la url.
  const searchParam = params.search || params.q;
  let defaultUrl = '';

  if (params.url) {
    defaultUrl = params.url;
    // Si pasaron una categoria (en url) pero tb hay termino de busqueda, lo agregamos
    if (searchParam && !defaultUrl.includes('?')) {
      defaultUrl += `?q=${encodeURIComponent(searchParam)}`;
    } else if (searchParam && defaultUrl.includes('?')) {
      defaultUrl += `&q=${encodeURIComponent(searchParam)}`;
    }
  } else if (searchParam) {
    defaultUrl = `/search/?q=${encodeURIComponent(searchParam)}`;
  }

  const url = defaultUrl;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const omitPrivate = params.omitPrivate === true || params.omitPrivate === 'true';
  const minDuration = params.minDuration ? parseInt(params.minDuration, 10) : 0;
  const quick = params.quick !== false && params.quick !== 'false';

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Missing post data: "url"',
        success: false,
        videos: [],
      }),
    };
  }

  try {
    let fetchUrl;
    try {
      fetchUrl = new URL(url, 'https://thisvid.com');
      if (fetchUrl.hostname !== 'thisvid.com' && fetchUrl.hostname !== 'www.thisvid.com') {
        throw new Error('Invalid hostname');
      }
    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: 'Bad Request',
          message: 'Invalid URL parameter',
          success: false,
          videos: [],
        }),
      };
    }

    const response = await fetch(fetchUrl.href);

    if (response.status === 404) {
      return {
        statusCode: 400,
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

      // Check if HD
      const isHD = $('span', element).first().hasClass('hd');

      // Only filter by basic criteria (duration), tags will be filtered client-side
      if (time >= minDuration * 60) {
        if (quick) {
          let urlStr = $(element).attr('href') || '';
          urlStr = urlStr.replace('https://thisvid.com', '');
          videos.push({
            title,
            url: urlStr,
            isPrivate,
            isHD,
            duration,
            avatar,
            views: parseInt(views),
            date,
            relevance: 0, // Will be calculated client-side
            page,
          });
        } else {
          let urlStr = $(element).attr('href') || '';
          urlStr = urlStr.replace('https://thisvid.com', '');
          urls.push({
            title,
            url: urlStr,
            isPrivate,
            isHD,
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
            isHD: video.isHD,
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
      headers,
      body: JSON.stringify({
        success: true,
        videos: videos,
      }),
    };
  } catch (error) {
    console.log(error);
  }
}
