import { error } from 'mochi-framework';

const base = 'https://api.realworld.show/api';

interface SendOptions {
  method: string;
  path: string;
  data?: unknown;
  token?: string;
}

/**
 * Port of the reference app's `src/lib/api.js`.
 *
 * Note the 422 special case: RealWorld returns validation failures as `422 { errors: {...} }`, and
 * callers want that body rather than an exception, so 422 is treated as a success here. Any other
 * non-ok status becomes an HTTP error and renders the error page.
 *
 * 401 is included alongside it, which the reference omits, but only when the request carried no
 * token. The two 401s mean different things:
 *
 *   - **No token sent** — a sign-in attempt failed: `401 { errors: { credentials: ['invalid'] } }`.
 *     Return it so the form can render the message inline. (Upstream this throws to the error page,
 *     making the login action's `if (body.errors)` branch unreachable.)
 *   - **Token sent** — the session is dead: `401 { errors: { token: ['is missing'] } }`. Returning
 *     that as data hands callers a body with no `articles` / `article` key, which then blows up on
 *     destructuring. It is an expired session, so raise it and let `handleError` clear the cookie.
 *
 * The upstream API wipes accounts periodically, so a stored cookie outliving its token is routine
 * rather than exceptional.
 */
async function send<T>({ method, path, data, token }: SendOptions): Promise<T> {
  const headers: Record<string, string> = {};
  const opts: RequestInit = { method, headers };

  if (data) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(data);
  }

  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  const res = await fetch(`${base}/${path}`, opts);

  if (res.status === 401 && token) {
    error(401, 'Session expired');
  }

  if (res.ok || res.status === 422 || res.status === 401) {
    const text = await res.text();
    return (text ? JSON.parse(text) : {}) as T;
  }

  error(res.status, res.statusText || 'Request failed');
}

export function get<T>(path: string, token?: string): Promise<T> {
  return send<T>({ method: 'GET', path, token });
}

export function del<T>(path: string, token?: string): Promise<T> {
  return send<T>({ method: 'DELETE', path, token });
}

export function post<T>(path: string, data: unknown, token?: string): Promise<T> {
  return send<T>({ method: 'POST', path, data, token });
}

export function put<T>(path: string, data: unknown, token?: string): Promise<T> {
  return send<T>({ method: 'PUT', path, data, token });
}
