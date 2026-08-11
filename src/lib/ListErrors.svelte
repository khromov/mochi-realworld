<script lang="ts">
  import type { ApiErrors } from './types';

  const { errors }: { errors?: ApiErrors } = $props();
</script>

{#if errors}
  <ul class="error-messages">
    {#each Object.keys(errors) as key}
      <li>{key} {errors[key]}</li>
    {/each}
  </ul>
{/if}
