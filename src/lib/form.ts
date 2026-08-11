import type { MochiFormResult } from 'mochi-framework';
import type { ApiErrors } from './types';

/** One hop deeper than SvelteKit: `fail(400, body)` puts the payload at `form.data`, not `form`. */
export function formErrors(form: MochiFormResult | null | undefined): ApiErrors | undefined {
  const errors = form?.data?.errors;
  return errors && typeof errors === 'object' ? (errors as ApiErrors) : undefined;
}

/** A custom submit callback replaces enhance's default error handling, so `type: 'error'` needs surfacing by hand. */
export const REQUEST_FAILED: ApiErrors = { request: ['failed, please try again'] };
