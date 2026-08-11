<script lang="ts">
  import type { Comment as CommentType, PublicUser } from '../types';
  import Comment from './Comment.svelte';
  import CommentInput from './CommentInput.svelte';

  // This whole container is one island. SvelteKit refreshes the list with `invalidateAll()` after each
  // mutation; Mochi has no client router, so the actions return the created/deleted comment and the
  // list updates in place. Without JS the plain POST re-renders the page and serverProps refetches.
  //
  // Its children must stay directive-free — nesting a hydratable island is a compile error.
  let { comments, user }: { comments: CommentType[]; user: PublicUser | null } = $props();

  // svelte-ignore state_referenced_locally
  let list = $state(comments);

  function onCreated(comment: CommentType): void {
    list = [comment, ...list];
  }

  function onDeleted(id: number): void {
    list = list.filter((c) => c.id !== id);
  }
</script>

<div class="col-xs-12 col-md-8 offset-md-2">
  {#if user}
    <div>
      <CommentInput {user} {onCreated} />
    </div>
  {:else}
    <p>
      <a href="/login">Sign in</a>
      or
      <a href="/register">sign up</a>
      to add comments on this article.
    </p>
  {/if}

  {#each list as comment (comment.id)}
    <Comment {comment} {user} {onDeleted} />
  {/each}
</div>
