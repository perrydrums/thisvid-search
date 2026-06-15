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

export function resolveVideoMemberId(
  video: { memberId?: string },
  listingMemberId?: string,
): string {
  const fromVideo = video.memberId?.trim();
  if (fromVideo) return fromVideo;
  return listingMemberId?.trim() || '';
}

export function isFriendMemberId(memberId: string | undefined, friendIds: Set<string>): boolean {
  if (!memberId) return false;
  return friendIds.has(memberId);
}
