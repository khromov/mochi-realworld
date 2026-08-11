<script lang="ts">
  import type { MochiErrorProps } from 'mochi-framework';
  import Layout from './lib/Layout.svelte';

  // The unmatched-route path renders this without a request context, so nothing here (or in Layout /
  // Nav) may touch `url`, `params`, `locals`, `cookies`, or `getRequestContext()`.
  let { error }: MochiErrorProps = $props();
</script>

<svelte:head>
  <title>{error.status}</title>
</svelte:head>

<Layout>
  <div>
    {#if error.status === 404}
      <h1>Not found!</h1>
    {:else}
      <h1>Something went wrong</h1>
    {/if}
  </div>
</Layout>

<style>
  h1 {
    margin: 4em 0;
    text-align: center;
  }

  @media (min-width: 480px) {
    h1 {
      font-size: 4em;
    }
  }
</style>
