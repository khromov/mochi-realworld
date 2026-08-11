import type { SessionUser } from './types';

export const SESSION_COOKIE = 'jwt';

/** Base64 of the whole user record, API token included, kept as-is so cookies interoperate with the reference app. */
export function encodeSession(user: SessionUser): string {
  return btoa(JSON.stringify(user));
}

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
