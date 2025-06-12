const cheerio = require('cheerio');
const fetch = require('node-fetch');

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=3600',
  'Netlify-Vary': 'query',
};

exports.handler = async function (event, context) {
  const {
    url,
    page = 1,
    omitPrivate = false,
    minDuration = 0,
    quick = true,
  } = JSON.parse(event.body);

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
    const response = await fetch('https://thisvid.com' + url);

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
