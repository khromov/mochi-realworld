import { getRequestContext } from 'mochi-framework';
import type { PublicUser, SessionUser } from './types';

/** Carries the API token, so it must never be returned from serverProps. */
export function currentUser(): SessionUser | null {
  return (getRequestContext().locals.user as SessionUser | null) ?? null;
}

/** `pathname` rides along because the error page renders outside a request context. */
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
