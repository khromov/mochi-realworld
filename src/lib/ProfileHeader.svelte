<script lang="ts">
  import type { Snippet } from 'svelte';
  import { placeholder } from './constants';
  import FollowButton from './FollowButton.svelte';
  import type { Profile, PublicUser } from './types';

  // Mochi has no layouts, so both profile pages import this and pass their own `isFavorites`.
  const {
    profile,
    user,
    isFavorites,
    children,
  }: {
    profile: Profile;
    user: PublicUser | null;
    isFavorites: boolean;
    children: Snippet;
  } = $props();
</script>

<svelte:head>
  <title>{profile.username} • Conduit</title>
</svelte:head>

<div class="profile-page">
  <div class="user-info">
    <div class="container">
      <div class="row">
        <div class="col-xs-12 col-md-10 offset-md-1">
          <img src={profile.image || placeholder} class="user-img" alt={profile.username} />
          <h4>{profile.username}</h4>
          {#if profile.bio}
            <p>{profile.bio}</p>
          {/if}

          {#if profile.username === user?.username}
            <a href="/settings" class="btn btn-sm btn-outline-secondary action-btn">
              <i class="ion-gear-a"></i>
              Edit Profile Settings
            </a>
          {:else if user}
            <FollowButton mochi:hydrate username={profile.username} following={profile.following} />
          {:else}
            <a href="/login">Sign in to follow</a>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <div class="container">
    <div class="row">
      <div class="col-xs-12 col-md-10 offset-md-1">
        <div class="articles-toggle">
          <ul class="nav nav-pills outline-active">
            <li class="nav-item">
              <a href="/profile/@{profile.username}" class="nav-link" class:active={!isFavorites}>
                Articles
              </a>
            </li>

            <li class="nav-item">
              <a
                href="/profile/@{profile.username}/favorites"
                class="nav-link"
                class:active={isFavorites}
              >
                Favorites
              </a>
            </li>
          </ul>
        </div>

        {@render children()}
      </div>
    </div>
  </div>
</div>
