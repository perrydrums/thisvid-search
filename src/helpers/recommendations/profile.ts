import type { AnalyseFavouriteUsers } from '../analyseFavourites';
import { getCategories } from '../getCategories';
import type { TasteCategory, TasteOrientation, TasteProfile, TasteTag, TasteUploader } from '../types';

/** Tags seen on only one favourite are noise once the library is this large. */
export const TAG_SINGLETON_MIN_VIDEOS = 20;
/** A tag or category on at least this share of favourites is too broad to search (it recreates the firehose). */
export const DISTINCTIVE_MAX_SHARE = 0.6;
/** Share of categorised favourites that must agree before tag listings pick gay or straight. */
export const ORIENTATION_THRESHOLD = 0.8;

const normalizeName = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

const memberIdFromUrl = (url: string): string => {
  const match = String(url || '').match(/\/members\/(\d+)/);
  if (match) return match[1];
  return '';
};

const slugFromName = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, '-');

const emptyProfile = (): TasteProfile => ({
  totalVideos: 0,
  tags: [],
  categories: [],
  uploaders: [],
  distinctiveTags: [],
  distinctiveCategories: [],
  orientation: 'mixed',
});

/**
 * Taste profile from Analyse data. Category slugs come from the live category index
 * so listing URLs match ThisVid (display name "Gay Scat" is not always slug `gay-scat`).
 */
export async function extractTasteProfile(users: AnalyseFavouriteUsers): Promise<TasteProfile> {
  const categoryCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const uploaders = new Map<string, TasteUploader>();
  let totalVideos = 0;
  let gayVideos = 0;
  let straightVideos = 0;

  let orientationByName = new Map<string, 'gay' | 'straight'>();
  let slugByName = new Map<string, string>();
  try {
    const categories = await getCategories();
    orientationByName = new Map(categories.map((category) => [normalizeName(category.name), category.orientation]));
    slugByName = new Map(categories.map((category) => [normalizeName(category.name), category.slug]));
  } catch {
    orientationByName = new Map();
    slugByName = new Map();
  }

  Object.values(users).forEach((user) => {
    const uid = memberIdFromUrl(user.url);
    user.videos.forEach((video) => {
      totalVideos += 1;
      const category = video.category?.trim();
      if (category) {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        const orientation = orientationByName.get(normalizeName(category));
        if (orientation === 'gay') gayVideos += 1;
        else if (orientation === 'straight') straightVideos += 1;
      }
      video.tags.forEach((tag) => {
        const name = tag.trim();
        if (!name) return;
        tagCounts.set(name, (tagCounts.get(name) || 0) + 1);
      });
    });

    if (uid && user.username) {
      uploaders.set(uid, {
        username: user.username,
        uid,
        count: user.videos.length,
        affinity: 0,
      });
    }
  });

  if (totalVideos === 0) return emptyProfile();

  const minTagCount = totalVideos >= TAG_SINGLETON_MIN_VIDEOS ? 2 : 1;
  const tags: TasteTag[] = Array.from(tagCounts.entries())
    .filter(([, count]) => count >= minTagCount)
    .map(([name, count]) => ({ name, count, weight: Math.log(1 + count) }))
    .sort((a, b) => b.weight - a.weight || b.count - a.count);

  const maxCategoryCount = Math.max(...Array.from(categoryCounts.values()), 1);
  const categories: TasteCategory[] = Array.from(categoryCounts.entries())
    .map(([name, count]) => ({
      name,
      slug: slugByName.get(normalizeName(name)) || slugFromName(name),
      count,
      affinity: count / maxCategoryCount,
    }))
    .sort((a, b) => b.count - a.count);

  const maxUploaderCount = Math.max(...Array.from(uploaders.values()).map((uploader) => uploader.count), 1);
  const uploaderList: TasteUploader[] = Array.from(uploaders.values())
    .map((uploader) => ({
      ...uploader,
      affinity: Math.log(1 + uploader.count) / Math.log(1 + maxUploaderCount),
    }))
    .sort((a, b) => b.count - a.count);

  const distinctiveTags = tags.filter((tag) => tag.count / totalVideos < DISTINCTIVE_MAX_SHARE);
  const distinctiveCategories = categories.filter(
    (category) => category.slug && category.count / totalVideos < DISTINCTIVE_MAX_SHARE,
  );

  const categorised = gayVideos + straightVideos;
  let orientation: TasteOrientation = 'mixed';
  if (categorised > 0 && gayVideos / categorised >= ORIENTATION_THRESHOLD) orientation = 'gay';
  else if (categorised > 0 && straightVideos / categorised >= ORIENTATION_THRESHOLD) orientation = 'straight';

  return {
    totalVideos,
    tags,
    categories,
    uploaders: uploaderList,
    distinctiveTags,
    distinctiveCategories,
    orientation,
  };
}

/** Synced favourites have grown well past the last analysis. */
export function isAnalyseStale(syncedFavouriteCount: number, analysedCount: number): boolean {
  if (analysedCount <= 0 || syncedFavouriteCount <= analysedCount) return false;
  const gap = Math.max(10, Math.round(analysedCount * 0.25));
  return syncedFavouriteCount > analysedCount + gap;
}
