<script lang="ts">
  import type { Article, PublicUser } from '../types';
  import ArticlePreview from './ArticlePreview.svelte';

  // The reference reads `user` from `page.data`; Mochi threads it down as a prop.
  const { articles, user }: { articles: Article[]; user: PublicUser | null } = $props();
</script>

{#if articles.length === 0}
  <div class="article-preview">No articles are here... yet.</div>
{:else}
  <div>
    {#each articles as article (article.slug)}
      <ArticlePreview {article} {user} />
    {/each}
  </div>
{/if}
