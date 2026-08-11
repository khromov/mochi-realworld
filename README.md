# ![RealWorld Example App](https://raw.githubusercontent.com/gothinkster/realworld/main/media/realworld.png)

> ### [Mochi](https://mochi.fast) codebase containing real world examples (CRUD, auth, advanced patterns, etc) that adheres to the [RealWorld](https://github.com/gothinkster/realworld) spec and API.

A port of [sveltejs/realworld](https://github.com/sveltejs/realworld) from SvelteKit to
[Mochi](https://mochi.fast), a server-first Svelte 5 metaframework on Bun with islands-based
selective hydration.

Every component is a 1:1 port — same markup, same class names. What changed is how data is loaded
(`serverProps` instead of `load`) and how interactivity is delivered (islands instead of whole-page
hydration).

## Running locally

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

The Bootstrap theme is vendored to `public/main.css`. The reference links
`//demo.productionready.io/main.css`, which now 404s — the upstream demo is unstyled because of it.
