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
    includeTags = [],
    excludeTags = [],
    termsOperator = 'AND',
    boosterTags = [],
    diminishingTags = [],
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
      if (quick) {
        // Skip if video title contains any of the exclude tags.
        if (excludeTags.some((tag) => title.toLowerCase().includes(tag.toLowerCase()))) {
          return;
        }

        const hasAllTags =
          termsOperator === 'AND'
            ? includeTags.every((tag) => title.toLowerCase().includes(tag.toLowerCase()))
            : includeTags.some((tag) => title.toLowerCase().includes(tag.toLowerCase()));

        const tagsRelevance = includeTags.reduce((score, tag) => {
          const regex = new RegExp(tag, 'gi');
          // For each tag present in title, add 1 to the relevance score.
          return score + (title.match(regex) || []).length;
        }, 0);

        const boosterRelevance = boosterTags.reduce((score, tag) => {
          const regex = new RegExp(tag, 'gi');
          // For each unique booster tag present in title, add 2 to the relevance score.
          return score + ((title.match(regex) || []).length > 0 ? 2 : 0);
        }, 0);

        const diminishingRelevance = diminishingTags.reduce((score, tag) => {
          const regex = new RegExp(tag, 'gi');
          // For each unique diminishing tag present in title, subtract 2 from the relevance score.
          return score - ((title.match(regex) || []).length > 0 ? 2 : 0);
        }, 0);

        const relevance = tagsRelevance + boosterRelevance + diminishingRelevance;

        if (hasAllTags || includeTags.length === 0) {
          if (time >= minDuration * 60) {
            videos.push({
              title,
              url: $(element).attr('href') || '',
              isPrivate,
              duration,
              avatar,
              views: parseInt(views),
              date,
              relevance,
              page,
            });
          }
        }
      } else {
        if (time >= minDuration * 60) {
          urls.push({
            title,
            url: $(element).attr('href') || '',
            isPrivate,
            duration,
            avatar,
            views: parseInt(views),
            date,
            relevance: 0,
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

          const hasAllTags =
            termsOperator === 'AND'
              ? includeTags.every((tag) => $(`.description a[title*="${tag}"]`).length > 0)
              : includeTags.some((tag) => $(`.description a[title*="${tag}"]`).length > 0);

          if (hasAllTags) {
            videos.push({
              relevance: video.relevance,
              title: video.title,
              url: video.url,
              isPrivate: video.isPrivate,
              duration: video.duration,
              avatar: video.avatar,
              views: video.views,
              date: video.date,
              page,
            });
          }
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
        videos: videos.sort((a, b) => b.relevance - a.relevance),
      }),
    };
  } catch (error) {
    console.log(error);
  }
}
