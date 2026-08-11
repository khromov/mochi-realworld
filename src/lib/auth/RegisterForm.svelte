<script lang="ts">
  import { enhance } from 'mochi-framework';
  import type { MochiSubmitFunction } from 'mochi-framework';
  import { REQUEST_FAILED } from '../form';
  import ListErrors from '../ListErrors.svelte';
  import type { ApiErrors } from '../types';

  const { errors }: { errors?: ApiErrors } = $props();

  let clientErrors = $state<ApiErrors | undefined>(undefined);
  let submitted = $state(false);
  const shownErrors = $derived(submitted ? clientErrors : errors);

  const submit: MochiSubmitFunction<Record<string, unknown>, { errors: ApiErrors }> = () => {
    return ({ result }) => {
      submitted = true;
      if (result.type === 'redirect') {
        window.location.assign(result.location);
      } else if (result.type === 'failure') {
        clientErrors = result.data?.errors;
      } else if (result.type === 'error') {
        clientErrors = REQUEST_FAILED;
      } else {
        clientErrors = undefined;
      }
    };
  };
</script>

<ListErrors errors={shownErrors} />

<form method="POST" {@attach enhance(submit)}>
  <fieldset class="form-group">
    <input
      class="form-control form-control-lg"
      name="username"
      type="text"
      required
      placeholder="Your Name"
    />
  </fieldset>
  <fieldset class="form-group">
    <input
      class="form-control form-control-lg"
      name="email"
      type="email"
      required
      placeholder="Email"
    />
  </fieldset>
  <fieldset class="form-group">
    <input
      class="form-control form-control-lg"
      name="password"
      type="password"
      required
      placeholder="Password"
    />
  </fieldset>
  <button class="btn btn-lg btn-primary pull-xs-right">Sign up</button>
</form>
