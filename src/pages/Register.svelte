<script lang="ts">
  import type { MochiFormResult } from 'mochi-framework';
  import RegisterForm from '../lib/auth/RegisterForm.svelte';
  import { formErrors } from '../lib/form';
  import Layout from '../lib/Layout.svelte';
  import type { PublicUser } from '../lib/types';

  const {
    user,
    pathname,
    form,
  }: { user: PublicUser | null; pathname: string; form?: MochiFormResult } = $props();
</script>

<svelte:head>
  <title>Sign up • Conduit</title>
</svelte:head>

<Layout {user} {pathname}>
  <div class="auth-page">
    <div class="container page">
      <div class="row">
        <div class="col-md-6 offset-md-3 col-xs-12">
          <h1 class="text-xs-center">Sign up</h1>
          <p class="text-xs-center">
            <a href="/login">Have an account?</a>
          </p>

          <RegisterForm mochi:hydrate errors={formErrors(form)} />
        </div>
      </div>
    </div>
  </div>
</Layout>
