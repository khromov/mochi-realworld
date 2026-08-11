<script lang="ts">
  import type { PublicUser } from './types';

  // Both arrive as props because the error page renders outside a request context.
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
