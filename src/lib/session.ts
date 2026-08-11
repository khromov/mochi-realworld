import type { SessionUser } from './types';

export const SESSION_COOKIE = 'jwt';

/**
 * The reference app stores the whole user record — API token included — as base64 in a `jwt` cookie.
 * Kept as-is so cookies stay interchangeable with the original app.
 */
export function encodeSession(user: SessionUser): string {
  return btoa(JSON.stringify(user));
}

/** Decode the session cookie. Returns null for a missing or malformed value rather than throwing. */
export function decodeSession(value: string | undefined): SessionUser | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(atob(value)) as SessionUser;
    return typeof parsed?.token === 'string' ? parsed : null;
  } catch {
    return null;
  }
}
