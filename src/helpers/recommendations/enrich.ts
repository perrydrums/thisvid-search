import type { VideoDetails } from '../types';
import { canonicalVideoUrl } from '../videoUrl';

import { mapPool, type RecommendationCandidate } from './sources';

export const DETAILS_CACHE_KEY = 'tvass-video-details';
export const DETAILS_CACHE_LIMIT = 400;
export const DETAILS_CONCURRENCY = 6;

type CacheEntry = {
  url: string;
  details: VideoDetails;
};

export type DetailsCache = {
  get: (url: string) => VideoDetails | null;
  set: (url: string, details: VideoDetails) => void;
  flush: () => void;
};

function readEntries(): CacheEntry[] {
  try {
    const raw = localStorage.getItem(DETAILS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is CacheEntry => {
      return !!entry && typeof entry === 'object' && typeof (entry as CacheEntry).url === 'string' && !!(entry as CacheEntry).details;
    });
  } catch {
    return [];
  }
}

/** Least-recently-used details cache. Flushed once per recommendation run. */
export function createDetailsCache(): DetailsCache {
  const entries = readEntries().slice(-DETAILS_CACHE_LIMIT);
  const byUrl = new Map(entries.map((entry) => [entry.url, entry.details]));
  const order = entries.map((entry) => entry.url);

  const touch = (url: string) => {
    const index = order.indexOf(url);
    if (index >= 0) order.splice(index, 1);
    order.push(url);
  };

  return {
    get(url: string) {
      const details = byUrl.get(url);
      if (!details) return null;
      touch(url);
      return details;
    },
    set(url: string, details: VideoDetails) {
      if (!byUrl.has(url)) {
        while (order.length >= DETAILS_CACHE_LIMIT) {
          const oldest = order.shift();
          if (oldest) byUrl.delete(oldest);
        }
      }
      byUrl.set(url, details);
      touch(url);
    },
    flush() {
      const payload = order
        .map((url) => {
          const details = byUrl.get(url);
          return details ? { url, details } : null;
        })
        .filter((entry): entry is CacheEntry => !!entry);
      const attempts = [payload, payload.slice(-200), payload.slice(-50)];
      for (const slice of attempts) {
        try {
          localStorage.setItem(DETAILS_CACHE_KEY, JSON.stringify(slice));
          return;
        } catch {
          /* quota */
        }
      }
    },
  };
}

export async function fetchVideoDetails(url: string): Promise<VideoDetails | null> {
  const absolute = canonicalVideoUrl(url);
  if (!absolute) return null;
  try {
    const response = await fetch(`/videoDetails?url=${encodeURIComponent(absolute)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as VideoDetails & { success?: boolean };
    if (!body || body.success === false) return null;
    return {
      category: body.category || body.categories?.[0] || '',
      categories: Array.isArray(body.categories) ? body.categories : [],
      tags: Array.isArray(body.tags) ? body.tags : [],
      uploader: {
        username: body.uploader?.username || '',
        uid: body.uploader?.uid || '',
      },
      rating: typeof body.rating === 'number' ? body.rating : null,
    };
  } catch (error) {
    console.error('videoDetails', error);
    return null;
  }
}

function applyDetails(candidate: RecommendationCandidate, details: VideoDetails): void {
  candidate.details = details;
  if (details.uploader?.uid) {
    candidate.knownUploader = details.uploader;
  }
  if (!candidate.knownCategory && details.categories[0]) {
    candidate.knownCategory = details.categories[0];
  }
  if (details.rating != null) {
    candidate.video = { ...candidate.video, rating: details.rating };
  }
}

/** Fills `candidate.details`. Cached URLs are not fetched again. */
export async function enrichCandidates(
  candidates: RecommendationCandidate[],
  cache: DetailsCache,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const pending = candidates.filter((candidate) => {
    const url = canonicalVideoUrl(candidate.video.url);
    const cached = url ? cache.get(url) : null;
    if (cached) {
      applyDetails(candidate, cached);
      return false;
    }
    return true;
  });

  const total = candidates.length;
  let done = total - pending.length;
  onProgress?.(done, total);

  await mapPool(pending, DETAILS_CONCURRENCY, async (candidate) => {
    const url = canonicalVideoUrl(candidate.video.url);
    const details = url ? await fetchVideoDetails(url) : null;
    if (details && url) {
      cache.set(url, details);
      applyDetails(candidate, details);
    }
    done += 1;
    onProgress?.(done, total);
  });
}
