<script lang="ts">
  import { url } from 'mochi-framework';
  import ArticleList from '../lib/ArticleList/index.svelte';
  import Layout from '../lib/Layout.svelte';
  import Pagination from '../lib/Pagination.svelte';
  import type { Article, PublicUser } from '../lib/types';

  const {
    user,
    pathname,
    articles,
    pages,
    tags,
  }: {
    user: PublicUser | null;
    pathname: string;
    articles: Article[];
    pages: number;
    tags: string[];
  } = $props();

  const p = Number(url.searchParams.get('page') ?? '1');
  const activeTag = url.searchParams.get('tag');
  const tab = url.searchParams.get('tab') ?? 'all';
  const page_link_base = activeTag ? `tag=${activeTag}` : `tab=${tab}`;
</script>

<svelte:head>
  <title>Conduit</title>
</svelte:head>

<Layout {user} {pathname}>
  <div class="home-page">
    {#if !user}
      <div class="banner">
        <div class="container">
          <h1 class="logo-font">conduit</h1>
          <p>A place to share your knowledge.</p>
        </div>
      </div>
    {/if}

    <div class="container page">
      <div class="row">
        <div class="col-md-9">
          <div class="feed-toggle">
            <ul class="nav nav-pills outline-active">
              <li class="nav-item">
                <a href="/?tab=all" class="nav-link" class:active={tab === 'all' && !activeTag}>
                  Global Feed
                </a>
              </li>

              {#if user}
                <li class="nav-item">
                  <a href="/?tab=feed" class="nav-link" class:active={tab === 'feed'}>Your Feed</a>
                </li>
              {:else}
                <li class="nav-item">
                  <a href="/login" class="nav-link">Sign in to see your Feed</a>
                </li>
              {/if}

              {#if activeTag}
                <li class="nav-item">
                  <a href="/?tag={activeTag}" class="nav-link active">
                    <i class="ion-pound"></i>
                    {activeTag}
                  </a>
                </li>
              {/if}
            </ul>
          </div>

          <ArticleList {articles} {user} />
          <Pagination {pages} {p} href={(n) => `/?${page_link_base}&page=${n}`} />
        </div>

        <div class="col-md-3">
          <div class="sidebar">
            <p>Popular Tags</p>
            <div class="tag-list">
              {#each tags as tag}
                <a href="/?tag={tag}" class="tag-default tag-pill">{tag}</a>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</Layout>
