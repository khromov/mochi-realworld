# `@fontsource` imports are base64-inlined into render-blocking CSS

Feedback for the Mochi maintainers, found while replacing this app's Google Fonts `<link>` with
self-hosted `@fontsource` packages.

**Versions:** `mochi-framework` 0.9.1 · Bun 1.3.14 · `@fontsource/*` 5.3.0

## Summary

A side-effect `import '@fontsource/…'` works exactly as documented — the CSS is bundled and linked
from the page `<head>` with no manual wiring. But every font file referenced by that CSS is inlined
as a base64 `data:` URI, so the fonts become part of a **render-blocking stylesheet** instead of
separately-fetched, independently-cacheable binaries.

For this app that turned ~15 kB of CSS into **332 kB**, and it is on every page.

## Reproduction

```ts
// src/lib/fonts.ts, imported from a component every page renders
import '@fontsource/titillium-web/latin-700.css';
import '@fontsource/source-sans-pro/latin-300.css';
import '@fontsource/source-sans-pro/latin-400.css';
import '@fontsource/source-sans-pro/latin-600.css';
import '@fontsource/source-sans-pro/latin-700.css';
import '@fontsource/source-serif-pro/latin-400.css';
import '@fontsource/source-serif-pro/latin-700.css';
```

```
$ bun run build
$ find .mochi/import-css -name '*.css' | xargs cat | wc -c
340335          # 332 kB across 7 files
```

The package ships this:

```css
/* node_modules/@fontsource/source-sans-pro/latin-400.css */
@font-face {
  font-family: 'Source Sans Pro';
  src: url(./files/source-sans-pro-latin-400-normal.woff2) format('woff2'),
       url(./files/source-sans-pro-latin-400-normal.woff) format('woff');
}
```

and the bundled output is:

```css
@font-face {
  font-family: Source Sans Pro;
  src: url("data:font/woff2;base64,d09GMgABAAAAADdQAA0…"),
       url("data:font/woff;base64,d09GRgABAAAAAF…");
}
```

Both formats are inlined, so each weight carries **two full copies** of the same typeface. Roughly
half the 332 kB is the legacy `woff` that no browser capable of running Mochi's view transitions or
speculation rules will ever select.

## Why this is worse than it looks

Compared with the Google Fonts `<link>` it replaced:

| | CSS (render-blocking) | Font binaries |
| --- | --- | --- |
| Google Fonts `<link>` | 14.6 kB | fetched separately, only the needed `unicode-range` subsets, non-blocking |
| `@fontsource` via Mochi | **332 kB** | none — they *are* the CSS |

Four properties are lost, all of them things `@font-face` normally gets for free:

1. **Render-blocking.** A stylesheet blocks first paint; a font file does not. `font-display: swap`
   is inside the CSS, so it cannot help until the CSS itself has arrived.
2. **No lazy subsetting.** The whole point of `unicode-range` is that a browser fetches only the
   subsets it needs. Inlined, every declared subset ships whether or not a glyph in it is ever
   rendered. (We worked around this by importing `latin-*` variants explicitly.)
3. **Base64 overhead.** ~33% inflation over the binary.
4. **Cache granularity.** One byte changed in any weight invalidates the single bundle. Separate font
   files are immutable and cache independently of app CSS.

## What we did about it

Trimmed to the minimum defensible set and accepted the cost, because the app is a demo. Specifically
we dropped four italic variants (~170 kB) purely for weight — the theme has exactly two
`font-style: italic` rules and neither names a family, so the browser synthesizes an oblique. That is
a bad reason to make a typography decision.

## Suggested fix

**Emit font files as assets rather than inlining them.** Mochi already does exactly this for
`public/` files and for imported images (content-hashed URL, separate request). Fonts referenced from
bundled CSS should follow the same path, so the output is:

```css
src: url(/_mochi/fonts/source-sans-pro-latin-400-normal-<hash>.woff2) format('woff2');
```

If inlining is deliberate for small assets, a size threshold would resolve most of it — inline a 2 kB
icon font, emit a 20 kB text face. Bun's bundler exposes this; the demo in the docs
(`import './lobster.css'` inlining a local `.woff2`) reads like the behaviour is intended for the
small-asset case and simply generalises badly to real typeface packages.

A narrower fix, if the bundler cannot be changed: document the behaviour on the
[CSS imports](https://mochi.fast/docs/css-imports/) page. It currently says only that a `.css` import
is "bundled out-of-band and linked from the page `<head>`", which reads as though the fonts stay
separate. The font-loading demo mentions inlining once, for a standalone `.woff2`, and nothing
suggests it also applies to `@fontsource` packages — where the multiplier is large enough to matter.

## Aside: `@fontsource` ships `woff` alongside `woff2`

Not Mochi's doing, but it doubles the cost of the above. If Mochi keeps inlining, dropping `woff`
sources during bundling (or exposing a knob to) would halve the payload with no practical
compatibility loss — `woff2` has been baseline in every browser for years, and certainly in every
browser that supports the other features Mochi ships.
