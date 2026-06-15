export const FRIEND_IDS_STORAGE_KEY = 'tvass-friend-ids';
export const FRIENDS_LAST_SYNC_STORAGE_KEY = 'tvass-friends-last-sync-date';

/** Numeric or slug segment from a `/members/{id}/` profile URL. */
export function extractMemberIdFromProfileHref(href: string): string {
  const m = String(href || '').match(/\/members\/([^/?#]+)/);
  return m ? m[1] : '';
}

export function getLocalFriendIds(): string[] {
  const raw = localStorage.getItem(FRIEND_IDS_STORAGE_KEY);
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function isFavouriteVideosListingPath(path: string): boolean {
  return /\/members\/[^/]+\/favourite_videos(?:\/|$)/.test(String(path || ''));
}

/** Member whose favourites list is being browsed (not per-video uploader). */
export function memberIdFromFavouriteListingPath(path: string): string {
  const m = String(path || '').match(/\/members\/([^/?#]+)\/favourite_videos/);
  return m ? m[1] : '';
}

export function resolveVideoMemberId(
  video: { memberId?: string },
  listingMemberId?: string,
  /** When set, this profile owner ID is never treated as the uploader (favourite listings). */
  favouriteListingOwnerId?: string,
): string {
  const owner = favouriteListingOwnerId?.trim();
  let fromVideo = video.memberId?.trim();
  if (fromVideo && owner && fromVideo === owner) fromVideo = '';
  if (fromVideo) return fromVideo;
  return listingMemberId?.trim() || '';
}

export function isFriendMemberId(memberId: string | undefined, friendIds: Set<string>): boolean {
  if (!memberId) return false;
  return friendIds.has(memberId);
}
