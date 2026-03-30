import type { AnalyseFavouriteUsers } from './analyseFavourites';
import { getCategories } from './getCategories';
import { getLocalFavourites } from './favourites';
import { Video } from './types';
import { filterVideos, getVideos } from './videos';

export type TasteProfile = {
  categories: { name: string; slug: string; count: number }[];
  tags: { name: string; count: number }[];
  uploaders: { username: string; uid: string; count: number }[];
  totalVideos: number;
};

export type ScoredVideo = Video & {
  score: number;
  matchReasons: string[];
};

/** Category browse + tag filter vs uploader listings + tag filter. */
export type RecommendationsBundle = {
  fromCategories: ScoredVideo[];
  fromUploaders: ScoredVideo[];
};

type CachedRecommendations = {
  fromCategories: ScoredVideo[];
  fromUploaders: ScoredVideo[];
  timestamp: number;
  profileHash: string;
};

type SourceRef = { type: 'category' | 'uploader'; name: string };

const CACHE_KEY = 'tvass-recommendations';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
const CATEGORY_PAGE_COUNT = 5;
export const TOP_CATEGORIES = 5;
export const TOP_UPLOADERS = 10;
export const TOP_TAGS_FOR_FILTER = 30;
export const RECOMMENDATIONS_PER_SECTION = 200;

/** Strongest tag (highest favourite count among top-N) uses this `filterVideos` relevance multiplier. */
export const RECOMMENDATION_TAG_WEIGHT_MAX = 3;
/** Rarest tag in the top-N list still uses at least this multiplier. */
export const RECOMMENDATION_TAG_WEIGHT_MIN = 1;

// --- Taste profile extraction ---

const extractUid = (userUrl: string): string => {
  if (!userUrl) return '';
  return userUrl.split('/').filter(Boolean).pop() || '';
};

const normalizeCategoryName = (s: string): string =>
  s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Map display name (from Analyse) to real ThisVid category slug from /categories/ listing. */
const buildCategorySlugLookup = async (): Promise<Map<string, string>> => {
  try {
    const list = await getCategories();
    const lookup = new Map<string, string>();
    for (const c of list) {
      lookup.set(normalizeCategoryName(c.name), c.slug);
    }
    return lookup;
  } catch {
    return new Map();
  }
};

const resolveCategorySlug = (displayName: string, lookup: Map<string, string>): string => {
  const hit = lookup.get(normalizeCategoryName(displayName));
  if (hit) return hit;
  return displayName.toLowerCase().replaceAll(' ', '-');
};

export const extractProfileFromAnalyseData = async (
  users: AnalyseFavouriteUsers,
): Promise<TasteProfile> => {
  const categoryCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  const uploaderMap: Record<string, { uid: string; count: number }> = {};
  let totalVideos = 0;

  Object.values(users).forEach((user) => {
    const uid = extractUid(user.url);

    user.videos.forEach((video) => {
      totalVideos++;
      if (video.category) {
        categoryCounts[video.category] = (categoryCounts[video.category] || 0) + 1;
      }
      video.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    if (user.username && uid) {
      uploaderMap[user.username] = { uid, count: user.count };
    }
  });

  const slugLookup = await buildCategorySlugLookup();

  const categories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      slug: resolveCategorySlug(name, slugLookup),
      count,
    }));

  const tags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const uploaders = Object.entries(uploaderMap)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([username, { uid, count }]) => ({ username, uid, count }));

  return { categories, tags, uploaders, totalVideos };
};

// --- Candidate fetching ---

const fetchListingPage = async (url: string, page: number): Promise<Video[]> => {
  try {
    const videos = await getVideos({
      url,
      page,
      omitPrivate: false,
      minDuration: 0,
      quick: true,
    });
    return videos;
  } catch {
    return [];
  }
};

const sourceKey = (s: SourceRef): string => `${s.type}:${s.name}`;

const mergeVideoSources = (
  acc: Map<string, { video: Video; sources: SourceRef[] }>,
  videos: Video[],
  source: SourceRef,
): void => {
  videos.forEach((video) => {
    const existing = acc.get(video.url);
    if (!existing) {
      acc.set(video.url, { video, sources: [source] });
      return;
    }
    const keys = new Set(existing.sources.map(sourceKey));
    if (!keys.has(sourceKey(source))) {
      existing.sources.push(source);
    }
  });
};

/** Relevance from filterVideos + source weights + multi-source bonus. */
const scoreFromSourcesAndRelevance = (
  video: Video,
  profile: TasteProfile,
  sources: SourceRef[],
): ScoredVideo => {
  let score = video.relevance * 2;
  const matchReasons: string[] = [];

  const uniqueSources = new Map<string, SourceRef>();
  sources.forEach((s) => uniqueSources.set(sourceKey(s), s));

  uniqueSources.forEach((s) => {
    if (s.type === 'category') {
      const cat = profile.categories.find((c) => c.name === s.name);
      if (cat) {
        score += (cat.count / profile.totalVideos) * 12;
        matchReasons.push(cat.name);
      }
    } else {
      const up = profile.uploaders.find((u) => u.username === s.name);
      if (up) {
        score += (up.count / profile.totalVideos) * 14;
        matchReasons.push(up.username);
      }
    }
  });

  if (uniqueSources.size > 1) {
    score += 3;
  }

  // Labels only — tag match strength is already in `video.relevance` from filterVideos
  profile.tags.slice(0, TOP_TAGS_FOR_FILTER).forEach((tag) => {
    if (video.title.toLowerCase().includes(tag.name.toLowerCase())) {
      if (!matchReasons.includes(tag.name)) {
        matchReasons.push(tag.name);
      }
    }
  });

  return { ...video, score, matchReasons };
};

/**
 * Per-tag weights for `filterVideos`: linear in favourite count between
 * `RECOMMENDATION_TAG_WEIGHT_MIN` (lowest count in top-N) and `RECOMMENDATION_TAG_WEIGHT_MAX` (highest).
 */
const buildIncludeTagWeights = (profile: TasteProfile): Record<string, number> => {
  const slice = profile.tags.slice(0, TOP_TAGS_FOR_FILTER);
  if (slice.length === 0) return {};
  const counts = slice.map((t) => t.count);
  const maxCount = Math.max(...counts, 1);
  const minCount = Math.min(...counts);
  const out: Record<string, number> = {};
  const span = RECOMMENDATION_TAG_WEIGHT_MAX - RECOMMENDATION_TAG_WEIGHT_MIN;

  if (maxCount === minCount) {
    slice.forEach((t) => {
      out[t.name] = RECOMMENDATION_TAG_WEIGHT_MAX;
    });
  } else {
    slice.forEach((t) => {
      const ratio = (t.count - minCount) / (maxCount - minCount);
      out[t.name] = RECOMMENDATION_TAG_WEIGHT_MIN + ratio * span;
    });
  }
  return out;
};

// --- Main recommendation generator ---

const buildScoredListForMerged = (
  merged: Map<string, { video: Video; sources: SourceRef[] }>,
  favouriteUrls: Set<string>,
  tagNamesForFilter: string[],
  profile: TasteProfile,
  includeTagWeights: Record<string, number>,
): ScoredVideo[] => {
  const rawVideos = Array.from(merged.values())
    .filter(({ video }) => !favouriteUrls.has(video.url))
    .map(({ video }) => video);

  const filtered = filterVideos({
    videos: rawVideos,
    includeTags: tagNamesForFilter,
    includeTagWeights,
    termsOperator: 'OR',
  });

  const scored = filtered.map((video) => {
    const entry = merged.get(video.url);
    const sources = entry?.sources ?? [];
    return scoreFromSourcesAndRelevance(video, profile, sources);
  });

  return scored
    .sort((a, b) => b.score - a.score || b.views - a.views)
    .slice(0, RECOMMENDATIONS_PER_SECTION);
};

export const generateRecommendations = async (
  profile: TasteProfile,
  onProgress?: (status: string) => void,
): Promise<RecommendationsBundle> => {
  const favouriteUrls = new Set(getLocalFavourites());

  const topCategories = profile.categories.slice(0, TOP_CATEGORIES);
  const topUploaders = profile.uploaders.slice(0, TOP_UPLOADERS);
  const tagNamesForFilter = profile.tags.slice(0, TOP_TAGS_FOR_FILTER).map((t) => t.name);

  if (tagNamesForFilter.length === 0) {
    onProgress?.('No tags in profile — run Analyse with videos that have tags.');
    return { fromCategories: [], fromUploaders: [] };
  }

  onProgress?.('Fetching category and uploader listings...');

  const categoryTasks: Promise<void>[] = [];
  const uploaderTasks: Promise<void>[] = [];
  const categoryMerged = new Map<string, { video: Video; sources: SourceRef[] }>();
  const uploaderMerged = new Map<string, { video: Video; sources: SourceRef[] }>();

  topCategories.forEach((cat) => {
    for (let page = 1; page <= CATEGORY_PAGE_COUNT; page++) {
      const url = `/categories/${cat.slug}/${page}/`;
      categoryTasks.push(
        fetchListingPage(url, page).then((videos) => {
          mergeVideoSources(categoryMerged, videos, { type: 'category', name: cat.name });
        }),
      );
    }
  });

  topUploaders.forEach((up) => {
    uploaderTasks.push(
      fetchListingPage(`/members/${up.uid}/public_videos/1/`, 1).then((videos) => {
        mergeVideoSources(uploaderMerged, videos, { type: 'uploader', name: up.username });
      }),
    );
    uploaderTasks.push(
      fetchListingPage(`/members/${up.uid}/private_videos/1/`, 1).then((videos) => {
        mergeVideoSources(uploaderMerged, videos, { type: 'uploader', name: up.username });
      }),
    );
  });

  await Promise.all([...categoryTasks, ...uploaderTasks]);

  onProgress?.('Filtering and scoring...');

  const includeTagWeights = buildIncludeTagWeights(profile);

  const fromCategories = buildScoredListForMerged(
    categoryMerged,
    favouriteUrls,
    tagNamesForFilter,
    profile,
    includeTagWeights,
  );
  const fromUploaders = buildScoredListForMerged(
    uploaderMerged,
    favouriteUrls,
    tagNamesForFilter,
    profile,
    includeTagWeights,
  );

  return { fromCategories, fromUploaders };
};

// --- Cache ---

const profileFingerprint = (profile: TasteProfile): string =>
  [
    ...profile.categories.slice(0, 5).map((c) => `${c.name}:${c.slug}`),
    ...profile.tags.slice(0, TOP_TAGS_FOR_FILTER).map((t) => t.name),
  ].join('|');

const hashString = (s: string): string => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return `${h >>> 0}`;
};

const getProfileHash = (profile: TasteProfile): string => hashString(profileFingerprint(profile));

export const getCachedRecommendations = (profile: TasteProfile): RecommendationsBundle | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as CachedRecommendations & { videos?: ScoredVideo[] };
    if (Date.now() - data.timestamp > CACHE_DURATION_MS) return null;
    if (data.profileHash !== getProfileHash(profile)) return null;

    if (Array.isArray(data.fromCategories) && Array.isArray(data.fromUploaders)) {
      return { fromCategories: data.fromCategories, fromUploaders: data.fromUploaders };
    }

    return null;
  } catch {
    return null;
  }
};

export const cacheRecommendations = (bundle: RecommendationsBundle, profile: TasteProfile): void => {
  try {
    const data: CachedRecommendations = {
      fromCategories: bundle.fromCategories,
      fromUploaders: bundle.fromUploaders,
      timestamp: Date.now(),
      profileHash: getProfileHash(profile),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to cache recommendations:', error);
  }
};
