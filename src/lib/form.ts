import type { MochiFormResult } from 'mochi-framework';
import type { ApiErrors } from './types';

/**
 * Pull RealWorld validation errors out of Mochi's form-action result.
 *
 * Note the extra hop compared to SvelteKit: `fail(400, body)` puts the payload at `form.data`, so the
 * errors live at `form.data.errors`, not `form.errors`.
 */
export function formErrors(form: MochiFormResult | null | undefined): ApiErrors | undefined {
  const errors = form?.data?.errors;
  return errors && typeof errors === 'object' ? (errors as ApiErrors) : undefined;
}

/**
 * Shown when an enhanced submit comes back as `type: 'error'`. The reference relies on bare
 * `use:enhance`, which renders the error page; a custom submit callback replaces that default, so
 * these islands surface the failure inline instead of silently swallowing it.
 */
export const REQUEST_FAILED: ApiErrors = { request: ['failed, please try again'] };
