import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/**
 * Render an article body from markdown to sanitized HTML, exactly as the reference app's
 * `article/[slug]/+page.server.js` does. Both libraries run with their defaults.
 *
 * The `.server.ts` suffix keeps `marked` and `sanitize-html` out of any client bundle.
 */
export function renderMarkdown(body: string): string {
  const dirty = marked.parse(body, { async: false });
  return sanitizeHtml(dirty);
}
