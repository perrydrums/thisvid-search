import { Video, VideoResponse } from './types';

type GetVideosOptions = {
  url: string;
  page: number;
  includeTags?: string[];
  excludeTags?: string[];
  termsOperator?: 'AND' | 'OR';
  boosterTags?: string[];
  diminishingTags?: string[];
  omitPrivate?: boolean;
  minDuration?: number;
  quick?: boolean;
};

// type VideoUrl = {
//   title: string;
//   url: string;
//   isPrivate: boolean;
//   duration: string;
//   avatar: string;
//   views: number;
//   date: string;
//   relevance: number;
// };

export const getVideos = async ({
  url,
  page,
  includeTags = [],
  excludeTags = [],
  termsOperator = 'AND',
  boosterTags = [],
  diminishingTags = [],
  omitPrivate = false,
  minDuration = 0,
  quick = true,
}: GetVideosOptions): Promise<Array<Video>> => {
  try {
    const response = await fetch(`/getVideos/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        page,
        includeTags,
        excludeTags,
        termsOperator,
        boosterTags,
        diminishingTags,
        omitPrivate,
        minDuration,
        quick,
      }),
    });

    const body: VideoResponse = await response.json();

    if (!body.success) {
      return [];
    }

    return body.videos;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const sortVideos = (videos: Array<Video> = [], sortMode: string): Array<Video> => {
  const sortedVideos = videos;
  switch (sortMode) {
    default:
    case 'newest':
      sortedVideos.sort((a, b) => parseRelativeTime(b.date).getTime() - parseRelativeTime(a.date).getTime());
      break;
    case 'oldest':
      sortedVideos.sort((a, b) => parseRelativeTime(a.date).getTime() - parseRelativeTime(b.date).getTime());
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
    case 'viewsAsc':
      sortedVideos.sort((a, b) => a.views - b.views);
      break;
    case 'relevance':
      sortedVideos.sort((a, b) => b.relevance - a.relevance || b.views - a.views);
      break;
  }
  return sortedVideos;
};

const parseRelativeTime = (relativeTime: string): Date => {
  const now = new Date();
  const match = relativeTime.match(/(\d+)\s(\w+)/);

  if (!match) return now; // If format is unexpected, return current date

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);

  switch (unit) {
    case "day":
    case "days":
      now.setDate(now.getDate() - value);
      break;
    case "week":
    case "weeks":
      now.setDate(now.getDate() - value * 7);
      break;
    case "month":
    case "months":
      now.setMonth(now.getMonth() - value);
      break;
    case "year":
    case "years":
      now.setFullYear(now.getFullYear() - value);
      break;
  }

  return now;
};
