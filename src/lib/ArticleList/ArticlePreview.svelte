<script lang="ts">
  import { placeholder } from '../constants';
  import type { Article, PublicUser } from '../types';
  import FavoriteButton from './FavoriteButton.svelte';

  // Server-only: it declares a `mochi:hydrate` island below, so it must never become one itself.
  const { article, user }: { article: Article; user: PublicUser | null } = $props();
</script>

<div class="article-preview">
  <div class="article-meta">
    <a href="/profile/@{article.author.username}">
      <img src={article.author.image || placeholder} alt={article.author.username} />
    </a>

    <div class="info">
      <a class="author" href="/profile/@{article.author.username}">{article.author.username}</a>
      <span class="date">{new Date(article.createdAt).toDateString()}</span>
    </div>

    {#if user}
      <FavoriteButton
        mochi:hydrate
        slug={article.slug}
        favorited={article.favorited}
        favoritesCount={article.favoritesCount}
      />
    {/if}
  </div>

  <a href="/article/{article.slug}" class="preview-link">
    <h1>{article.title}</h1>
    <p>{article.description}</p>
    <span>Read more...</span>
    <ul class="tag-list">
      {#each article.tagList as tag}
        <li class="tag-default tag-pill tag-outline">{tag}</li>
      {/each}
    </ul>
  </a>
</div>
