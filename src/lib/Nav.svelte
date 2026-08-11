<script lang="ts">
  import type { PublicUser } from './types';

  // The reference reads `page.url.pathname` / `page.data.user` from SvelteKit's page store. Mochi has
  // no such store, and the error page renders outside a request context, so both arrive as props.
  let { user = null, pathname = '' }: { user?: PublicUser | null; pathname?: string } = $props();
</script>

<nav class="navbar navbar-light">
  <div class="container">
    <a class="navbar-brand" href="/">conduit</a>
    <ul class="nav navbar-nav pull-xs-right">
      <li class="nav-item">
        <a class="nav-link" class:active={pathname === '/'} href="/">Home</a>
      </li>

      {#if user}
        <li class="nav-item">
          <a href="/editor" class="nav-link" class:active={pathname === '/editor'}>
            <i class="ion-compose"></i>&nbsp;New Post
          </a>
        </li>

        <li class="nav-item">
          <a href="/settings" class="nav-link" class:active={pathname === '/settings'}>
            <i class="ion-gear-a"></i>&nbsp;Settings
          </a>
        </li>

        <li class="nav-item">
          <a href="/profile/@{user.username}" class="nav-link">
            {user.username}
          </a>
        </li>
      {:else}
        <li class="nav-item">
          <a href="/login" class="nav-link" class:active={pathname === '/login'}> Sign in </a>
        </li>

        <li class="nav-item">
          <a href="/register" class="nav-link" class:active={pathname === '/register'}> Sign up </a>
        </li>
      {/if}
    </ul>
  </div>
</nav>
