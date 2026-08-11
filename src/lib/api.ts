import { MochiCache, error } from 'mochi-framework';

const base = 'https://api.realworld.show/api';

const sessionCache = new MochiCache({
  minTimeToStale: 60_000,
  maxTimeToLive: 300_000,
});

/**
 * The public endpoints accept an invalid token and answer 200 regardless, so `GET /user` is the only
 * way to tell a dead session from a live one.
 */
export function isTokenValid(token: string): Promise<boolean> {
  return sessionCache.fetch(`session:${token}`, async () => {
    const res = await fetch(`${base}/user`, { headers: { Authorization: `Token ${token}` } });
    return res.ok;
  });
}

interface SendOptions {
  method: string;
  path: string;
  data?: unknown;
  token?: string;
}

/**
 * A 422, or a 401 on a request that carried no token, is returned as data so validation and
 * bad-credential messages reach the form; a 401 on an authenticated request means the session died
 * and is raised instead, so `handleError` can clear the cookie.
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
