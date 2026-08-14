<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ViewTransitions } from 'mochi-framework/components';
  import './conduit-theme.css';
  import './fonts';
  import Nav from './Nav.svelte';
  import type { PublicUser } from './types';

  // Must stay server-only: islands cannot receive snippet props.
  let {
    user = null,
    pathname = '',
    viewTransitions = true,
    children,
  }: {
    user?: PublicUser | null;
    pathname?: string;
    viewTransitions?: boolean;
    children: Snippet;
  } = $props();
</script>

<!--
  Opted out of on the error page: <ViewTransitions> reads getRequestContext().locals, and the
  unmatched-route path renders without a request context. Shared headers are frozen by hand in
  shell.html because `keepElementSelectors` paints both snapshots at once and darkens the navbar.
-->
{#if viewTransitions}
  <ViewTransitions type="fade" duration={180} />
{/if}

<Nav {user} {pathname} />

<main>
  {@render children()}
</main>
