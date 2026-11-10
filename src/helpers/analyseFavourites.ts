import cheerio from 'cheerio';

import { parseVideoTile } from './parseVideoTile';
import { canonicalVideoUrl } from './videoUrl';

export type AnalyseFavouriteVideo = {
  title: string;
  thumbnail: string;
  description: string;
  category: string;
  tags: string[];
  username: string;
  userUrl: string;
  url: string;
};

export type AnalyseFavouriteUser = {
  username: string;
  url: string;
  avatar: string;
  videos: AnalyseFavouriteVideo[];
  count: number;
};

export type AnalyseFavouriteUsers = Record<string, AnalyseFavouriteUser>;

export const TVASS_USER_ID_STORAGE_KEY = 'tvass-user-id';
export const ANALYSE_USERS_STORAGE_KEY = 'tvass-analyse-users';
/** Related-video tiles harvested from favourite detail pages, capped and sorted by hit count. */
export const ANALYSE_RELATED_STORAGE_KEY = 'tvass-analyse-related';
/** ISO timestamp of the last successful Analyse run (full or single page). */
export const ANALYSE_DATE_STORAGE_KEY = 'tvass-analyse-date';

export const RELATED_STORE_CAP = 1000;

export type HarvestedRelatedVideo = {
  title: string;
  url: string;
  isPrivate: boolean;
  duration: string;
  avatar: string;
  views: number;
  date: string;
  rating: number | null;
  /** How many analysed favourites listed this video as related. */
  hits: number;
};

export type RelatedAccumulator = Map<string, HarvestedRelatedVideo>;

export type AnalyseFavouritesResult = {
  users: AnalyseFavouriteUsers;
  related: HarvestedRelatedVideo[];
};

/** Same-origin path for fetch (proxied to ThisVid in dev + prod). Handles absolute or relative hrefs. */
function hrefToProxiedPath(href: string): string {
  const { pathname, search } = new URL(href, 'https://thisvid.com');
  return `${pathname}${search}`;
}

/** Member id → avatar URL. An entry means that profile page was already requested, even if it had no avatar. */
export type FetchedProfiles = Map<string, string>;

function memberIdFromProfileUrl(url: string): string {
  const match = String(url || '').match(/\/members\/(\d+)/);
  return match ? match[1] : '';
}

function profileId(memberNumericId: string): string {
  const fromUrl = memberIdFromProfileUrl(memberNumericId);
  if (fromUrl) return fromUrl;
  const id = parseInt(memberNumericId, 10);
  return Number.isFinite(id) && id > 0 ? String(id) : '';
}

/** Profiles already stored on `users` count as fetched, so later pages don't request them again. */
function rememberExistingProfiles(users: AnalyseFavouriteUsers, fetched: FetchedProfiles): void {
  Object.values(users).forEach((user) => {
    const id = memberIdFromProfileUrl(user.url);
    if (id && !fetched.has(id)) fetched.set(id, user.avatar || '');
  });
}

async function fetchMemberAvatar(memberId: string): Promise<string> {
  const userResponse = await fetch(`/members/${memberId}/`);
  const userBody = await userResponse.text();
  const $ = cheerio.load(userBody);
  return $('.avatar img').first().attr('src') || '';
}

async function getAvatarForUploader(
  fetched: FetchedProfiles,
  inflight: Map<string, Promise<string>>,
  memberNumericId: string,
): Promise<string> {
  const id = profileId(memberNumericId);
  if (!id) return '';
  if (fetched.has(id)) return fetched.get(id) || '';

  const pending = inflight.get(id);
  if (pending) return pending;

  const request = (async () => {
    try {
      const avatar = await fetchMemberAvatar(id);
      fetched.set(id, avatar);
      return avatar;
    } catch {
      fetched.set(id, '');
      return '';
    } finally {
      inflight.delete(id);
    }
  })();
  inflight.set(id, request);
  return request;
}

function mergeVideo(
  users: AnalyseFavouriteUsers,
  video: AnalyseFavouriteVideo,
  avatar: string,
): void {
  const { username } = video;
  const userUrl = video.userUrl || '';
  if (!users[username]) {
    users[username] = {
      username,
      url: userUrl,
      avatar: avatar || '',
      videos: [video],
      count: 1,
    };
    return;
  }
  const u = users[username];
  u.videos.push(video);
  u.count++;
  if (avatar) u.avatar = avatar;
  if (userUrl) u.url = userUrl;
}

function addRelatedHit(related: RelatedAccumulator, tile: HarvestedRelatedVideo): void {
  const existing = related.get(tile.url);
  if (!existing) {
    related.set(tile.url, tile);
    return;
  }
  existing.hits += 1;
  if (!existing.avatar && tile.avatar) existing.avatar = tile.avatar;
  if (tile.rating != null) existing.rating = tile.rating;
  if (tile.views > existing.views) existing.views = tile.views;
}

/** Related tiles on one favourite's detail page. Counted once per favourite, not per duplicate tile. */
function harvestRelatedTiles(
  $v: ReturnType<typeof cheerio.load>,
  favouriteUrl: string,
): HarvestedRelatedVideo[] {
  const ownUrl = canonicalVideoUrl(favouriteUrl);
  const seen = new Set<string>();
  const tiles: HarvestedRelatedVideo[] = [];

  $v('a.tumbpu').each((_, element) => {
    const parsed = parseVideoTile($v, element);
    if (!parsed) return;
    const url = canonicalVideoUrl(parsed.url);
    if (!url || url === ownUrl || seen.has(url)) return;
    seen.add(url);
    tiles.push({
      title: parsed.title,
      url,
      isPrivate: parsed.isPrivate,
      duration: parsed.duration,
      avatar: parsed.avatar,
      views: parsed.views,
      date: parsed.date,
      rating: parsed.rating,
      hits: 1,
    });
  });

  return tiles;
}

/**
 * Scrape one favourites listing page and merge video detail into `users` (mutates).
 * When `related` is passed, also records Related Videos tiles from each detail page.
 */
export async function analyseFavouritesListingPage(
  uid: string,
  page: number,
  users: AnalyseFavouriteUsers,
  related?: RelatedAccumulator,
  fetchedProfiles?: FetchedProfiles,
): Promise<void> {
  const fetched = fetchedProfiles ?? new Map();
  rememberExistingProfiles(users, fetched);
  const inflightProfiles = new Map<string, Promise<string>>();

  const listUrl = `/members/${uid}/favourite_videos/${page}/`;
  const response = await fetch(listUrl);
  const body = await response.text();
  const $ = cheerio.load(body);

  const hrefs = $('.tumbpu')
    .map((i, el) => $(el).attr('href'))
    .get()
    .filter(Boolean) as string[];

  const rows = await Promise.all(
    hrefs.map(async (href) => {
      try {
        const res = await fetch(hrefToProxiedPath(href));
        const html = await res.text();
        const $v = cheerio.load(html);

        const title = $v('.headline h1').first().text();
        const thumbnailElement = $v('.video-holder img').first().attr('src');
        const thumbnail = thumbnailElement
          ? thumbnailElement.replace('//', 'https://')
          : 'https://placehold.co/100x100/000000/b60707?text=Private+Video';
        const videoInfo = $v('.box ul.description').first();
        const description = videoInfo.find('li').first().text();
        const category = videoInfo.find('li:nth-child(2) a').first().text();
        const tags = videoInfo
          .find('li:nth-child(3)')
          .find('a')
          .map((i, el) => $v(el).text())
          .get() as string[];
        const username = videoInfo.find('li:nth-child(4) a').first().text();
        const userUrl = videoInfo.find('li:nth-child(4) a').first().attr('href') || '';
        const userID = userUrl ? userUrl.split('/').slice(-2)[0] : '';

        const video: AnalyseFavouriteVideo = {
          title,
          thumbnail,
          description,
          category,
          tags,
          username,
          userUrl,
          url: href,
        };
        const relatedTiles = related ? harvestRelatedTiles($v, href) : [];
        return { video, memberId: userID, relatedTiles };
      } catch {
        return null;
      }
    }),
  );

  for (const row of rows) {
    if (!row) continue;
    const avatar = await getAvatarForUploader(
      fetched,
      inflightProfiles,
      row.video.userUrl || row.memberId,
    );
    mergeVideo(users, row.video, avatar);
    if (related) {
      row.relatedTiles.forEach((tile) => addRelatedHit(related, tile));
    }
  }
}

export async function getFavouriteListingPageLimit(uid: string): Promise<number> {
  const response = await fetch(`/members/${uid}/favourite_videos/`);
  const body = await response.text();
  const $ = cheerio.load(body);
  const lastPage = parseInt(
    $('li.pagination-last a').text() || $('.pagination-list li:nth-last-child(2) a').text(),
    10,
  );
  return Number.isFinite(lastPage) && lastPage > 0 ? lastPage : 1;
}

export type RunAnalyseFavouritesOptions = {
  onProgress?: (completedPages: number, totalPages: number) => void;
};

export function analysedVideoUrls(users: AnalyseFavouriteUsers): Set<string> {
  const urls = new Set<string>();
  Object.values(users).forEach((user) => {
    user.videos.forEach((video) => {
      const url = canonicalVideoUrl(video.url);
      if (url) urls.add(url);
    });
  });
  return urls;
}

/** Top related videos by how often analysed favourites listed them. Favourites themselves are dropped. */
export function harvestedRelatedList(
  related: RelatedAccumulator,
  users?: AnalyseFavouriteUsers,
): HarvestedRelatedVideo[] {
  const own = users ? analysedVideoUrls(users) : null;
  return Array.from(related.values())
    .filter((video) => !own || !own.has(video.url))
    .sort((a, b) => b.hits - a.hits || b.views - a.views)
    .slice(0, RELATED_STORE_CAP);
}

export function loadHarvestedRelated(): HarvestedRelatedVideo[] {
  try {
    const raw = localStorage.getItem(ANALYSE_RELATED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is HarvestedRelatedVideo => {
      return !!item && typeof item === 'object' && typeof (item as HarvestedRelatedVideo).url === 'string';
    });
  } catch {
    return [];
  }
}

export function relatedListToMap(list: HarvestedRelatedVideo[]): RelatedAccumulator {
  const map: RelatedAccumulator = new Map();
  list.forEach((item) => {
    const url = canonicalVideoUrl(item.url);
    if (!url) return;
    const hits = Number(item.hits);
    map.set(url, {
      ...item,
      url,
      hits: Number.isFinite(hits) && hits > 0 ? hits : 1,
    });
  });
  return map;
}

export function loadAnalyseDate(): string {
  return localStorage.getItem(ANALYSE_DATE_STORAGE_KEY) || '';
}

/** Persists the capped related index and stamps the analysis date. Shrinks the list if storage is full. */
export function saveHarvestedRelated(videos: HarvestedRelatedVideo[]): void {
  const stamped = new Date().toISOString();
  const attempts = [videos.slice(0, RELATED_STORE_CAP), videos.slice(0, 400), videos.slice(0, 100)];
  for (const payload of attempts) {
    try {
      localStorage.setItem(ANALYSE_RELATED_STORAGE_KEY, JSON.stringify(payload));
      localStorage.setItem(ANALYSE_DATE_STORAGE_KEY, stamped);
      return;
    } catch {
      /* quota — try a smaller payload */
    }
  }
  console.error('Failed to save harvested related videos');
}

/**
 * Full favourite-videos analysis: all pages, sequentially (safe merges).
 * Also harvests Related Videos from each favourite's detail page (no extra requests).
 */
export async function runAnalyseFavourites(
  uid: string,
  options?: RunAnalyseFavouritesOptions,
): Promise<AnalyseFavouritesResult> {
  const pageLimit = await getFavouriteListingPageLimit(uid);
  const users: AnalyseFavouriteUsers = {};
  const related: RelatedAccumulator = new Map();
  const fetchedProfiles: FetchedProfiles = new Map();

  for (let page = 1; page <= pageLimit; page++) {
    await analyseFavouritesListingPage(uid, page, users, related, fetchedProfiles);
    options?.onProgress?.(page, pageLimit);
  }

  return { users, related: harvestedRelatedList(related, users) };
}
