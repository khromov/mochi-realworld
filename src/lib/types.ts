export interface Author {
  username: string;
  bio: string | null;
  image: string;
  following: boolean;
}

export interface Article {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: string;
  updatedAt: string;
  favorited: boolean;
  favoritesCount: number;
  author: Author;
}

export interface Comment {
  id: number;
  createdAt: string;
  updatedAt: string;
  body: string;
  author: Author;
}

export interface Profile {
  username: string;
  bio: string | null;
  image: string;
  following: boolean;
}

/** Carries the API token, so it stays in `locals.user` and never reaches the client. */
export interface SessionUser {
  email: string;
  username: string;
  bio: string | null;
  image: string;
  token: string;
}

export interface PublicUser {
  username: string;
  email: string;
  image: string;
  bio: string | null;
}

export type ApiErrors = Record<string, string[]>;

export interface ArticleDraft {
  title: string;
  description: string;
  body: string;
  tagList: string[];
}
