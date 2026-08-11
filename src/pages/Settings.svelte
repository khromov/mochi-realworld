<script lang="ts">
  import type { MochiFormResult } from 'mochi-framework';
  import SettingsForm from '../lib/auth/SettingsForm.svelte';
  import { formErrors } from '../lib/form';
  import Layout from '../lib/Layout.svelte';
  import type { PublicUser } from '../lib/types';

  // `user` is non-null here: the guard middleware bounces signed-out visitors to /login.
  const {
    user,
    pathname,
    form,
  }: { user: PublicUser; pathname: string; form?: MochiFormResult } = $props();
</script>

<svelte:head>
  <title>Settings • Conduit</title>
</svelte:head>

<Layout {user} {pathname}>
  <div class="settings-page">
    <div class="container page">
      <div class="row">
        <div class="col-md-6 offset-md-3 col-xs-12">
          <h1 class="text-xs-center">Your Settings</h1>

          <SettingsForm mochi:hydrate {user} errors={formErrors(form)} />
        </div>
      </div>
    </div>
  </div>
</Layout>
