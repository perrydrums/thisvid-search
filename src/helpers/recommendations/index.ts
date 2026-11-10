import type { HarvestedRelatedVideo } from '../analyseFavourites';
import type { RecommendedVideo, TasteProfile } from '../types';
import { canonicalVideoUrl } from '../videoUrl';

import { createDetailsCache, enrichCandidates } from './enrich';
import {
  ENRICH_MIN_PER_SOURCE,
  ENRICH_PER_RAIL,
  FORYOU_PER_UPLOADER,
  FRIENDS_PER_UPLOADER,
  RAIL_LIMIT,
  buildIdf,
  buildProfileIndexes,
  compareByScoreThenNewest,
  finalizeCandidate,
  maxLogViews,
  passesHardFilters,
  preScoreCandidate,
  selectForEnrichment,
  takeDiverse,
  type RecommendationRail,
} from './scoring';
import {
  collectRecommendationCandidates,
  type CollectProgress,
  type RecommendationCandidate,
} from './sources';

export { extractTasteProfile, isAnalyseStale } from './profile';
export { RAIL_LIMIT } from './scoring';

const CACHE_KEY = 'tvass-recommendations-v2';
export const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

export type RecommendationsBundle = {
  fromFriends: RecommendedVideo[];
  forYou: RecommendedVideo[];
};

export type RecommendationProgress = {
  label: string;
  /** 0–1 across the whole refresh. */
  fraction: number;
};

type CachedRecommendations = RecommendationsBundle & {
  timestamp: number;
  cacheKey: string;
};

const hashString = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return `${hash >>> 0}`;
};

export function recommendationCacheKey(input: {
  profile: TasteProfile;
  friendIds: string[];
  favouriteUrls: string[];
  selfUserId: string;
  analyseDate: string;
  related: HarvestedRelatedVideo[];
}): string {
  const fingerprint = [
    input.profile.totalVideos,
    input.profile.orientation,
    input.selfUserId.trim(),
    input.profile.tags
      .slice(0, 30)
      .map((tag) => `${tag.name}:${tag.count}`)
      .join(','),
    input.profile.categories
      .slice(0, 15)
      .map((category) => `${category.slug}:${category.count}`)
      .join(','),
    input.profile.uploaders
      .slice(0, 15)
      .map((uploader) => `${uploader.uid}:${uploader.count}`)
      .join(','),
    input.friendIds.length,
    hashString([...input.friendIds].sort().join(',')),
    input.favouriteUrls.length,
    hashString([...input.favouriteUrls].sort().join(',')),
    input.analyseDate,
    input.related
      .slice(0, 20)
      .map((video) => `${video.url}:${video.hits}`)
      .join(','),
  ].join('|');
  return hashString(fingerprint);
}

export function getCachedRecommendations(cacheKey: string): (RecommendationsBundle & { timestamp: number }) | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedRecommendations;
    if (!data || data.cacheKey !== cacheKey) return null;
    if (Date.now() - data.timestamp > CACHE_TTL_MS) return null;
    if (!Array.isArray(data.fromFriends) || !Array.isArray(data.forYou)) return null;
    return {
      fromFriends: data.fromFriends,
      forYou: data.forYou,
      timestamp: data.timestamp,
    };
  } catch {
    return null;
  }
}

export function cacheRecommendations(cacheKey: string, bundle: RecommendationsBundle): void {
  const data: CachedRecommendations = {
    fromFriends: bundle.fromFriends,
    forYou: bundle.forYou,
    timestamp: Date.now(),
    cacheKey,
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to cache recommendations', error);
  }
}

function exclusionSet(urls: string[]): Set<string> {
  const set = new Set<string>();
  urls.forEach((url) => {
    const canonical = canonicalVideoUrl(url);
    if (canonical) set.add(canonical);
  });
  return set;
}

function rankRail(
  candidates: RecommendationCandidate[],
  profile: TasteProfile,
  rail: RecommendationRail,
  friendIds: Set<string>,
  selfUserId: string,
  blockedUrls: Set<string>,
): RecommendedVideo[] {
  const surviving = candidates.filter((candidate) => {
    if (blockedUrls.has(candidate.video.url)) return false;
    return passesHardFilters(candidate, friendIds, selfUserId);
  });
  if (surviving.length === 0) return [];

  const indexes = buildProfileIndexes(profile);
  const idf = buildIdf(surviving);
  const maxLog = maxLogViews(surviving.map((candidate) => candidate.video));
  const ranked = surviving
    .map((candidate) => finalizeCandidate(candidate, profile, indexes, idf, maxLog, rail))
    .sort(compareByScoreThenNewest);

  const perUploader = rail === 'friends' ? FRIENDS_PER_UPLOADER : FORYOU_PER_UPLOADER;
  return takeDiverse(ranked, perUploader, RAIL_LIMIT);
}

function topForEnrichment(
  candidates: RecommendationCandidate[],
  profile: TasteProfile,
  rail: RecommendationRail,
): RecommendationCandidate[] {
  if (candidates.length <= ENRICH_PER_RAIL && rail === 'friends') return candidates;
  const indexes = buildProfileIndexes(profile);
  const maxLog = maxLogViews(candidates.map((candidate) => candidate.video));
  const scoreOf = (candidate: RecommendationCandidate) =>
    preScoreCandidate(candidate, profile, indexes, maxLog, rail);

  if (rail === 'friends') {
    return [...candidates].sort((a, b) => scoreOf(b) - scoreOf(a)).slice(0, ENRICH_PER_RAIL);
  }
  return selectForEnrichment(candidates, scoreOf, ENRICH_MIN_PER_SOURCE, ENRICH_PER_RAIL);
}

export async function generateRecommendations(options: {
  profile: TasteProfile;
  friendIds: string[];
  selfUserId: string;
  favouriteUrls: string[];
  analysedUrls: string[];
  related: HarvestedRelatedVideo[];
  onProgress?: (progress: RecommendationProgress) => void;
  onFriendsReady?: (videos: RecommendedVideo[]) => void;
}): Promise<RecommendationsBundle> {
  const friendFraction = { current: options.friendIds.length > 0 ? 0 : 1 };
  const listingFraction = { current: 0 };
  const reportCollect = (progress: CollectProgress) => {
    const fraction = progress.total > 0 ? progress.done / progress.total : 1;
    if (progress.track === 'friends') friendFraction.current = fraction;
    else listingFraction.current = fraction;
    options.onProgress?.({
      label: progress.label,
      fraction: Math.min(0.55, 0.55 * ((friendFraction.current + listingFraction.current) / 2)),
    });
  };

  const collected = await collectRecommendationCandidates({
    profile: options.profile,
    friendIds: options.friendIds,
    selfUserId: options.selfUserId.trim(),
    exclusion: exclusionSet([...options.favouriteUrls, ...options.analysedUrls]),
    related: options.related,
    onProgress: reportCollect,
  });

  const friendIds = new Set(options.friendIds.map((id) => id.trim()).filter(Boolean));
  const selfUserId = options.selfUserId.trim();
  const cache = createDetailsCache();

  try {
    const friendsToEnrich = topForEnrichment(collected.fromFriends, options.profile, 'friends');
    await enrichCandidates(friendsToEnrich, cache, (done, total) => {
      const fraction = total > 0 ? done / total : 1;
      options.onProgress?.({
        label: `Reading friend uploads ${done}/${total}`,
        fraction: 0.55 + 0.2 * fraction,
      });
    });
    const fromFriends = rankRail(
      friendsToEnrich,
      options.profile,
      'friends',
      friendIds,
      selfUserId,
      new Set(),
    );
    options.onFriendsReady?.(fromFriends);

    const shown = new Set(fromFriends.map((video) => video.url));
    const forYouPool = collected.forYou.filter((candidate) => !shown.has(candidate.video.url));
    const forYouToEnrich = topForEnrichment(forYouPool, options.profile, 'forYou');
    await enrichCandidates(forYouToEnrich, cache, (done, total) => {
      const fraction = total > 0 ? done / total : 1;
      options.onProgress?.({
        label: `Reading recommendations ${done}/${total}`,
        fraction: 0.75 + 0.2 * fraction,
      });
    });
    options.onProgress?.({ label: 'Scoring', fraction: 0.97 });
    const forYou = rankRail(forYouToEnrich, options.profile, 'forYou', friendIds, selfUserId, shown);

    return { fromFriends, forYou };
  } finally {
    cache.flush();
  }
}
