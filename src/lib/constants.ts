export const page_size = 10;

/**
 * Fallback avatar. The reference points this at `static.productionready.io`, which now 404s like the
 * CDN it served main.css from, so the image is vendored into public/ instead.
 *
 * The reference exports this constant but only ever uses it in CommentInput, so every other avatar
 * renders a broken image for users who never set one (the API returns `image: null`).
 */
export const placeholder = '/smiley-cyrus.jpeg';
