import type { HarvestedRelatedVideo } from '../analyseFavourites';
import type { MemberFeed, TasteOrientation, TasteProfile, Video, VideoDetails, VideoUploader } from '../types';
import { canonicalVideoUrl } from '../videoUrl';
import { getVideos, parseRelativeTime } from '../videos';

export const FRIEND_SCAN_LIMIT = 120;
export const FRIEND_SCAN_CONCURRENCY = 6;
export const LISTING_CONCURRENCY = 6;
export const FRIEND_UPLOAD_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
export const FRIEND_ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const FRIEND_EMPTY_RETRY_MS = 7 * 24 * 60 * 60 * 1000;
export const TOP_DISTINCTIVE_TAGS = 5;
export const TAG_LISTING_PAGES = 2;
export const TOP_DISTINCTIVE_CATEGORIES = 3;
export const CATEGORY_LISTING_PAGES = 2;
export const TOP_NON_FRIEND_UPLOADERS = 8;

const ACTIVITY_KEY = 'tvass-friend-activity';

export type FriendActivity = {
  username: string;
  scannedAt: number;
  lastUploadAt: number | null;
};

export type RecommendationSource =
  | 'friendUpload'
  | 'related'
  | 'friendFavourite'
  | 'uploader'
  | 'tag'
  | 'category';

export type RecommendationCandidate = {
  video: Video;
  sources: RecommendationSource[];
  evidence: {
    relatedHits: number;
    friendFavHits: number;
    listingHits: number;
  };
  knownCategory?: string;
  knownUploader?: VideoUploader;
  friendUid?: string;
  details?: VideoDetails;
  listingKeys: Set<string>;
  friendFavUids: Set<string>;
};

export type CollectProgress = {
  track: 'friends' | 'listings';
  label: string;
  done: number;
  total: number;
};

type CandidateMap = Map<string, RecommendationCandidate>;

type AddExtra = {
  source: RecommendationSource;
  knownUploader?: VideoUploader;
  knownCategory?: string;
  listingKey?: string;
  relatedHits?: number;
  friendFavUid?: string;
  friendUid?: string;
};

export function loadFriendActivity(): Record<string, FriendActivity> {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, FriendActivity>;
  } catch {
    return {};
  }
}

export function saveFriendActivity(activity: Record<string, FriendActivity>): void {
  const entries = Object.entries(activity);
  const trimmed = [...entries].sort((a, b) => b[1].scannedAt - a[1].scannedAt).slice(0, 800);
  const attempts = [entries, trimmed];
  for (const slice of attempts) {
    try {
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(Object.fromEntries(slice)));
      return;
    } catch {
      /* quota — keep the most recently scanned rows */
    }
  }
}

/** `parseRelativeTime` treats unknown strings as "now", so only accept strings it actually understands. */
export function videoPostedAt(date: string): number | null {
  const raw = date.trim().toLowerCase();
  if (!raw) return null;
  const understood =
    raw === 'today' ||
    raw === 'yesterday' ||
    raw === 'just now' ||
    raw === 'now' ||
    /\d+\s*[a-z]+/.test(raw);
  if (!understood) return null;
  return parseRelativeTime(date).getTime();
}

export function isWithinAge(date: string, maxAgeMs: number, now: number): boolean {
  const postedAt = videoPostedAt(date);
  if (postedAt == null) return false;
  const age = now - postedAt;
  return age >= -60_000 && age <= maxAgeMs;
}

export async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * Who to scan this refresh. Uploaders of your favourites first, then friends who posted
 * recently, then never-scanned profiles, then everyone else oldest-scan first.
 * Profiles that had no uploads last time wait a week before another look.
 */
export function selectFriendIds(
  friendIds: string[],
  uploaderCounts: Map<string, number>,
  activity: Record<string, FriendActivity>,
  now: number,
  selfUserId: string,
): string[] {
  const ids = [...new Set(friendIds.map((id) => id.trim()).filter((id) => id && id !== selfUserId))];
  const seen = new Set<string>();
  const picked: string[] = [];

  const take = (list: string[]) => {
    list.forEach((id) => {
      if (picked.length >= FRIEND_SCAN_LIMIT || seen.has(id)) return;
      seen.add(id);
      picked.push(id);
    });
  };

  const byUploads = ids
    .filter((id) => (uploaderCounts.get(id) || 0) > 0)
    .sort((a, b) => (uploaderCounts.get(b) || 0) - (uploaderCounts.get(a) || 0));

  const recent = ids
    .filter((id) => {
      const last = activity[id]?.lastUploadAt;
      return last != null && now - last <= FRIEND_ACTIVE_WINDOW_MS && now - last >= -60_000;
    })
    .sort((a, b) => (activity[b].lastUploadAt || 0) - (activity[a].lastUploadAt || 0));

  const never = ids.filter((id) => !activity[id]);

  const rest = ids
    .filter((id) => {
      const row = activity[id];
      if (!row) return false;
      if (row.lastUploadAt == null && now - row.scannedAt < FRIEND_EMPTY_RETRY_MS) return false;
      return true;
    })
    .sort((a, b) => activity[a].scannedAt - activity[b].scannedAt);

  take(byUploads);
  take(recent);
  take(never);
  take(rest);
  return picked;
}

export async function fetchMemberFeed(uid: string): Promise<MemberFeed | null> {
  try {
    const response = await fetch(`/memberFeed?uid=${encodeURIComponent(uid)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as MemberFeed;
    if (!body?.success) return null;
    return body;
  } catch (error) {
    console.error('memberFeed', error);
    return null;
  }
}

function addCandidate(
  map: CandidateMap,
  video: Video,
  extra: AddExtra,
  exclusion: Set<string>,
  selfUserId: string,
): void {
  const url = canonicalVideoUrl(video.url);
  if (!url || exclusion.has(url)) return;

  const uploaderId = extra.knownUploader?.uid || '';
  if (selfUserId && uploaderId === selfUserId) return;
  // Private tiles are only kept when the uploader is already known to be a friend.
  if (video.isPrivate && !uploaderId) return;

  let candidate = map.get(url);
  if (!candidate) {
    candidate = {
      video: {
        ...video,
        url,
        relevance: video.relevance || 0,
        page: video.page || 1,
      },
      sources: [],
      evidence: { relatedHits: 0, friendFavHits: 0, listingHits: 0 },
      listingKeys: new Set(),
      friendFavUids: new Set(),
    };
    map.set(url, candidate);
  }

  if (!candidate.sources.includes(extra.source)) candidate.sources.push(extra.source);
  if (extra.knownUploader && !candidate.knownUploader) candidate.knownUploader = extra.knownUploader;
  if (extra.knownCategory && !candidate.knownCategory) candidate.knownCategory = extra.knownCategory;
  if (extra.friendUid) candidate.friendUid = extra.friendUid;
  if (extra.relatedHits) {
    candidate.evidence.relatedHits = Math.max(candidate.evidence.relatedHits, extra.relatedHits);
  }
  if (extra.friendFavUid && !candidate.friendFavUids.has(extra.friendFavUid)) {
    candidate.friendFavUids.add(extra.friendFavUid);
    candidate.evidence.friendFavHits += 1;
  }
  if (extra.listingKey && !candidate.listingKeys.has(extra.listingKey)) {
    candidate.listingKeys.add(extra.listingKey);
    candidate.evidence.listingHits += 1;
  }
  if (!candidate.video.avatar && video.avatar) candidate.video.avatar = video.avatar;
  if ((video.views || 0) > (candidate.video.views || 0)) candidate.video.views = video.views;
  if (video.rating != null) candidate.video.rating = video.rating;
}

function tagListingPath(tag: string, orientation: TasteOrientation, page: number): string {
  const slug = encodeURIComponent(tag.trim());
  if (orientation === 'gay') return `/tags/${slug}/latest-males/${page}/`;
  if (orientation === 'straight') return `/tags/${slug}/latest-females/${page}/`;
  return page <= 1 ? `/tags/${slug}/` : `/tags/${slug}/${page}/`;
}

function asVideo(video: Video): Video {
  return { ...video, relevance: video.relevance || 0, page: video.page || 1 };
}

export async function collectRecommendationCandidates(options: {
  profile: TasteProfile;
  friendIds: string[];
  selfUserId: string;
  exclusion: Set<string>;
  related: HarvestedRelatedVideo[];
  now?: number;
  onProgress?: (progress: CollectProgress) => void;
}): Promise<{ fromFriends: RecommendationCandidate[]; forYou: RecommendationCandidate[] }> {
  const now = options.now ?? Date.now();
  const selfUserId = options.selfUserId.trim();
  const friendIdSet = new Set(options.friendIds);
  const fromFriends: CandidateMap = new Map();
  const forYou: CandidateMap = new Map();
  const activity = loadFriendActivity();

  options.related.forEach((video) => {
    addCandidate(
      forYou,
      {
        title: video.title,
        url: video.url,
        isPrivate: video.isPrivate,
        duration: video.duration,
        avatar: video.avatar,
        views: video.views,
        date: video.date,
        rating: video.rating,
        relevance: 0,
        page: 1,
      },
      { source: 'related', relatedHits: video.hits },
      options.exclusion,
      selfUserId,
    );
  });

  const uploaderCounts = new Map(options.profile.uploaders.map((uploader) => [uploader.uid, uploader.count]));
  const selectedFriends = selectFriendIds(
    options.friendIds,
    uploaderCounts,
    activity,
    now,
    selfUserId,
  );

  let friendsDone = 0;
  const friendTask = mapPool(selectedFriends, FRIEND_SCAN_CONCURRENCY, async (uid) => {
    const feed = await fetchMemberFeed(uid);
    friendsDone += 1;
    options.onProgress?.({
      track: 'friends',
      label: `Checking friends ${friendsDone}/${selectedFriends.length}`,
      done: friendsDone,
      total: selectedFriends.length,
    });
    if (!feed) return;

    const uploads = [...(feed.publicVideos || []), ...(feed.privateVideos || [])];
    let newest: number | null = null;
    uploads.forEach((video) => {
      const postedAt = videoPostedAt(video.date || '');
      if (postedAt != null && (newest == null || postedAt > newest)) newest = postedAt;
    });
    activity[uid] = {
      username: feed.username || activity[uid]?.username || '',
      scannedAt: now,
      lastUploadAt: newest,
    };

    const uploader = { username: feed.username || uid, uid };
    uploads.forEach((video) => {
      if (!isWithinAge(video.date || '', FRIEND_UPLOAD_MAX_AGE_MS, now)) return;
      addCandidate(
        fromFriends,
        asVideo(video),
        { source: 'friendUpload', knownUploader: uploader, friendUid: uid },
        options.exclusion,
        selfUserId,
      );
    });

    (feed.favouriteVideos || []).forEach((video) => {
      addCandidate(
        forYou,
        asVideo(video),
        { source: 'friendFavourite', friendFavUid: uid },
        options.exclusion,
        selfUserId,
      );
    });
  });

  const listingTasks: Array<() => Promise<void>> = [];

  options.profile.uploaders
    .filter((uploader) => uploader.uid && uploader.uid !== selfUserId && !friendIdSet.has(uploader.uid))
    .slice(0, TOP_NON_FRIEND_UPLOADERS)
    .forEach((uploader) => {
      listingTasks.push(async () => {
        const feed = await fetchMemberFeed(uploader.uid);
        (feed?.publicVideos || []).forEach((video) => {
          addCandidate(
            forYou,
            asVideo(video),
            {
              source: 'uploader',
              knownUploader: { username: feed?.username || uploader.username, uid: uploader.uid },
              listingKey: `uploader:${uploader.uid}`,
            },
            options.exclusion,
            selfUserId,
          );
        });
      });
    });

  options.profile.distinctiveTags.slice(0, TOP_DISTINCTIVE_TAGS).forEach((tag) => {
    for (let page = 1; page <= TAG_LISTING_PAGES; page += 1) {
      const url = tagListingPath(tag.name, options.profile.orientation, page);
      listingTasks.push(async () => {
        const videos = await getVideos({ url, page, minDuration: 0, quick: true });
        videos.forEach((video) => {
          addCandidate(
            forYou,
            asVideo(video),
            { source: 'tag', listingKey: `tag:${tag.name.toLowerCase()}` },
            options.exclusion,
            selfUserId,
          );
        });
      });
    }
  });

  options.profile.distinctiveCategories.slice(0, TOP_DISTINCTIVE_CATEGORIES).forEach((category) => {
    if (!category.slug) return;
    for (let page = 1; page <= CATEGORY_LISTING_PAGES; page += 1) {
      const url = `/categories/${encodeURIComponent(category.slug)}/${page}/`;
      listingTasks.push(async () => {
        const videos = await getVideos({ url, page, minDuration: 0, quick: true });
        videos.forEach((video) => {
          addCandidate(
            forYou,
            asVideo(video),
            {
              source: 'category',
              knownCategory: category.name,
              listingKey: `category:${category.slug}`,
            },
            options.exclusion,
            selfUserId,
          );
        });
      });
    }
  });

  let listingsDone = 0;
  const listingTotal = listingTasks.length;
  const listingTask = mapPool(listingTasks, LISTING_CONCURRENCY, async (task) => {
    try {
      await task();
    } catch (error) {
      console.error('recommendation listing', error);
    }
    listingsDone += 1;
    options.onProgress?.({
      track: 'listings',
      label: `Checking tags and categories ${listingsDone}/${listingTotal}`,
      done: listingsDone,
      total: listingTotal,
    });
  });

  if (listingTotal === 0) {
    options.onProgress?.({
      track: 'listings',
      label: 'No tag or category listings to check',
      done: 1,
      total: 1,
    });
  }
  if (selectedFriends.length === 0) {
    options.onProgress?.({
      track: 'friends',
      label: 'No friends to check',
      done: 1,
      total: 1,
    });
  }

  await Promise.all([friendTask, listingTask]);
  saveFriendActivity(activity);

  return {
    fromFriends: Array.from(fromFriends.values()),
    forYou: Array.from(forYou.values()),
  };
}
