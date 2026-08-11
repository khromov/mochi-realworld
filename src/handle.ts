import type { Handle, HandleError } from 'mochi-framework';
import { isTokenValid } from './lib/api';
import { decodeSession, SESSION_COOKIE } from './lib/session';

const CLEAR_SESSION = `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) {
    return undefined;
  }

  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) {
      continue;
    }
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }

  return undefined;
}

/** Reads the cookie header directly because the unmatched-route path renders without a request context. */
export const auth: Handle = async ({ event, resolve }) => {
  if (event.kind === 'asset') {
    return resolve(event);
  }

  const session = decodeSession(readCookie(event.request, SESSION_COOKIE));

  // Decoding proves the cookie is well-formed, not that the token still works.
  const live = session !== null && (await isTokenValid(session.token));
  event.locals.user = live ? session : null;

  const response = await resolve(event);

  if (session !== null && !live) {
    response.headers.append('set-cookie', CLEAR_SESSION);
  }

  return response;
};

/**
 * These guards live in `load` upstream, but `serverProps` has no redirect escape hatch — its return
 * value is spread straight into component props — so they run here, on GET/HEAD only.
 */
export const guards: Handle = ({ event, resolve }) => {
  if (event.kind !== 'page') {
    return resolve(event);
  }

  const { method } = event.request;
  if (method !== 'GET' && method !== 'HEAD') {
    return resolve(event);
  }

  const user = event.locals.user;
  const path = event.url.pathname;

  if (user && (path === '/login' || path === '/register')) {
    return new Response(null, { status: 307, headers: { location: '/' } });
  }

  if (!user && (path === '/settings' || path === '/editor' || path.startsWith('/editor/'))) {
    return new Response(null, { status: 302, headers: { location: '/login' } });
  }

  return resolve(event);
};

/** Backstop for a token that dies inside the validation cache window: drop the cookie and re-render signed out. */
export const handleError: HandleError = ({ status, event }) => {
  if (status !== 401) {
    return;
  }

  const { method } = event.request;
  if (method !== 'GET' && method !== 'HEAD') {
    return { status, message: 'Your session has expired — please sign in again.' };
  }

  return new Response(null, {
    status: 303,
    headers: {
      location: `${event.url.pathname}${event.url.search}`,
      'set-cookie': CLEAR_SESSION,
    },
  });
};
