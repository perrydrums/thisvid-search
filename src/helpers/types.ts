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
