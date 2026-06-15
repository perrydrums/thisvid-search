export const FRIEND_IDS_STORAGE_KEY = 'tvass-friend-ids';
export const FRIENDS_LAST_SYNC_STORAGE_KEY = 'tvass-friends-last-sync-date';

export function getLocalFriendIds(): string[] {
  const raw = localStorage.getItem(FRIEND_IDS_STORAGE_KEY);
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}
