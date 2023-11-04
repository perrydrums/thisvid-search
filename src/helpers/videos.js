import cheerio from 'cheerio';

export const getVideos = async ({
  url,
  page,
  tags = [],
  termsOperator = 'AND',
  omitPrivate = false,
  minDuration = 0,
  quick = true,
}) => {
  const videos = [];

  try {
    const response = await fetch(url);

    if (response.status === 404) {
      return { error: 404 };
    }

    const body = await response.text();
    const $ = cheerio.load(body);

    const urls = [];
    $('.tumbpu').each((i, element) => {
      const isPrivate = $('span', element).first().hasClass('private');
      if (omitPrivate && isPrivate) {
        return;
      }

      const avatar = isPrivate
        ? $('span', element)
            .first()
            .attr('style')
            .match(/url\((.*?)\)/)[1]
            .replace('//', 'https://')
        : $('span .lazy-load', element).first().attr('data-original').replace('//', 'https://');

      const viewsHtml = $('.view', element).first().text();
      const views = viewsHtml.match(/\d+/)[0];
      const date = $('.date', element).first().text();

      const duration = $('span span.duration', element).text();
      const [minutes, seconds] = duration.split(':').map(Number);
      const time = minutes * 60 + seconds;

      const title = $(element).attr('title');
      if (quick) {
        const hasAllTags =
          termsOperator === 'AND'
            ? tags.every((tag) => title.toLowerCase().includes(tag.toLowerCase()))
            : tags.some((tag) => title.toLowerCase().includes(tag.toLowerCase()));

        const relevance = tags.reduce((score, tag) => {
          const regex = new RegExp(tag, 'gi');
          return score + (title.match(regex) || []).length;
        }, 0);

        if (hasAllTags || tags.length === 0) {
          if (time >= minDuration * 60) {
            videos.push({
              title,
              url: $(element).attr('href'),
              isPrivate,
              duration,
              avatar,
              views,
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
            url: $(element).attr('href'),
            isPrivate,
            duration,
            avatar,
            views,
            date,
          });
        }
      }
    });

    if (!quick) {
      for (const video of urls) {
        try {
          const videoUrl = video.url.split('/').slice(3).join('/');
          const response = await fetch(videoUrl);
          const body = await response.text();
          const $ = cheerio.load(body);

          const hasAllTags =
            termsOperator === 'AND'
              ? tags.every((tag) => $(`.description a[title*="${tag}"]`).length > 0)
              : tags.some((tag) => $(`.description a[title*="${tag}"]`).length > 0);

          if (hasAllTags) {
            videos.push({
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
  } catch (error) {
    console.log(error);
  }

  return videos;
};

export const sortVideos = (videos = [], sortMode) => {
  const sortedVideos = videos;
  switch (sortMode) {
    default:
    case 'newest':
      sortedVideos.sort((a, b) => a.page - b.page);
      break;
    case 'oldest':
      sortedVideos.sort((a, b) => b.page - a.page);
      break;
    case 'longest':
      sortedVideos.sort((a, b) => {
        const [aMinutes, aSeconds] = a.duration.split(':').map(Number);
        const [bMinutes, bSeconds] = b.duration.split(':').map(Number);
        return bMinutes * 60 + bSeconds - (aMinutes * 60 + aSeconds);
      });
      break;
    case 'shortest':
      sortedVideos.sort((a, b) => {
        const [aMinutes, aSeconds] = a.duration.split(':').map(Number);
        const [bMinutes, bSeconds] = b.duration.split(':').map(Number);
        return aMinutes * 60 + aSeconds - (bMinutes * 60 + bSeconds);
      });
      break;
    case 'views':
      sortedVideos.sort((a, b) => b.views - a.views);
      break;
    case 'relevance':
      sortedVideos.sort((a, b) => b.relevance - a.relevance);
      break;
  }
  return sortedVideos;
};