/**
 * Self-hosted via @fontsource, replacing the reference app's Google Fonts <link>. Imported from
 * Layout.svelte, which every page renders, so Mochi bundles it once and links it from every page.
 *
 * Two trims against the weights the reference's Google Fonts URL requested:
 *   - Merriweather Sans is dropped entirely — it was in that URL but nothing in the theme references it.
 *   - The four italic variants are dropped. The theme has exactly two `font-style: italic` rules and
 *     neither names a family, so the browser synthesizes an oblique. Bun base64-inlines every font
 *     into the bundled CSS, and those four were ~170 kB of it.
 *
 * Latin subsets only; the UI text is English.
 */
import '@fontsource/titillium-web/latin-700.css';

import '@fontsource/source-sans-pro/latin-300.css';
import '@fontsource/source-sans-pro/latin-400.css';
import '@fontsource/source-sans-pro/latin-600.css';
import '@fontsource/source-sans-pro/latin-700.css';

import '@fontsource/source-serif-pro/latin-400.css';
import '@fontsource/source-serif-pro/latin-700.css';
