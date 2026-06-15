import { FriendsResponse } from './types';

export async function fetchAllFriends(userId: string): Promise<FriendsResponse> {
  const trimmed = userId.trim();
  if (!trimmed) {
    return { success: false, pageAmount: 0, friends: [] };
  }

  const response = await fetch(`/friends?userId=${encodeURIComponent(trimmed)}`);
  if (response.status !== 200) {
    return { success: false, pageAmount: 0, friends: [] };
  }

  const body = (await response.json()) as FriendsResponse;
  if (!body.success) {
    return { success: false, pageAmount: 0, friends: [] };
  }

  return body;
}

export const getFriends = async (
  userId: string,
  setTotalPages: (totalPages: number) => void,
  updateProgress: (progress: number) => void,
): Promise<FriendsResponse> => {
  const body = await fetchAllFriends(userId);

  if (!body.success) {
    setTotalPages(0);
    updateProgress(0);
    return body;
  }

  setTotalPages(body.pageAmount);
  updateProgress(body.pageAmount);

  return body;
};
