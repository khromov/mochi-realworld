<script lang="ts">
  import type { Snippet } from 'svelte';
  import Nav from './Nav.svelte';
  import type { PublicUser } from './types';

  // Mochi has no layout system, so every page imports this wrapper explicitly. It must stay
  // server-only: islands cannot receive snippet props.
  let {
    user = null,
    pathname = '',
    children,
  }: { user?: PublicUser | null; pathname?: string; children: Snippet } = $props();
</script>

<Nav {user} {pathname} />

<main>
  {@render children()}
</main>
