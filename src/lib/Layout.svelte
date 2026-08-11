<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ViewTransitions } from 'mochi-framework/components';
  import './fonts';
  import Nav from './Nav.svelte';
  import type { PublicUser } from './types';

  // Mochi has no layout system, so every page imports this wrapper explicitly. It must stay
  // server-only: islands cannot receive snippet props.
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
  Every page renders exactly one of these, which is what the cross-document View Transitions API needs
  — both the page you leave and the page you land on must opt in. Ships zero JavaScript; the browser
  does the animating. The navbar is held still so only the content crossfades.

  Shared headers are held still by hand-written CSS in shell.html rather than the component's
  `keepElementSelectors`, which emits `animation: none` on both snapshots and leaves them painted on
  top of each other — visibly darkening the transparent navbar.

  Opted out of on the error page: <ViewTransitions> reads getRequestContext().locals to enforce its
  one-per-page rule, and the unmatched-route path renders the error page without a request context, so
  including it there takes the 404 page down.
-->
{#if viewTransitions}
  <ViewTransitions type="fade" duration={180} />
{/if}

<Nav {user} {pathname} />

<main>
  {@render children()}
</main>
