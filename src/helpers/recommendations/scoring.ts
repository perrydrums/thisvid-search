import type { TasteCategory, TasteProfile, TasteTag, TasteUploader, Video } from '../types';
import { parseRelativeTime } from '../videos';

import type { RecommendationCandidate, RecommendationSource } from './sources';

export const TITLE_TAG_CONFIDENCE = 0.6;
export const ENRICH_PER_RAIL = 60;
export const ENRICH_MIN_PER_SOURCE = 8;
export const RAIL_LIMIT = 1000;
/** How many videos the friends rail shows. */
export const FRIENDS_RAIL_LIMIT = 40;
export const FRIENDS_PER_UPLOADER = 20;
export const FORYOU_PER_UPLOADER = 3;

export const FOR_YOU_SOURCE_QUOTA: RecommendationSource[] = [
  'related',
  'friendFavourite',
  'uploader',
  'tag',
  'category',
];

export const SCORE_WEIGHTS = {
  forYou: { tag: 40, cat: 15, up: 10, ev: 25, q: 10 },
  friends: { tag: 40, cat: 15, up: 25, ev: 10, q: 10 },
} as const;

export type RecommendationRail = keyof typeof SCORE_WEIGHTS;

export type ProfileIndexes = {
  tags: Map<string, TasteTag>;
  categories: Map<string, TasteCategory>;
  uploaders: Map<string, TasteUploader>;
};

const normalizeName = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

export function buildProfileIndexes(profile: TasteProfile): ProfileIndexes {
  return {
    tags: new Map(profile.tags.map((tag) => [normalizeName(tag.name), tag])),
    categories: new Map(profile.categories.map((category) => [normalizeName(category.name), category])),
    uploaders: new Map(profile.uploaders.map((uploader) => [uploader.uid, uploader])),
  };
}

type ScoreParts = {
  tag: number;
  cat: number;
  up: number;
  ev: number;
  q: number;
};

function weighted(rail: RecommendationRail, parts: ScoreParts): number {
  const weights = SCORE_WEIGHTS[rail];
  return (
    weights.tag * parts.tag +
    weights.cat * parts.cat +
    weights.up * parts.up +
    weights.ev * parts.ev +
    weights.q * parts.q
  );
}

export function titleTagMatches(title: string, tags: TasteTag[]): TasteTag[] {
  const haystack = title.toLowerCase();
  return tags.filter((tag) => {
    const name = tag.name.trim().toLowerCase();
    return name.length >= 3 && haystack.includes(name);
  });
}

/** Title matches are discounted: the tile has no real tags yet. Result is 0–1. */
export function titleTagSimilarity(title: string, tags: TasteTag[]): number {
  const matched = titleTagMatches(title, tags);
  if (matched.length === 0) return 0;
  const sum = matched.reduce((total, tag) => total + tag.weight, 0) * TITLE_TAG_CONFIDENCE;
  const best = [...tags]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, matched.length)
    .reduce((total, tag) => total + tag.weight, 0);
  if (best <= 0) return 0;
  return Math.min(1, sum / best);
}

/** `ln((1+P)/(1+p_t)) + 1` over the enriched pool, so tags every candidate shares stop dominating. */
export function buildIdf(candidates: RecommendationCandidate[]): (tag: string) => number {
  const poolSize = Math.max(1, candidates.length);
  const counts = new Map<string, number>();
  candidates.forEach((candidate) => {
    const seen = new Set<string>();
    (candidate.details?.tags || []).forEach((tag) => {
      const key = normalizeName(tag);
      if (!key || seen.has(key)) return;
      seen.add(key);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });

  return (tag: string) => {
    const present = counts.get(normalizeName(tag)) || 0;
    return Math.log((1 + poolSize) / (1 + present)) + 1;
  };
}

export function tagSimilarity(
  videoTags: string[],
  indexes: ProfileIndexes,
  idf: (tag: string) => number,
): { score: number; matched: string[] } {
  if (videoTags.length === 0) return { score: 0, matched: [] };

  const matched: { name: string; value: number }[] = [];
  let sum = 0;
  videoTags.forEach((tag) => {
    const row = indexes.tags.get(normalizeName(tag));
    if (!row) return;
    const value = row.weight * idf(tag);
    sum += value;
    matched.push({ name: row.name, value });
  });

  const best = Array.from(indexes.tags.values())
    .map((tag) => tag.weight * idf(tag.name))
    .sort((a, b) => b - a)
    .slice(0, videoTags.length)
    .reduce((total, value) => total + value, 0);

  return {
    score: best > 0 ? Math.min(1, sum / best) : 0,
    matched: matched.sort((a, b) => b.value - a.value).map((item) => item.name),
  };
}

export function categoryAffinity(names: string[], indexes: ProfileIndexes): number {
  let best = 0;
  names.forEach((name) => {
    const row = indexes.categories.get(normalizeName(name));
    if (row && row.affinity > best) best = row.affinity;
  });
  return best;
}

export function uploaderAffinity(uid: string | undefined, indexes: ProfileIndexes): number {
  if (!uid) return 0;
  return indexes.uploaders.get(uid)?.affinity ?? 0;
}

/** `1 - exp(-E/2)`. On the friends rail, E is only "other friends favourited this". */
export function evidenceScore(
  evidence: RecommendationCandidate['evidence'],
  rail: RecommendationRail,
): number {
  const exposure =
    rail === 'friends'
      ? evidence.friendFavHits
      : evidence.relatedHits + evidence.friendFavHits + 0.5 * evidence.listingHits;
  if (exposure <= 0) return 0;
  return 1 - Math.exp(-exposure / 2);
}

export function maxLogViews(videos: Pick<Video, 'views'>[]): number {
  return videos.reduce((max, video) => Math.max(max, Math.log1p(video.views || 0)), 0);
}

/** `0.7 * rating% + 0.3 * log-views share`. Missing rating counts as 0. */
export function qualityScore(video: Pick<Video, 'views' | 'rating'>, maxLog: number): number {
  const rating = video.rating == null ? 0 : Math.max(0, Math.min(100, video.rating)) / 100;
  const share = maxLog > 0 ? Math.min(1, Math.log1p(video.views || 0) / maxLog) : 0;
  return 0.7 * rating + 0.3 * share;
}

export function preScoreCandidate(
  candidate: RecommendationCandidate,
  profile: TasteProfile,
  indexes: ProfileIndexes,
  maxLog: number,
  rail: RecommendationRail,
): number {
  const tag = titleTagSimilarity(candidate.video.title, profile.distinctiveTags);
  const cat = candidate.knownCategory ? categoryAffinity([candidate.knownCategory], indexes) : 0;
  const up = uploaderAffinity(candidate.knownUploader?.uid, indexes);
  const ev = evidenceScore(candidate.evidence, rail);
  const q = qualityScore(candidate.video, maxLog);
  return weighted(rail, { tag, cat, up, ev, q });
}

export function buildReasons(
  candidate: RecommendationCandidate,
  indexes: ProfileIndexes,
  matchedTags: string[],
  categoryNames: string[],
): string[] {
  const reasons: string[] = [];
  const { relatedHits, friendFavHits } = candidate.evidence;

  if (relatedHits > 0) {
    reasons.push(`Related to ${relatedHits} favourite${relatedHits === 1 ? '' : 's'}`);
  }
  if (friendFavHits > 0) {
    reasons.push(`Favourited by ${friendFavHits} friend${friendFavHits === 1 ? '' : 's'}`);
  }

  const uploader = candidate.details?.uploader?.uid
    ? candidate.details.uploader
    : candidate.knownUploader;
  const taste = uploader?.uid ? indexes.uploaders.get(uploader.uid) : undefined;
  if (taste && taste.count > 0) {
    const name = uploader?.username || taste.username;
    reasons.push(`You favourited ${taste.count} of ${name}'s videos`);
  }

  if (matchedTags.length > 0) {
    reasons.push(`Tags: ${matchedTags.slice(0, 3).join(', ')}`);
  }

  const category = categoryNames
    .map((name) => indexes.categories.get(normalizeName(name)))
    .find((row) => row && row.affinity > 0);
  if (category) reasons.push(`Category: ${category.name}`);

  if (reasons.length === 0 && uploader?.username && candidate.sources.includes('friendUpload')) {
    reasons.push(`New from ${uploader.username}`);
  }

  return reasons;
}

function scoreParts(
  candidate: RecommendationCandidate,
  profile: TasteProfile,
  indexes: ProfileIndexes,
  idf: (tag: string) => number,
  maxLog: number,
  rail: RecommendationRail,
): { parts: ScoreParts; matched: string[]; categories: string[] } {
  const detailTags = candidate.details?.tags || [];
  const categories =
    candidate.details?.categories && candidate.details.categories.length > 0
      ? candidate.details.categories
      : candidate.knownCategory
        ? [candidate.knownCategory]
        : [];

  let tag = 0;
  let matched: string[] = [];
  if (detailTags.length > 0) {
    const similarity = tagSimilarity(detailTags, indexes, idf);
    tag = similarity.score;
    matched = similarity.matched;
  } else {
    const titleMatches = titleTagMatches(candidate.video.title, profile.distinctiveTags);
    tag = titleTagSimilarity(candidate.video.title, profile.distinctiveTags);
    matched = titleMatches.map((item) => item.name);
  }

  return {
    parts: {
      tag,
      cat: categoryAffinity(categories, indexes),
      up: uploaderAffinity(
        candidate.details?.uploader?.uid || candidate.knownUploader?.uid,
        indexes,
      ),
      ev: evidenceScore(candidate.evidence, rail),
      q: qualityScore(candidate.video, maxLog),
    },
    matched,
    categories,
  };
}

export function finalizeCandidate(
  candidate: RecommendationCandidate,
  profile: TasteProfile,
  indexes: ProfileIndexes,
  idf: (tag: string) => number,
  maxLog: number,
  rail: RecommendationRail,
) {
  const { parts, matched, categories } = scoreParts(candidate, profile, indexes, idf, maxLog, rail);
  const score = Math.round(weighted(rail, parts) * 10) / 10;
  const uploader = candidate.details?.uploader?.uid
    ? candidate.details.uploader
    : candidate.knownUploader;
  return {
    ...candidate.video,
    rating: candidate.video.rating ?? null,
    relevance: Math.round(score),
    score,
    reasons: buildReasons(candidate, indexes, matched, categories),
    tags: candidate.details?.tags || [],
    categories,
    uploader,
  };
}

export function compareByScoreThenNewest(a: { score: number; date: string; views: number }, b: { score: number; date: string; views: number }): number {
  if (b.score !== a.score) return b.score - a.score;
  const newer = parseRelativeTime(b.date).getTime() - parseRelativeTime(a.date).getTime();
  if (newer !== 0) return newer;
  return (b.views || 0) - (a.views || 0);
}

export function takeDiverse<T extends { uploader?: { uid?: string; username?: string } }>(
  videos: T[],
  perUploader: number,
  limit: number,
): T[] {
  const counts = new Map<string, number>();
  const picked: T[] = [];
  videos.forEach((video) => {
    if (picked.length >= limit) return;
    const key = video.uploader?.uid || video.uploader?.username || '';
    const used = key ? counts.get(key) || 0 : 0;
    if (key && used >= perUploader) return;
    if (key) counts.set(key, used + 1);
    picked.push(video);
  });
  return picked;
}

export function selectForEnrichment(
  candidates: RecommendationCandidate[],
  scoreOf: (candidate: RecommendationCandidate) => number,
  minPerSource: number,
  total: number,
): RecommendationCandidate[] {
  const ranked = [...candidates].sort((a, b) => scoreOf(b) - scoreOf(a));
  const picked: RecommendationCandidate[] = [];
  const seen = new Set<string>();

  const take = (list: RecommendationCandidate[], max: number) => {
    let taken = 0;
    list.forEach((candidate) => {
      if (taken >= max || picked.length >= total) return;
      if (seen.has(candidate.video.url)) return;
      seen.add(candidate.video.url);
      picked.push(candidate);
      taken += 1;
    });
  };

  FOR_YOU_SOURCE_QUOTA.forEach((source) => {
    take(
      ranked.filter((candidate) => candidate.sources.includes(source)),
      minPerSource,
    );
  });
  take(ranked, total);
  return picked;
}

export function passesHardFilters(
  candidate: RecommendationCandidate,
  friendIds: Set<string>,
  selfUserId: string,
): boolean {
  const uploaderId = candidate.details?.uploader?.uid || candidate.knownUploader?.uid || '';
  if (selfUserId && uploaderId === selfUserId) return false;
  if (!candidate.video.isPrivate) return true;
  return friendIds.has(uploaderId);
}
