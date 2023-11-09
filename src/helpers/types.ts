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

export type Category = {
  name: string;
  image: string;
  slug: string;
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

export type LogParams = {
  id: number;
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
};

export type Modes = {
  [key: string]: string;
};

export type Types = {
  [key: string]: {
    value: string;
    label: string;
  }[];
};
