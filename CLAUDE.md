# Working in this repo

A port of [sveltejs/realworld](https://github.com/sveltejs/realworld) to [Mochi](https://mochi.fast).
See `README.md` for the architecture. This file is the things that will bite you.

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

## Verifying changes

```sh
bun run typecheck     # svelte-check + tsc
bun test              # 11 tests; bunfig.toml keeps them out of vendor/
bun run build
```

Two things are invisible in `bun run dev` and need `bun run build && bun run start`:

- **`compress()` is a no-op under `development`**, because the debug bar injects into the HTML after
  the response is built. Compression can only be verified in production mode.
- **Bundle sizes** in the dev debug bar are not production sizes. The debug bar is its own ~161 kB
  entry, and the dev shared chunk differs from the built one. Measure `.mochi/` after a build.

Do not delete `.mochi/` while a dev server is running — it serves content-hashed assets from there,
and you will get a confusing wall of 404s for files that exist a moment later.

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
