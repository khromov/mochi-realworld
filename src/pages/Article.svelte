<script lang="ts">
  import ArticleMeta from '../lib/article/ArticleMeta.svelte';
  import CommentContainer from '../lib/article/CommentContainer.svelte';
  import Layout from '../lib/Layout.svelte';
  import type { Article, Comment, PublicUser } from '../lib/types';

  const {
    user,
    pathname,
    article,
    comments,
  }: {
    user: PublicUser | null;
    pathname: string;
    article: Article;
    comments: Comment[];
  } = $props();
</script>

<svelte:head>
  <title>{article.title}</title>
</svelte:head>

<Layout {user} {pathname}>
  <div class="article-page">
    <div class="banner">
      <div class="container">
        <h1>{article.title}</h1>
        <ArticleMeta {article} {user} />
      </div>
    </div>

    <div class="container page">
      <div class="row article-content">
        <div class="col-xs-12">
          <div>
            <!-- Sanitized server-side in lib/markdown.server.ts before it reaches {@html}. -->
            {@html article.body}
          </div>

          <ul class="tag-list">
            {#each article.tagList as tag}
              <li class="tag-default tag-pill tag-outline">{tag}</li>
            {/each}
          </ul>
        </div>
      </div>

      <hr />

      <div class="article-actions"></div>

      <div class="row">
        <CommentContainer mochi:hydrate {comments} {user} />
      </div>
    </div>
  </div>
</Layout>
