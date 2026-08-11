<script lang="ts">
  import { enhance } from 'mochi-framework';
  import type { MochiSubmitFunction } from 'mochi-framework';
  import { REQUEST_FAILED } from '../form';
  import ListErrors from '../ListErrors.svelte';
  import type { ApiErrors, PublicUser } from '../types';

  const { user, errors }: { user: PublicUser; errors?: ApiErrors } = $props();

  let clientErrors = $state<ApiErrors | undefined>(undefined);
  let submitted = $state(false);
  const shownErrors = $derived(submitted ? clientErrors : errors);

  // Leaving the fields untouched is Mochi's equivalent of the reference's `update({ reset: false })`.
  const submit: MochiSubmitFunction<Record<string, unknown>, { errors: ApiErrors }> = () => {
    return ({ result }) => {
      submitted = true;
      if (result.type === 'failure') {
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

<form method="POST" action="?/save" {@attach enhance(submit)}>
  <fieldset>
    <fieldset class="form-group">
      <input
        class="form-control"
        name="image"
        type="text"
        placeholder="URL of profile picture"
        value={user.image ?? ''}
      />
    </fieldset>

    <fieldset class="form-group">
      <input
        class="form-control form-control-lg"
        name="username"
        type="text"
        placeholder="Username"
        value={user.username}
      />
    </fieldset>

    <fieldset class="form-group">
      <textarea
        class="form-control form-control-lg"
        name="bio"
        rows="8"
        placeholder="Short bio about you"
        value={user.bio ?? ''}
      ></textarea>
    </fieldset>

    <fieldset class="form-group">
      <input
        class="form-control form-control-lg"
        name="email"
        type="email"
        placeholder="Email"
        value={user.email}
      />
    </fieldset>

    <fieldset class="form-group">
      <input
        class="form-control form-control-lg"
        name="password"
        type="password"
        placeholder="New Password"
      />
    </fieldset>

    <button class="btn btn-lg btn-primary pull-xs-right">Update Settings</button>
  </fieldset>
</form>

<hr />

<form method="POST" action="?/logout" {@attach enhance()}>
  <button class="btn btn-outline-danger">Or click here to logout.</button>
</form>
