# ![RealWorld Example App](https://raw.githubusercontent.com/gothinkster/realworld/main/media/realworld.png)

> ### [Mochi](https://mochi.fast) codebase containing real world examples (CRUD, auth, advanced patterns, etc) that adheres to the [RealWorld](https://github.com/gothinkster/realworld) spec and API.

A port of [sveltejs/realworld](https://github.com/sveltejs/realworld) from SvelteKit to
[Mochi](https://mochi.fast), a server-first Svelte 5 metaframework on Bun with islands-based
selective hydration.

Every component is a 1:1 port — same markup, same class names. What changed is how data is loaded
(`serverProps` instead of `load`) and how interactivity is delivered (islands instead of whole-page
hydration).

## Running locally

`mochi-framework` is pinned to an unreleased commit, vendored as a git submodule under `vendor/mochi`
and referenced with `"mochi-framework": "file:./vendor/mochi/packages/mochi"`. Clone with submodules,
or the install will fail with an unresolvable `file:` dependency:

```sh
git clone --recurse-submodules https://github.com/khromov/mochi-realworld.git
# already cloned?
git submodule update --init --depth 1
```

The framework ships TypeScript source with no build step, so nothing needs compiling in `vendor/`.
To move to a different commit, check it out inside the submodule and commit the new pointer:

```sh
git -C vendor/mochi fetch --depth 1 origin <sha> && git -C vendor/mochi checkout <sha>
bun install
```

When the version this pins is published to npm, drop the submodule and go back to a normal
`"mochi-framework": "^x.y.z"` range.

```sh
bun install
bun run dev      # http://localhost:3333
```

```sh
bun run build && bun run start   # production
bun run typecheck
bun test
```

## How it maps to SvelteKit

| SvelteKit | Mochi |
| --- | --- |
| `src/routes/**/+page.svelte` | components in `src/pages/`, wired up in `src/routes.ts` |
| `+page.server.js` `load` | `serverProps` on `Mochi.page()` |
| `+page.server.js` `actions` | `actions` on `Mochi.page()` |
| `+layout.svelte` | `<Layout>` / `<ProfileHeader>` wrappers each page imports |
| `+layout.server.js` | `baseProps()` spread into every route's `serverProps` |
| `hooks.server.js` | `handle` middleware composed with `sequence()` |
| `+error.svelte` | the `errorPage` option on `Mochi.serve()` |
| `page.data.user` | an explicit `user` prop threaded down |
| `use:enhance` | `{@attach enhance(...)}` inside a hydrated island |

Mochi has no client-side router, so auth guards that were `redirect()` calls inside `load` live in
`src/handle.ts` instead — `serverProps` has no redirect escape hatch, since its return value is
spread straight into component props.

## Hydration budget

Pages render on the server and ship zero JavaScript. Only these controls are islands:

| Island | Route(s) | Why it needs JS |
| --- | --- | --- |
| `FavoriteButton` | `/`, `/profile/@:user`, `.../favorites` | optimistic favorite toggle + count |
| `FollowButton` | `/profile/@:user`, `.../favorites` | optimistic follow/unfollow |
| `CommentContainer` | `/article/:slug` | insert/remove comments in place |
| `DeleteArticleButton` | `/article/:slug` (author only) | enhance + redirect on delete |
| `EditorForm` | `/editor`, `/editor/:slug` | tag chips (`$state`, transition, flip) |
| `LoginForm` / `RegisterForm` / `SettingsForm` | `/login`, `/register`, `/settings` | enhance + inline errors |

Everything else — nav, article list, article body, pagination, tag cloud, profile banner — is static
HTML. `bun run build` prints the per-route island count and bundle size.

Every form still works with JavaScript disabled: each one is a real `<form method="POST">` whose
action runs identically either way. Validation errors reach the no-JS path because the page reads
Mochi's `form` prop and passes the errors *into* the island as a prop — an island cannot read the
request context itself, since that throws in the browser.

## Instant navigations

Mochi is an MPA — every navigation is a real page load — so the app leans on two browser features
that need no client-side router and ship no JavaScript:

- **View Transitions.** `<ViewTransitions type="fade" />` in `src/lib/Layout.svelte` opts every page
  into the cross-document [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API),
  so navigations crossfade. Headers that two pages render identically are held still instead — the
  navbar, the green home banner (shared by every `?tab=` / `?tag=` view) and the profile header
  (shared by a profile's Articles and Favorites tabs) — since crossfading a header against an
  identical copy of itself just reads as a flicker. The article banner is deliberately left animating,
  because its `<h1>` is the page's actual content. This is hand-written CSS in `src/shell.html` rather
  than the component's `keepElementSelectors`, which paints both snapshots at once and visibly darkens
  a transparent element. The error page opts out entirely, because `<ViewTransitions>` reads the
  request context and the unmatched-route path renders without one.
- **Speculation Rules.** `src/speculationRules.ts` is passed to `Mochi.serve({ speculationRules })`,
  which injects the `<script type="speculationrules">` block into every page's `<head>`. Document
  rules mean the browser speculatively loads whatever link the user is about to click with no
  per-page bookkeeping. `prefetch` is `moderate` (on hover) across all same-origin links except
  `/_*`; `prerender` is `conservative` (on pointerdown) and scoped to the read-only reading surfaces
  — `/`, `/article/*`, `/profile/*`. Prerendering runs a page's `serverProps` for real, so keeping it
  conservative avoids firing speculative upstream API calls on hover.

`src/shell.html` also sets `html { scrollbar-gutter: stable }`. RealWorld's `.container` is a fixed
1140px centred with auto margins, so a page that scrolls and a page that doesn't differ in viewport
width by the scrollbar — sliding the navbar 7.5px sideways between routes. Barely noticeable on a
plain navigation, but the view transition snapshots the navbar and turns it into a visible jump.

Every mutation in the app is a POST, and speculation only ever issues GETs from `<a href>`, so no
rule here can trigger a side effect. Because every page varies by the session cookie, `noCache` is in
the middleware chain so responses revalidate rather than being served from a heuristic cache.

The chain ends in `compress()`, innermost so it sees the body the rest of it produced. It negotiates
brotli or gzip from `Accept-Encoding` and is a no-op under `development`, since the debug bar injects
itself into the HTML after the response is built. Measured on `/` in production: 10,416 bytes → 2,419
brotli / 2,505 gzip.

It does **not** cover `public/`. Mochi registers those files straight into Bun's route table as
`Bun.file(diskPath)`, so they never enter the middleware chain and there is no option to opt them in.
Which is why the theme is not in `public/`: it lives at `src/lib/conduit-theme.css` and is pulled in
with a side-effect `import` from `Layout.svelte`, so the bundler owns it and the middleware can reach
it. Bun minifies it on the way through, and the result compresses:

| | bytes |
| --- | --- |
| source file | 28,850 |
| bundled (minified) | 22,755 |
| served, gzip | 4,196 |
| served, brotli | **4,461** |

Roughly an 85% saving against serving it from `public/`, for a one-line import. What remains in
`public/` is only what has to be at a fixed URL — `favicon.ico`, `manifest.json`, `robots.txt`,
`logo-256.png`, and the avatar placeholder.

## Deviations from the reference

Forced by the framework:

- **`PreloadingIndicator` is dropped.** It renders only during a SvelteKit client-side navigation,
  which Mochi does not have.
- **No `invalidateAll()`.** After a comment is created or deleted, the action returns the affected
  comment and the island updates its own state.
- **Logout redirects explicitly** (`redirect(303, '/login')`) rather than relying on invalidation
  plus a load guard.
- **Optimistic toggles use local `$state`.** SvelteKit's `data` is a deeply reactive proxy that the
  reference mutates in place; island props arrive as plain values.
- Islands are wrapped in `<mochi-hydratable-island>` (`display: contents`, so layout is unaffected).

Upstream bugs fixed along the way:

- **Settings validation errors never displayed** — the action returned `fail(400, body.errors)` while
  the template read `form.errors`, one level too deep.
- **Settings could never be saved.** The reference always sends `password: ''` when the field is
  blank, which the API rejects; the error was invisible because of the bug above. A blank password is
  now omitted.
- **A wrong password rendered the error page** instead of an inline message. `api.js` only lets 422
  bodies through, but the API answers `401 { errors: { credentials: ['invalid'] } }`, so the login
  action's `if (body.errors)` branch was unreachable. 401 bodies now pass through too.
- **Editing an article showed the error page** while creating one showed inline errors. Both use
  `fail()` now.
- **`toggleFavorite` did not await the API call** before redirecting, racing the reload.
- **`toggleFavorite` / `deleteArticle` redirected with 307**, which preserves the method — without
  JavaScript the browser re-POSTed to a page with no matching action and got a 405. Both use 303.

The reference's own quirks are preserved: profile pages render no pagination (its `get_articles`
returns `pages` while both callers destructure `page`), and `/profile/@bob` keeps the literal `@`.

- **An expired session left the app lying about who you were.** The upstream API wipes accounts
  periodically, so a stored cookie routinely outlives the token inside it — and its public endpoints
  (`articles`, `tags`, `profiles/:user`) accept a dead token and answer 200 anyway. Nothing rejected
  the session while browsing, so the nav kept rendering a username for an account that no longer
  existed, and only the next authenticated action failed. `src/handle.ts` now validates the token
  against `GET /user` before trusting the cookie, cached per token via `MochiCache` so it costs at
  most one upstream call a minute per signed-in visitor, and drops the cookie when it comes back
  dead. A `handleError` hook remains the backstop for a token that dies mid-window.
- **`?tab=feed` 500'd when signed out.** The auth-only endpoint returns an error body with no
  `articles` key, and destructuring it threw. It falls back to the global feed.
- **Avatars were broken for anyone without a profile picture.** The API returns `image: null` for
  users who never set one, and the reference renders `src={author.image}` directly in four of the
  five places it shows an avatar — only `CommentInput` uses the `placeholder` constant it exports.
  All five use the fallback now.

Assets follow the reference, except where the URL it uses is dead:

| Asset | Reference | Here |
| --- | --- | --- |
| Theme | `/conduit-theme.css`, self-hosted | the same file, bundled from `src/lib/conduit-theme.css` |
| Ionicons | `//code.ionicframework.com/ionicons/2.0.1/…` | same CDN |
| Avatar placeholder | `static.productionready.io/…/smiley-cyrus.jpg` — **404** | `public/smiley-cyrus.jpeg` |
| Fonts | `//fonts.googleapis.com/css?family=…` | `@fontsource`, imported from `src/lib/fonts.ts` |

The theme is worth a note. The reference used to link `//demo.productionready.io/main.css`, which now
404s. It has since replaced that with a self-hosted `conduit-theme.css`, hand-reduced to "only …
classes actually used in this codebase" — **28.8 kB against the 104.9 kB** of the original
Bootstrap-based file. This app serves that same file, and renders the same as the live reference does
today: no green banner, outlined rather than filled tag pills.

That is a real change in look, not a regression here — the reference redesigned when its CDN died.
One difference remains: the reference has since swapped its text wordmark for an SVG logo, where this
port still renders `conduit` as text. That is app-source drift past commit `ec8552f`, which is what
this port targets.

`src/lib/fonts.ts` declares **exactly the 13 faces** the reference's Google Fonts URL requests —
Titillium Web 700, Source Serif Pro 400/700, Merriweather Sans 400/700, and Source Sans Pro
300/400/600/700 plus all four italics. Same families, same weights, same italics, self-hosted.

`fonts: { preload: false }` on `Mochi.serve()` is what makes that parity hold at request time. Mochi
otherwise emits `<link rel="preload">` for extracted faces up to a hard cap of 8 per page
(`FONT_PRELOAD_MAX`, not configurable — `fonts.preload` is only on/off). With 13 faces that fetches 8
eagerly where the reference fetches only what it renders, and the cap picks badly, dropping Source
Sans 400 — the body face — in favour of italics. Preloading off, the browser fetches on use, which is
what a Google Fonts `<link>` does.

Measured against a reconstruction of the reference (same markup and theme, Google Fonts `<link>`
swapped in), the two download an identical set:

| | reference | here |
| --- | --- | --- |
| faces declared | 13 | 13 |
| downloaded on `/` | 4 | 4 |
| downloaded on `/article/:slug` | 5 | 5 |
| bundled CSS | 14.6 kB | **7.30 kB** |
| legacy `.woff` duplicates | n/a | none |

Crawlers are blocked, where the reference explicitly allowed them (its `robots.txt` is `Disallow:`
with an empty value). This is a framework-port demo rather than the canonical RealWorld app, and
every page render costs calls to the shared public API at `api.realworld.show`. `public/robots.txt`
sends `Disallow: /` and `src/shell.html` adds `<meta name="robots" content="noindex, nofollow">` for
bots that ignore it. Note the two only partly overlap: a crawler that honours `Disallow: /` never
fetches the page, so it never sees the meta tag — and `Disallow` alone doesn't guarantee absence from
results, since a URL can still be indexed from inbound links. Blocking the fetches is the priority
here because of the upstream API cost; if staying out of search results ever matters more, the right
config is the inverse — allow crawling and rely on the `noindex` tag.
