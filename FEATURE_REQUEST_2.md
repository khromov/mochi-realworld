# Imported CSS is not minified, unlike every other bundle

Feature request for the Mochi maintainers, found while moving this app's theme from `publicDir` into
a side-effect CSS import.

**Versions:** `mochi-framework` @ [b23fe7e](https://github.com/khromov/mochi/commit/b23fe7e1dfc1b4f64cc64c1cad3184cac680cc7e) · Bun 1.3.14

## Summary

`import './theme.css'` produces an `/_mochi/import-css/*` asset that keeps its source formatting —
indentation, blank lines, comments. Every other artifact the framework builds is minified. It looks
like an omitted option rather than a decision: `bundleImportedCssBatch` is the one `Bun.build()` call
in the compiler that does not pass `minify`.

## Reproduction

A 28,850-byte stylesheet imported from a component:

```
.mochi/import-css/conduit-theme-e2ywh63p.css   1,219 lines   22,755 bytes
.mochi/svelte-css/Error-2mx8djrx9vddk.css          1 line        167 bytes
```

The imported file still opens with its source comment and indentation:

```css
/* src/lib/conduit-theme.css */
:root {
  --brand: #3a4;
  --brand-hover: #2b8e3a;
```

while component CSS through the same bundler comes out as one line:

```css
h1.svelte-1p57y15{text-align:center;margin:4em 0}.detail.svelte-1p57y15{…}
```

## Where it diverges

`compiler/ComponentRegistry.ts` has both calls. Component CSS, ~line 1047:

```ts
const cssResult = await Bun.build({
  entrypoints: cssTodo.map(([componentPath]) => rawPathFor(componentPath)),
  minify: true,
  throw: false,
});
```

Imported CSS, ~line 1984:

```ts
const cssResult = await Bun.build({
  entrypoints: [cssPath],
  outdir: importCssOutDir,
  naming: { entry: '[name]-[hash].[ext]' },
  plugins: Number.isFinite(this.fontInlineThreshold) ? [fontPlugin] : [],
  throw: false,
  // no `minify`
});
```

For context, `minify: true` is passed by every other build in the compiler — the Svelte client bundle
(`ComponentRegistry.ts:1262`), the debug bar (`buildDebugBarBundle.ts:64`), and the inline web
component (`buildInlineWebComponent.ts:20`). Imported CSS is the sole exception.

## Is there a reason to leave it off?

Nothing obvious. The output goes through two post-processing steps, and neither looks minify-sensitive:

- `restoreVariationsFormat` is a regex over `format(woff2-variations)` and friends. Minification does
  not alter that token shape, and its own comment notes it is already a no-op on Bun 1.4.
- `adoptEmittedFontAssets` / `substituteFontUrls` rewrite `url()` targets, matching on the marker
  `data:` URIs the font plugin emits. Those survive minification intact.

If one of them *is* the reason, that is worth a comment at the call site — right now it reads as an
oversight, and the next person to touch it has no way to tell.

## What it is worth

Measured on the same file with Bun directly:

| | bytes |
| --- | --- |
| source | 28,850 |
| bundled, as Mochi does it today | 22,747 |
| bundled with `minify: true` | **18,994** |
| today, gzipped | 4,171 |
| minified, gzipped | **3,959** |

So ~17% off the artifact, and ~5% (212 bytes) once gzip is applied. Small on the wire, since gzip
already handles whitespace well — the honest case for fixing it is consistency and the uncompressed
size, not bandwidth.

It matters more than those numbers suggest in one situation, though: `publicDir` files cannot be
compressed at all (they are registered straight into Bun's route table as `Bun.file(diskPath)`, so
`compress()` never sees them). Moving a stylesheet into an import is the natural way to fix that, and
that path should not quietly hand back a less optimised artifact.

## Suggested fix

Pass `minify: true` in `bundleImportedCssBatch`, matching the other builds. If there is a reason not
to, a `css: { minify?: boolean }` option — or just a comment explaining the omission — would do.
