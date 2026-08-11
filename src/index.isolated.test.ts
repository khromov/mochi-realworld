import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import type { Server } from 'bun';
import { Mochi, noCache, sequence } from 'mochi-framework';
import { auth, guards, handleError } from './handle';
import { routes } from './routes';

describe('realworld app', () => {
  let server: Server<undefined>;
  let outDir: string;
  let base: string;

  beforeAll(async () => {
    outDir = mkdtempSync(path.join(import.meta.dir, '..', '.mochi-realworld-test-'));
    server = await Mochi.serve({
      port: 0,
      development: false,
      logger: { enabled: false },
      outDir,
      htmlShell: './src/shell.html',
      errorPage: './src/Error.svelte',
      trailingSlash: 'never',
      handle: sequence(auth, guards, noCache),
      handleError,
      routes,
    });
    base = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server.stop(true);
    rmSync(outDir, { recursive: true, force: true });
  });

  test('unmatched routes render the error page', async () => {
    const res = await fetch(`${base}/nope`);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('Not found!');
  });

  test('/profile redirects an anonymous visitor to /login', async () => {
    const res = await fetch(`${base}/profile`, { redirect: 'manual' });
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('/login');
  });

  test('/settings redirects an anonymous visitor to /login', async () => {
    const res = await fetch(`${base}/settings`, { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/login');
  });

  test('/editor redirects an anonymous visitor to /login', async () => {
    const res = await fetch(`${base}/editor`, { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/login');
  });

  test('a profile URL without the leading @ is a 404', async () => {
    const res = await fetch(`${base}/profile/bob`);
    expect(res.status).toBe(404);
  });

  test('pages opt out of caching and ship speculation rules', async () => {
    const res = await fetch(`${base}/login`);
    // Every page varies by the session cookie, and speculation rules fetch pages ahead of a click.
    expect(res.headers.get('cache-control')).toBe('no-cache');

    const html = await res.text();
    const rules = html.match(/<script type="speculationrules">([\s\S]*?)<\/script>/);
    expect(rules).not.toBeNull();
    expect(Object.keys(JSON.parse(rules![1]!))).toEqual(['prefetch', 'prerender']);
    // Cross-document view transitions are opted into on every page.
    expect(html).toContain('@view-transition');
  });

  test('the sign-in page renders its form', async () => {
    const res = await fetch(`${base}/login`);
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain('Sign In');
    expect(html).toContain('name="email"');
    expect(html).toContain('navbar-brand');
  });

  // The upstream API wipes accounts periodically, so a stored cookie outliving its token is routine.
  // `?tab=feed` used to 500: the auth-only endpoint answered with an error body carrying no
  // `articles` key, and destructuring it threw.
  test('an expired session is cleared rather than 500ing', async () => {
    const dead = btoa(
      JSON.stringify({ email: 'x@example.com', token: 'token_dead', username: 'ghost' }),
    );

    const res = await fetch(`${base}/?tab=feed`, {
      headers: { cookie: `jwt=${dead}` },
      redirect: 'manual',
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');

    const html = await res.text();
    expect(html).not.toContain('Something went wrong');
    expect(html).toContain('Global Feed');
  });

  test('a wiped account is signed out on any page, not just authenticated ones', async () => {
    const dead = btoa(
      JSON.stringify({ email: 'x@example.com', token: 'token_dead', username: 'ghost' }),
    );

    // The public endpoints accept a dead token and answer 200, so nothing here rejects the session —
    // it has to be validated up front or the nav renders a username for an account that is gone.
    const res = await fetch(base, { headers: { cookie: `jwt=${dead}` } });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');

    const html = await res.text();
    expect(html).not.toContain('>ghost<');
    expect(html).toContain('Sign up');
  });

  test('?tab=feed signed out falls back to the global feed', async () => {
    const res = await fetch(`${base}/?tab=feed`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Global Feed');
  });

  // Hits the live RealWorld API, which this app is a client for.
  test('the home page renders the global feed', async () => {
    const res = await fetch(base);
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain('<title>Conduit</title>');
    expect(html).toContain('Popular Tags');
    expect(html).toContain('article-preview');
  });
});
