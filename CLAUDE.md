# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A port of [sveltejs/realworld](https://github.com/sveltejs/realworld) to [Mochi](https://mochi.fast).
`README.md` has the full architecture and the reasoning behind every deviation from the reference;
this file is the commands you'll run and the things that will bite you. When writing Mochi framework
code (routes, islands, hydration, actions, request context), the `mochi` skill fetches the relevant
docs — reach for it before guessing at the API.

## Commands

```sh
bun install                      # needs the submodule first (see below)
bun run dev                      # http://localhost:3333, MODE=development
bun run build && bun run start   # production build, then serve it
bun run typecheck                # svelte-check + tsc --noEmit
bun test                         # 11 tests; bunfig.toml keeps them out of vendor/
bun test -t "expired session"    # single test by name
bun test src/index.isolated.test.ts   # single file
bun run clean                    # rm -rf .mochi
```

Two things are invisible in `bun run dev` and need `bun run build && bun run start`:

- **`compress()` is a no-op under `development`**, because the debug bar injects into the HTML after
  the response is built. Compression can only be verified in production mode.
- **Bundle sizes** in the dev debug bar are not production sizes. The debug bar is its own ~161 kB
  entry, and the dev shared chunk differs from the built one. Measure `.mochi/` after a build.

Do not delete `.mochi/` while a dev server is running — it serves content-hashed assets from there,
and you will get a confusing wall of 404s for files that exist a moment later.

## Architecture at a glance

Mochi is a server-first Svelte 5 MPA on Bun: pages render on the server and ship zero JS except for a
handful of interactive **islands**. There is no client-side router. The request flow:

- **`src/index.ts`** — `Mochi.serve()`. Wires the middleware chain (`sequence(auth, guards, noCache,
  compress())`), the HTML shell, error page, fonts, and speculation rules. Start here to understand
  server config.
- **`src/handle.ts`** — the middleware. `auth` validates the session cookie against the upstream API
  and sets `event.locals.user`; `guards` does the auth redirects that would be `redirect()` inside a
  SvelteKit `load` (Mochi's `serverProps` has no redirect escape hatch); `handleError` is the 401
  backstop that clears a session that died mid-request.
- **`src/routes.ts`** — every route, defined inline with `Mochi.page(component, { serverProps,
  actions })`. `serverProps` replaces SvelteKit's `load` (its return is spread straight into
  component props); `actions` replaces form actions. This one file holds all the data loading and all
  the mutations — read it to understand how any page works. Route params keep quirks like the literal
  `@` in `/profile/@bob`.
- **`src/pages/*.svelte`** — one component per route, each wrapping itself in `<Layout>` /
  `<ProfileHeader>`. **`src/lib/`** — shared components and the islands.

Key libs:

- **`src/lib/api.ts`** — the upstream client (`api.realworld.show`). Its status handling is load-
  bearing: a 401 on an authenticated request is *raised* (so `handleError` clears the cookie), but a
  422 or a token-less 401 is *returned as data* so validation and bad-credential messages reach the
  form. `isTokenValid` is cached per token via `MochiCache`.
- **`src/lib/baseProps.ts`** — `baseProps()` is spread into every route's `serverProps` (the
  `+layout.server.js` equivalent); `currentUser()` returns the session *with* the token and must never
  be returned from `serverProps`.
- **`src/lib/session.ts`** — base64 cookie codec, wire-compatible with the reference app.
- **`src/lib/form.ts`** — `formErrors()` digs errors out of `form.data.errors` (Mochi nests `fail()`
  payloads one hop deeper than SvelteKit).

**Islands** (the only client JS) are Svelte components that use `enhance()` and live optimistic
`$state`: `FavoriteButton`, `FollowButton`, `CommentContainer`, `DeleteArticleButton`, `EditorForm`,
and the auth forms. An island receives **plain prop values**, not SvelteKit's deep-reactive `data`,
and cannot read the request context (that throws in the browser) — so anything server-derived,
including validation errors, must be passed *into* it as a prop. Every form still works with JS
disabled: each is a real `<form method="POST">` posting to its route's action. See README's *Hydration
budget* table for the full island-to-route map.

## `mochi-framework` is a git submodule, not an npm package

It is pinned to an unreleased commit at `vendor/mochi`, wired up as
`"mochi-framework": "file:./vendor/mochi/packages/mochi"`. A fresh clone needs the submodule or
`bun install` fails on an unresolvable `file:` dependency:

```sh
git clone --recurse-submodules …          # or, after the fact:
git submodule update --init --depth 1
```

### Moving the pin — delete `bun.lock` first

**This is the trap.** The `file:` path does not change when the submodule moves, so Bun treats the
dependency as unchanged and reuses the dependency list cached in `bun.lock`. Any dependency the new
commit added is silently missed, and the failure surfaces much later as a confusing module-resolution
error from inside the framework (for us: `Cannot find module 'css-tree/parser'`, several steps after
the install that caused it).

`bun install --force` does **not** fix it. Delete the lockfile:

```sh
git -C vendor/mochi fetch --depth 1 origin <sha>
git -C vendor/mochi checkout <sha>
rm -f bun.lock && bun install          # regenerate, do not reuse
git add vendor/mochi bun.lock && git commit
```

Check the regenerated lockfile for incidental drift before committing — patch bumps of `svelte` and
friends ride along, which is usually fine but should be a decision rather than a surprise.

When this version is published to npm, drop the submodule and go back to a normal `^x.y.z` range.

## Things that are deliberate

Check `README.md` before "fixing" these:

- `fonts: { preload: false }` — Mochi preloads at most 8 faces (`FONT_PRELOAD_MAX`, hard-coded). With
  the 13 faces the reference declares, the cap displaced the body font in favour of italics.
- The theme is imported from `src/lib/conduit-theme.css`, **not** served from `public/`. Files in
  `publicDir` go straight into Bun's route table and never reach the middleware, so `compress()`
  cannot touch them. Moving it back to `public/` silently costs ~85% on that asset.
- Shared headers are frozen with hand-written CSS in `src/shell.html` rather than the component's
  `keepElementSelectors`, which paints both snapshots at once and darkens a transparent navbar.
- The error page passes `viewTransitions={false}`. `<ViewTransitions>` reads the request context, and
  the unmatched-route path renders without one — including it takes every 404 down.

## The upstream API resets

`api.realworld.show` wipes accounts periodically, so any credentials in this repo or in a commit
message are short-lived. Register a fresh account at `/register`. A stored session outliving its token
is handled: `handle.ts` validates the token before trusting the cookie.
