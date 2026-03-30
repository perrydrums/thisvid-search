import { Video, VideoResponse } from './types';

type GetVideosOptions = {
  url: string;
  page: number;
  omitPrivate?: boolean;
  minDuration?: number;
  quick?: boolean;
};

type FilterVideosOptions = {
  videos: Video[];
  includeTags?: string[];
  /** Per-tag multiplier for include-tag relevance (e.g. favourite frequency). Keys match `includeTags` names; default weight is 1 when omitted. */
  includeTagWeights?: Record<string, number>;
  excludeTags?: string[];
  termsOperator?: 'AND' | 'OR';
  boosterTags?: string[];
  diminishingTags?: string[];
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

export const filterVideos = ({
  videos,
  includeTags = [],
  includeTagWeights,
  excludeTags = [],
  termsOperator = 'OR',
  boosterTags = [],
  diminishingTags = [],
}: FilterVideosOptions): Array<Video> => {
  const tagWeightLookup = new Map<string, number>();
  if (includeTagWeights) {
    for (const [name, w] of Object.entries(includeTagWeights)) {
      tagWeightLookup.set(name.toLowerCase(), w);
    }
  }
  const weightForIncludeTag = (tag: string): number => {
    if (!includeTagWeights) return 1;
    return tagWeightLookup.get(tag.toLowerCase()) ?? 1;
  };

  return videos
    .filter(video => {
      const title = video.title.toLowerCase();

      // Skip if video title contains any of the exclude tags
      if (excludeTags.some(tag => title.includes(tag.toLowerCase()))) {
        return false;
      }

      // Check if video matches include tags criteria
      if (includeTags.length > 0) {
        const hasAllTags = termsOperator === 'AND'
          ? includeTags.every(tag => title.includes(tag.toLowerCase()))
          : includeTags.some(tag => title.includes(tag.toLowerCase()));

        if (!hasAllTags) {
          return false;
        }
      }

      return true;
    })
    .map(video => {
      // Calculate relevance score (each include-tag match weighted by optional favourite frequency)
      const tagsRelevance = includeTags.reduce((score, tag) => {
        const regex = new RegExp(tag, 'gi');
        const matches = (video.title.match(regex) || []).length;
        return score + matches * weightForIncludeTag(tag);
      }, 0);

      const boosterRelevance = boosterTags.reduce((score, tag) => {
        const regex = new RegExp(tag, 'gi');
        return score + ((video.title.match(regex) || []).length > 0 ? 2 : 0);
      }, 0);

      const diminishingRelevance = diminishingTags.reduce((score, tag) => {
        const regex = new RegExp(tag, 'gi');
        return score - ((video.title.match(regex) || []).length > 0 ? 2 : 0);
      }, 0);

      const relevance = tagsRelevance + boosterRelevance + diminishingRelevance;

      return {
        ...video,
        relevance,
      };
    });
};

export const sortVideos = (videos: Array<Video> = [], sortMode: string): Array<Video> => {
  const sortedVideos = videos;
  switch (sortMode) {
    default:
    case 'newest':
      sortedVideos.sort(
        (a, b) =>
          parseRelativeTime(b.date).getTime() - parseRelativeTime(a.date).getTime() ||
          b.views - a.views,
      );
      break;
    case 'oldest':
      sortedVideos.sort(
        (a, b) =>
          parseRelativeTime(a.date).getTime() - parseRelativeTime(b.date).getTime() ||
          b.views - a.views,
      );
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

/** Maps listing date text (e.g. from ThisVid `.date`) to an approximate absolute time for sorting. */
export const parseRelativeTime = (relativeTime: string): Date => {
  const raw = relativeTime.trim();
  if (!raw) return new Date();

  const s = raw.toLowerCase();
  const anchor = new Date();

  if (s === 'today' || s === 'just now' || s === 'now') {
    return anchor;
  }
  if (s === 'yesterday') {
    const d = new Date(anchor);
    d.setDate(d.getDate() - 1);
    return d;
  }

  // "23 hours ago", "10 minutes ago", "5 days", "1 week ago", etc.
  const match = s.match(/(\d+)\s*([a-z]+)/);
  if (!match) return anchor;

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const d = new Date(anchor);

  if (unit.startsWith('year')) {
    d.setFullYear(d.getFullYear() - value);
  } else if (unit.startsWith('month')) {
    d.setMonth(d.getMonth() - value);
  } else if (unit.startsWith('week')) {
    d.setDate(d.getDate() - value * 7);
  } else if (unit.startsWith('day')) {
    d.setDate(d.getDate() - value);
  } else if (unit.startsWith('hour') || unit === 'hr' || unit === 'hrs' || unit === 'h') {
    d.setHours(d.getHours() - value);
  } else if (unit.startsWith('minute') || unit === 'min' || unit === 'mins' || unit === 'm') {
    d.setMinutes(d.getMinutes() - value);
  } else if (unit.startsWith('second') || unit === 'sec' || unit === 'secs' || unit === 's') {
    d.setSeconds(d.getSeconds() - value);
  } else {
    return anchor;
  }

  return d;
};
