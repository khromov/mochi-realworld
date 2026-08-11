import type { Handle, HandleError } from 'mochi-framework';
import { decodeSession, SESSION_COOKIE } from './lib/session';

/** Read one cookie straight off the request headers. */
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

/**
 * Port of the reference app's `hooks.server.js`. Parses the cookie header directly rather than going
 * through `getRequestContext()`, because the unmatched-route path renders without a request context.
 */
export const auth: Handle = ({ event, resolve }) => {
  if (event.kind === 'asset') {
    return resolve(event);
  }

  event.locals.user = decodeSession(readCookie(event.request, SESSION_COOKIE));

  return resolve(event);
};

/**
 * The reference app puts these guards in its `load` functions. Mochi's `serverProps` has no redirect
 * escape hatch (its return value is spread straight into component props), so they live here instead.
 *
 * Only GET/HEAD is guarded: POSTs still reach their actions, which do their own `error(401)` exactly
 * as the reference does.
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

  // Signed in? The auth pages bounce home. (307, matching the reference.)
  if (user && (path === '/login' || path === '/register')) {
    return new Response(null, { status: 307, headers: { location: '/' } });
  }

  // Signed out? The authoring pages bounce to login. (302, matching the reference.)
  if (!user && (path === '/settings' || path === '/editor' || path.startsWith('/editor/'))) {
    return new Response(null, { status: 302, headers: { location: '/login' } });
  }

  return resolve(event);
};

/**
 * The upstream API wipes accounts periodically, so a stored session cookie routinely outlives the
 * token inside it. `api.ts` raises a 401 when an authenticated call is rejected; drop the dead cookie
 * rather than leaving the user half-signed-in, where every authenticated page 500s.
 *
 * On a GET, re-request the same URL so the page simply renders signed out. Anything else is a form
 * submission, so return a message the error page can show — the next GET clears the cookie.
 */
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
      'set-cookie': `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    },
  });
};
