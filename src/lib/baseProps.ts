import { getRequestContext } from 'mochi-framework';
import type { PublicUser, SessionUser } from './types';

/** The signed-in user with their API token. Server-only — never return this from serverProps. */
export function currentUser(): SessionUser | null {
  return (getRequestContext().locals.user as SessionUser | null) ?? null;
}

/**
 * Stands in for the reference app's root `+layout.server.js`: every route spreads this into its
 * serverProps so each page can render the nav. The token is deliberately stripped — these props are
 * the only user data allowed to reach the browser.
 *
 * `pathname` rides along because the error page renders outside a request context, so `Nav` takes it
 * as a prop instead of importing the isomorphic `url`.
 */
export function baseProps(): { user: PublicUser | null; pathname: string } {
  const { locals, url } = getRequestContext();
  const user = (locals.user as SessionUser | null) ?? null;

  return {
    pathname: url.pathname,
    user: user && {
      username: user.username,
      email: user.email,
      image: user.image,
      bio: user.bio,
    },
  };
}
