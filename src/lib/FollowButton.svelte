<script lang="ts">
  import { enhance } from 'mochi-framework';
  import type { MochiSubmitFunction } from 'mochi-framework';

  let { username, following }: { username: string; following: boolean } = $props();

  // svelte-ignore state_referenced_locally
  let isFollowing = $state(following);
  let pending = $state(false);

  const submit: MochiSubmitFunction = () => {
    const previous = isFollowing;

    // optimistic UI
    isFollowing = !isFollowing;
    pending = true;

    return ({ result }) => {
      pending = false;
      if (result.type === 'error') {
        isFollowing = previous;
      }
    };
  };
</script>

<form method="POST" action="/profile/@{username}?/toggleFollow" {@attach enhance(submit)}>
  <input hidden type="checkbox" name="following" checked={isFollowing} />
  <button
    class="btn btn-sm action-btn"
    class:btn-secondary={isFollowing}
    class:btn-outline-secondary={!isFollowing}
    disabled={pending}
  >
    <i class="ion-plus-round"></i>
    {isFollowing ? 'Unfollow' : 'Follow'}
    {username}
  </button>
</form>
