import cheerio from 'cheerio';

import { fetchAllFriends } from './friends';
import { createSyncTimestamp } from './syncTimestamp';
import { getVideos } from './videos';

export type ScrapedProfile = {
  favouritesCsv: string;
  friendIdsCsv: string;
  lastSync: string;
  friendsLastSync: string;
};

/**
 * Pulls favourite video URLs and friend member IDs for a ThisVid user.
 * Callers persist the result (localStorage and, when signed in, Supabase).
 */
export async function scrapeProfileForSync(
  userId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<ScrapedProfile> {
  const trimmed = userId.trim();
  if (!trimmed) {
    throw new Error('Missing ThisVid user id');
  }

  const response = await fetch(`/members/${trimmed}/favourite_videos/`);
  const body = await response.text();
  const $ = cheerio.load(body);

  const lastPage =
    parseInt(
      $('li.pagination-last a').text() || $('.pagination-list li:nth-last-child(2) a').text(),
      10,
    ) || 1;

  const total = lastPage + 1;
  let done = 0;
  const bump = () => {
    done += 1;
    onProgress?.(done, total);
  };
  onProgress?.(0, total);

  const pages = [];
  for (let i = 1; i <= lastPage; i++) {
    pages.push(
      getVideos({
        url: `/members/${trimmed}/favourite_videos/${i}`,
        page: i,
        minDuration: 0,
        quick: true,
      }).then((batch) => {
        bump();
        return batch;
      }),
    );
  }

  const videos = (await Promise.all(pages)).flat().filter(
    (value, index, self) => index === self.findIndex((video) => video.url === value.url),
  );

  const friendsResult = await fetchAllFriends(trimmed);
  bump();

  if (!friendsResult.success) {
    throw new Error('Failed to fetch friends');
  }

  const ids = [...new Set(friendsResult.friends.map((friend) => friend.uid).filter(Boolean))];
  const now = createSyncTimestamp();

  return {
    favouritesCsv: videos.map((video) => video.url).join(','),
    friendIdsCsv: ids.join(','),
    lastSync: now,
    friendsLastSync: now,
  };
}
