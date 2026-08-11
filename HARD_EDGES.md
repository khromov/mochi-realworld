# Hard edges porting SvelteKit → Mochi

Feedback for the Mochi maintainers, gathered while porting
[sveltejs/realworld](https://github.com/sveltejs/realworld) (Conduit) to Mochi in this repo. A full
app: 10 routes, 8 form actions, cookie auth, markdown rendering, 8 islands.

**Versions:** `mochi-framework` 0.9.1 · Svelte 5.56.8 · Bun 1.3.14

Ordered by how quietly each one fails. Everything below was reproduced against a running app; source
references were read in `node_modules/mochi-framework/src`. Where something is inferred rather than
directly observed, it says so.

---

## 1. `serverProps` cannot redirect, and fails silently

**Severity: high.** This has no workaround inside `serverProps`, and nothing tells you.

`redirect()` returns a plain `MochiFormRedirect` object rather than throwing:

```ts
// runtime/forms.ts:21
export function redirect(status, location): MochiFormRedirect {
  return { __mochiFormRedirect: true, status, location };
}
```

Only the POST/action path checks for it (`Mochi.ts:869-878`). The GET path spreads whatever
`serverProps` returned straight into component props:

```ts
// Mochi.ts:654
const baseProps = isServerPropsResolver(liveServerProps) ? ((await liveServerProps(req, ctx.params)) ?? {}) : (liveServerProps ?? {});
```

So this renders the page with props `{__mochiFormRedirect, status, location}` — HTTP 200, no warning:

```ts
serverProps: () => {
  if (!currentUser()) return redirect(302, '/login'); // silently does nothing
  return { ... };
};
```

The only escape from `serverProps` is a throw, and `error()` routes to the error page
(`runtime/errors.ts:91-94`), never a `Location` header.

**Why it bites porters:** guard-redirect-inside-`load` is completely standard SvelteKit. The
RealWorld app has five of them (`/login`, `/register` when signed in; `/settings`, `/editor`,
`/editor/:slug` when signed out). All had to move into `handle` middleware, which also means the
guard list lives far away from the route it guards.

**Suggested fix:** have the GET path check `isFormRedirect` on the `serverProps` result, exactly as
the action path already does. Failing that, throw a developer error when a returned prop object
carries `__mochiFormRedirect`, so it can't silently no-op.

---

## 2. Island `children` render on the server, then vanish on hydration

**Severity: high.** Content disappears from the page, and in production nothing says why.

Reproduced with a minimal probe:

```svelte
<!-- Wrapper.svelte -->
<script lang="ts">
  let { label, children } = $props();
  let n = $state(0);
</script>
<button onclick={() => n++}>clicked {n}</button>
<div class="slot">{@render children?.()}</div>

<!-- page -->
<Wrapper mochi:hydrate label="hello">
  <p id="slotted">SLOTTED CONTENT</p>
</Wrapper>
```

SSR emits the children correctly:

```html
<div class="slot"><p id="slotted">SLOTTED CONTENT</p><!----></div>
```

After hydration, they are gone — `document.getElementById('slotted')` is `null`, `.slot` is
`<!---->`, and the serialized props are `[{"label":1},"hello"]` with no children (correct — snippets
are functions, and functions are documented as unserializable). The island itself still works; the
counter increments. The only signal is a dev-mode Svelte `hydration_mismatch` warning. Svelte strips
those in production, so this becomes **silent content loss**.

**Why it bites:** wrapping a hydrated component around markup is a completely natural thing to
reach for, and the SSR pass rewards you by rendering it. In this port it means `Layout.svelte` can
never become an island — a constraint worth stating loudly, since "make the layout interactive" is a
common instinct.

**Suggested fix:** make it a compile error to pass children/snippets to a `mochi:hydrate*` island —
the preprocessor already knows both the directive and the call-site children
(`svelteAstPreprocess.ts:329-334`). A compile error here would be strictly better than a runtime
mismatch, since there is no configuration under which this can work.

---

## 3. The error page renders outside a request context

**Severity: medium-high.** It only breaks on 404 — the most common error.

Every render path wraps in `requestContext.run(...)` (`Mochi.ts:714, 943, 1179, 1325`) **except** the
unmatched-route fallback in `composedFetch` (`Mochi.ts:1513+`), which calls `renderErrorResponse`
bare. So in `errorPage`, touching `url`, `params`, `locals`, `cookies`, or `getRequestContext()`
throws, and you get the plain-text double-failure response:

```
[mochi] Error 404: Not Found
The error page also failed to render.
```

Verified by adding `{url.pathname}` to this app's `Error.svelte` and requesting `/nope`.

**Why it bites:** the natural contents of an error page are exactly the unavailable things — the
path that 404'd, or a shared nav with active-link state. In-route errors *do* have a context, so this
works in testing and fails on the one case you care about. It forced `Nav.svelte` here to take
`pathname` as a prop instead of importing the isomorphic `url`.

### 3a. Mochi's own `<ViewTransitions />` hits this

Worth calling out separately, because it means the edge is reachable without writing any
context-touching code yourself.

`components/ViewTransitions.svelte:27` reads the request context to enforce its one-per-page rule:

```ts
const locals = getRequestContext().locals;
const isFirst = !locals.__mochi_view_transitions__;
```

The docs say to "render it from a component that appears on **every** page — for example, a shared
page shell." Following that advice literally is what broke this app: our `Layout.svelte` is also what
`Error.svelte` renders, so adding `<ViewTransitions />` to it turned every 404 into the double-failure
page above. Diagnosing it meant reading framework source, since the response body names neither the
component nor the cause.

We worked around it with a `viewTransitions` prop on the layout that the error page sets to `false` —
which also means navigations to and from the 404 page don't animate, since cross-document transitions
require both ends to opt in.

**Suggested fix:** fixing the missing context (below) fixes this too. Short of that,
`<ViewTransitions />` could fall back to a module-level per-render flag, or simply no-op when no
request context is present rather than throwing.

**Suggested fix (for both):** run the fallback error render inside a `requestContext.run(...)` with a
minimal context — the request URL is known at that point. Failing that, document prominently that the
error page must be context-free, and pass `url` to it as a prop alongside `error`.

---

## 4. A custom `enhance` submit callback silently swallows `redirect` and `error`

**Severity: medium.** Caused a real bug in this port that only a browser test caught.

Returning a result handler replaces *all* default handling. The docs say so, but the failure mode is
an invisible no-op. This looked complete and was not:

```ts
return ({ result }) => {
  if (result.type === 'redirect') window.location.assign(result.location);
  else if (result.type === 'failure') clientErrors = result.data?.errors;
  else clientErrors = undefined;   // silently eats `type: 'error'`
};
```

A wrong password produced a form that did nothing at all — no message, no navigation, no console
output. It took an end-to-end Chrome run to notice.

**Suggested fix:** keep `console.error` for unhandled `error` results even when a callback is
supplied, or emit a dev-mode warning when a submit callback returns without ever branching on
`error`. The `redirect` default in particular is something almost every caller wants to keep.

---

## 5. `form.data`, not `form` — the highest-traffic porting trap

**Severity: medium (frequency, not depth).**

SvelteKit's `fail(400, body)` makes the `form` prop *be* the payload. Mochi nests it at `form.data`
(`Mochi.ts:886-891`). Ported code reads:

```svelte
<ListErrors errors={form?.errors} />   <!-- compiles, always undefined -->
```

No type error, no runtime error, just an error list that never appears. This is worth calling out
explicitly in the "Coming from SvelteKit" page, because `form?.errors` is exactly what a porter
brings over. We ended up with a `formErrors()` helper to centralise the hop.

---

## 6. Docs bug: the `serverProps` signature on the porting page

**Severity: low, but it's on the first page a porter reads.**

"Coming from SvelteKit" shows:

```ts
serverProps: ({ params }) => ...
```

The real signature is `(req, params)` (`types.ts:14`). The destructured form happens to work at
runtime because Bun hangs `params` off the request object, so it passes a smoke test and then fails
`tsc`. Should be `(_req, params)`.

---

## 7. Route params behave differently from SvelteKit's literal-prefix segments

**Severity: low, but silently widens your URL surface.**

SvelteKit's `profile/@[user]` yields `params.user === 'bob'`. Mochi delegates to Bun's router, where:

| Pattern | `/profile/@bob` | Result |
| --- | --- | --- |
| `/profile/:user` | matches | `params.user === '@bob'` — includes the `@` |
| `/profile/@:user` | **no match** | Bun treats `@:user` as a literal segment |

Verified directly against `Bun.serve({ routes })`. Two consequences:

1. You must strip the sigil yourself (`params.user.slice(1)`).
2. `/profile/:user` **also** matches `/profile/bob`, which the reference app 404s — so without an
   explicit guard you silently serve every profile at two URLs. Bad for canonicalisation and SEO.

**Suggested fix:** worth a note in "Advanced routing" — the existing section covers `[[optional]]`
and matchers, but not that a literal prefix inside a segment isn't expressible, nor that `:param` is
greedier than the SvelteKit equivalent it's presented next to.

---

## 8. `error(status, message)` requires the message

**Severity: trivial.**

`utils/index.ts:62` is `error(status: number, message: string): never`. SvelteKit's `error(status)`
is valid, and RealWorld's `api.js` uses exactly that, so every ported call site needs a message
invented for it. A default derived from the status text would remove a small papercut.

---

## What worked well

Worth saying, because these are the decisions that made the port viable at all:

- **`mochi-hydratable-island { display: contents }`** (`Mochi.ts:239`) is the single best call in the
  design. RealWorld's CSS is Bootstrap 4 with float-based layout (`pull-xs-right` inside
  `.article-meta`). A wrapper element with a layout box would have broken the port's central goal of
  1:1 markup. Because the wrapper has no box, islands drop into float and flex containers invisibly.

- **Directives at the call site, not in the component.** `FavoriteButton.svelte` is one file that is
  server-rendered or hydrated depending on the parent that renders it. This is strictly better than a
  per-component `'use client'`-style marker.

- **`enhance`'s wire format mirroring SvelteKit's `ActionResult`** made the form ports close to
  mechanical — `use:enhance` → `{@attach enhance()}` and little else.

- **The build's per-route island table.** For a task framed as "hydrate only what is necessary", a
  build that prints islands and bundle bytes per route is exactly the feedback loop you want. Same
  for the debug bar's Islands panel and prop-size accounting.

- **`isHydratable()` and the `.server.ts` convention** both did their jobs with no surprises.

## Summary

The through-line in items 1–4 is that the sharpest edges are all **silent** — a redirect that no-ops,
children that evaporate, a context that throws only on 404, an error result that gets swallowed. In
each case the framework already has enough information at compile or render time to say something.
Turning those four into compile errors, dev warnings, or preserved defaults would remove most of the
difficulty we hit; the rest is documentation.
