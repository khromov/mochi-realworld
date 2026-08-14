# `compress()` cannot reach `publicDir` files

Feature request for the Mochi maintainers, found while enabling compression on this app.

**Versions:** `mochi-framework` @ [b23fe7e](https://github.com/khromov/mochi/commit/b23fe7e1dfc1b4f64cc64c1cad3184cac680cc7e) · Bun 1.3.14

## Summary

`compress()` in the `handle` chain compresses pages, `Mochi.api` responses and framework assets under
`/_mochi/*`, but never anything served from `publicDir`. Those files are registered directly into
Bun's route table, so they bypass the middleware chain entirely and there is no option to opt them in.

The practical effect is that the one asset most worth compressing — a vendored stylesheet — is the one
asset that cannot be.

## Reproduction

`sequence(auth, guards, noCache, compress())`, production mode, `Accept-Encoding: br, gzip`:

| Request | Served from | `Content-Encoding` | Bytes |
| --- | --- | --- | --- |
| `/` | page route | `br` | 2,471 |
| `/_mochi/css/MochiCaptcha-….css` | framework asset | `br` | 620 |
| `/conduit-theme.css` | `public/` | *(none)* | **28,850** |
| `/manifest.json` | `public/` | *(none)* | 260 |
| `/robots.txt` | `public/` | *(none)* | 207 |

No `Vary: Accept-Encoding` on the `public/` responses either.

The theme alone would go **28,850 → 5,209 bytes at gzip -9, a 82% saving**, and it is requested on
every cold page load. It is by a wide margin the largest thing this app serves — the entire
compressed HTML document is 2.4 kB by comparison.

## Mechanism

`runtime/publicDir.ts:75-84` hands each file to Bun as a native route value:

```ts
export function registerPublicRoutes(routes: Record<string, BunRouteValue>, files: Map<string, string>): void {
  for (const [urlPath, diskPath] of files) {
    // …
    routes[routeKey] = Bun.file(diskPath);
  }
}
```

`Bun.serve()` answers those directly. Mochi's `fetch` handler never runs, so no `MochiEvent` is
constructed and the `handle` chain — `compress()` included — is never entered. Consistent with that,
`MochiEventKind` has no member for them:

```ts
// runtime/hooks.ts:14
export type MochiEventKind = 'page' | 'api' | 'asset' | 'fallback' | 'error';
//  'asset' — framework static asset: `/_mochi/client/*.js|.css` bundle
```

`'asset'` is documented as the framework bundle kind specifically, not `publicDir`. And `publicDir`
is a bare `publicDir?: string` with no related options, so there is nothing to configure.

This is easy to miss because the [middleware docs](https://mochi.fast/docs/middleware/) say "Static
framework assets also flow through `handle`, so `compress()` covers them." That sentence is accurate —
*framework* assets do — but it reads as though static files in general are covered.

## Why it bites

Serving a vendored third-party stylesheet from `public/` is the obvious thing to do, and the reference
app this port follows does exactly that. It is also precisely the case where compression pays best:
CSS compresses ~5:1, it is render-blocking, and it is on the critical path of a cold load.

Every workaround costs something:

- **Route it through the bundler** with a CSS `import` so it becomes an `/_mochi/import-css/*` asset —
  compressed, but it stops being a plain file at a stable URL, and any relative `url()` inside it
  (icon fonts, images) has to resolve through the bundler.
- **Serve it from `Mochi.api`** — full control, but you hand-roll content type, ETag and caching for
  something the framework already does well.
- **`Mochi.file()`** does not help: it is documented as not supporting middleware either.
- **Compress ahead of time** and serve `.br`/`.gz` — needs content negotiation you cannot express,
  since the chain never runs.

## Suggested fix

Give `publicDir` responses a path through the middleware chain. Roughly in order of preference:

1. **Route them through Mochi's `fetch` handler like any other request**, with a `kind` of their own
   (`'public'`, or fold them into `'asset'`). Then `compress()` — and `noCache`, and user middleware —
   just work, and `event.kind` still lets people skip them cheaply.
2. **A `publicDir` option object**, e.g. `publicDir: { dir: './public', middleware: true }`, so the
   fast native path stays the default and opting in is explicit.
3. **Failing either, compress `publicDir` files at startup** and serve precompressed variants with the
   right `Content-Encoding` and `Vary`. Less flexible, but it closes the gap without changing the
   request path.

A docs note would help regardless: the middleware page's "static assets" sentence is worth making
explicit that it means `/_mochi/*` and not `publicDir`.
