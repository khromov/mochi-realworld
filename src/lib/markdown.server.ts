import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/** The `.server.ts` suffix keeps `marked` and `sanitize-html` out of any client bundle. */
export function renderMarkdown(body: string): string {
  const dirty = marked.parse(body, { async: false });
  return sanitizeHtml(dirty);
}
