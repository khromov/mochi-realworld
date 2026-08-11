<script lang="ts">
  import { enhance } from 'mochi-framework';
  import type { MochiSubmitFunction } from 'mochi-framework';

  let {
    slug,
    favorited,
    favoritesCount,
  }: { slug: string; favorited: boolean; favoritesCount: number } = $props();

  // Island props are plain values, not SvelteKit's deep-reactive `data`, so optimistic state lives here.
  // svelte-ignore state_referenced_locally
  let isFavorited = $state(favorited);
  // svelte-ignore state_referenced_locally
  let count = $state(favoritesCount);
  let pending = $state(false);

  const submit: MochiSubmitFunction = () => {
    const previous = { isFavorited, count };

    if (isFavorited) {
      isFavorited = false;
      count -= 1;
    } else {
      isFavorited = true;
      count += 1;
    }
    pending = true;

    return ({ result }) => {
      pending = false;
      if (result.type === 'error') {
        isFavorited = previous.isFavorited;
        count = previous.count;
      }
    };
  };
</script>

<!-- Posts cross-route to the article's own action, from / and /profile alike. -->
<form
  method="POST"
  action="/article/{slug}?/toggleFavorite"
  class="pull-xs-right"
  {@attach enhance(submit)}
>
  <input hidden type="checkbox" name="favorited" checked={isFavorited} />
  <button class="btn btn-sm {isFavorited ? 'btn-primary' : 'btn-outline-primary'}" disabled={pending}>
    <i class="ion-heart"></i>
    {count}
  </button>
</form>
