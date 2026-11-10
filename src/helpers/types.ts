export type Video = {
  title: string;
  url: string;
  isPrivate: boolean;
  duration: string;
  avatar: string;
  views: number;
  date: string;
  relevance: number;
  page: number;
  /** 0–100 from the listing tile's rating percent, when the scraper provided it. */
  rating?: number | null;
};

export type VideoUploader = {
  username: string;
  uid: string;
};

/** Metadata from `GET /videoDetails`. `category` is the first category, kept for older callers. */
export type VideoDetails = {
  category: string;
  categories: string[];
  tags: string[];
  uploader: VideoUploader;
  /** 0–100, converted from the page's 5-star rating. Null when the page has none. */
  rating: number | null;
};

/** `GET /memberFeed`: the three video sections on a member profile page. */
export type MemberFeed = {
  success: boolean;
  uid: string;
  username: string;
  publicVideos: Video[];
  privateVideos: Video[];
  favouriteVideos: Video[];
};

export type TasteTag = {
  name: string;
  count: number;
  /** `ln(1 + count)` — how strongly this tag should pull recommendations. */
  weight: number;
};

export type TasteCategory = {
  name: string;
  slug: string;
  count: number;
  /** `count / max(count)` across categories in the analysed favourites. */
  affinity: number;
};

export type TasteUploader = {
  username: string;
  uid: string;
  count: number;
  /** `ln(1 + count) / ln(1 + max(count))` across uploaders. */
  affinity: number;
};

export type TasteOrientation = 'gay' | 'straight' | 'mixed';

/** Aggregated from Analyse (`tvass-analyse-users`). Required before recommendations can be scored. */
export type TasteProfile = {
  totalVideos: number;
  tags: TasteTag[];
  categories: TasteCategory[];
  uploaders: TasteUploader[];
  /** Tags and categories that are common, but not so common they just reproduce the whole site. */
  distinctiveTags: TasteTag[];
  distinctiveCategories: TasteCategory[];
  orientation: TasteOrientation;
};

export type RecommendedVideo = Video & {
  score: number;
  reasons: string[];
  tags: string[];
  categories: string[];
  uploader?: VideoUploader;
};

export type VideoResponse = {
  success: boolean;
  videos: Video[];
};

export type Category = {
  name: string;
  image: string;
  slug: string;
  orientation: 'straight' | 'gay';
};

export type Preferences = {
  [key: string]: any;
};

export type Mood = {
  name: string;
  preferences: Preferences;
};

export type Friend = {
  uid: string;
  username: string;
  avatar: string;
  url: string;
};

export type FriendsResponse = {
  success: boolean;
  pageAmount: number;
  friends: Friend[];
};

export type LogParams = {
  id: number;
  /** Present after insert — required to PATCH result counts under tightened RLS. */
  resultUpdateToken?: string | null;
  mode: string;
  advanced: boolean;
  type: string;
  tags: string[];
  pageAmount: number;
  quick: boolean;
  duration: number;
  primaryTag: string;
  category: string;
  userId?: string;
  friendId?: string;
  resultCount: number;
  visitorId: string;
  visitorName: string;
  ipAddress?: string;
  ipLocation?: string;
};

/** Payload for `log()` before the row exists (no `id` / `resultUpdateToken`). */
export type LogInsertParams = Omit<LogParams, 'id' | 'resultUpdateToken'>;

export type Modes = {
  [key: string]: string;
};

export type Types = {
  [key: string]: {
    value: string;
    label: string;
  }[];
};
