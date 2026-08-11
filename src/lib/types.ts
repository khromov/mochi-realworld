/** Shapes returned by the RealWorld API (https://api.realworld.show/api). */

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

/** The full user record, including the API token. Lives in `locals.user`; never sent to the client. */
export interface SessionUser {
  email: string;
  username: string;
  bio: string | null;
  image: string;
  token: string;
}

/** The subset the reference app's root layout exposes to the browser — no token. */
export interface PublicUser {
  username: string;
  email: string;
  image: string;
  bio: string | null;
}

/** RealWorld validation errors: `{ email: ['is invalid', 'has already been taken'] }`. */
export type ApiErrors = Record<string, string[]>;

/** The draft an editor form round-trips. */
export interface ArticleDraft {
  title: string;
  description: string;
  body: string;
  tagList: string[];
}
