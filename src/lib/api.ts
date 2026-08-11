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
 * 401 is included alongside it, which the reference omits. A wrong password answers
 * `401 { errors: { credentials: ['invalid'] } }`, so upstream it throws to the error page and the
 * `if (body.errors)` branch in the login action is unreachable. Letting 401 bodies through is what
 * makes inline credential errors work.
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
