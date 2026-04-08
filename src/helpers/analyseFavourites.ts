import cheerio from 'cheerio';

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

async function fetchMemberAvatar(memberNumericId: string): Promise<string> {
  const id = parseInt(memberNumericId, 10);
  if (!id) return '';
  const userResponse = await fetch(`/members/${id}/`);
  const userBody = await userResponse.text();
  const $ = cheerio.load(userBody);
  return $('.avatar img').first().attr('src') || '';
}

async function getAvatarForUploader(
  users: AnalyseFavouriteUsers,
  username: string,
  memberNumericId: string,
): Promise<string> {
  const cached = users[username]?.avatar;
  if (cached) return cached;
  return fetchMemberAvatar(memberNumericId);
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

/**
 * Scrape one favourites listing page and merge video detail into `users` (mutates).
 * Same HTML logic as the Analyse page.
 */
export async function analyseFavouritesListingPage(
  uid: string,
  page: number,
  users: AnalyseFavouriteUsers,
): Promise<void> {
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
        const proxyPath = href.split('/').slice(3).join('/');
        const res = await fetch(proxyPath);
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
        return { video, memberId: userID };
      } catch {
        return null;
      }
    }),
  );

  for (const row of rows) {
    if (!row) continue;
    const avatar = await getAvatarForUploader(users, row.video.username, row.memberId);
    mergeVideo(users, row.video, avatar);
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

/**
 * Full favourite-videos analysis: all pages, sequentially (safe merges).
 * Replaces the former inline logic on the Analyse page.
 */
export async function runAnalyseFavourites(
  uid: string,
  options?: RunAnalyseFavouritesOptions,
): Promise<AnalyseFavouriteUsers> {
  const pageLimit = await getFavouriteListingPageLimit(uid);
  const users: AnalyseFavouriteUsers = {};

  const CHUNK_SIZE = 5;
  let completedPages = 0;

  const processPage = async (page: number) => {
    await analyseFavouritesListingPage(uid, page, users);
    completedPages++;
    options?.onProgress?.(completedPages, pageLimit);
  };

  for (let i = 1; i <= pageLimit; i += CHUNK_SIZE) {
    const chunk = [];
    for (let j = i; j < i + CHUNK_SIZE && j <= pageLimit; j++) {
      chunk.push(processPage(j));
    }
    await Promise.all(chunk);
  }

  return users;
}
