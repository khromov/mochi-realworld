<script lang="ts">
  import type { Article, PublicUser } from '../types';
  import DeleteArticleButton from './DeleteArticleButton.svelte';

  // Server-only: it declares a `mochi:hydrate` island below, so it must never become one itself.
  const { article, user }: { article: Article; user: PublicUser | null } = $props();
</script>

<div class="article-meta">
  <a href="/profile/@{article.author.username}">
    <img src={article.author.image} alt={article.author.username} />
  </a>

  <div class="info">
    <a href="/profile/@{article.author.username}" class="author">{article.author.username}</a>
    <span class="date">
      {new Date(article.createdAt).toDateString()}
    </span>
  </div>

  {#if article.author.username === user?.username}
    <span>
      <a href="/editor/{article.slug}" class="btn btn-outline-secondary btn-sm">
        <i class="ion-edit"></i> Edit Article
      </a>

      <DeleteArticleButton mochi:hydrate />
    </span>
  {/if}
</div>
