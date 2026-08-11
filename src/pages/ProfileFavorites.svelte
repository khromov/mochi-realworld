<script lang="ts">
  import ArticleList from '../lib/ArticleList/index.svelte';
  import Layout from '../lib/Layout.svelte';
  import ProfileHeader from '../lib/ProfileHeader.svelte';
  import type { Article, Profile, PublicUser } from '../lib/types';

  const {
    user,
    pathname,
    profile,
    articles,
  }: {
    user: PublicUser | null;
    pathname: string;
    profile: Profile;
    articles: Article[];
  } = $props();
</script>

<Layout {user} {pathname}>
  <ProfileHeader {profile} {user} isFavorites={true}>
    <ArticleList {articles} {user} />
  </ProfileHeader>
</Layout>
