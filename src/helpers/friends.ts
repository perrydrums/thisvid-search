import { FriendsResponse } from './types';

export const getFriends = async (
  userId: string,
  setTotalPages: (totalPages: number) => void,
  updateProgress: (progress: number) => void,
): Promise<FriendsResponse> => {
  const response = await fetch(`/friends?userId=${userId}`);
  if (response.status !== 200) {
    return {
      success: false,
      pageAmount: 0,
      friends: [],
    };
  }

  const body = await response.json();

  if (!body.success) {
    setTotalPages(0);
    updateProgress(0);
    return {
      success: false,
      pageAmount: 0,
      friends: [],
    };
  }

  setTotalPages(body.pageAmount);
  updateProgress(body.pageAmount);

  return body;
};
