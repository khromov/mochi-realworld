export const page_size = 10;

/**
 * Vendored because the reference points this at `static.productionready.io`, which now 404s. Upstream
 * only applies it in CommentInput, so every other avatar breaks when the API returns `image: null`.
 */
export const placeholder = '/smiley-cyrus.jpeg';
