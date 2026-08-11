<script lang="ts">
  import { enhance } from 'mochi-framework';
  import type { MochiSubmitFunction } from 'mochi-framework';
  import { placeholder } from '../constants';
  import type { Comment, PublicUser } from '../types';

  const {
    comment,
    user,
    onDeleted,
  }: { comment: Comment; user: PublicUser | null; onDeleted: (id: number) => void } = $props();

  const submit: MochiSubmitFunction = () => {
    return ({ result }) => {
      if (result.type === 'success') {
        onDeleted(comment.id);
      }
    };
  };
</script>

<div class="card">
  <div class="card-block">
    <p class="card-text">{comment.body}</p>
  </div>

  <div class="card-footer">
    <a href="/profile/@{comment.author.username}" class="comment-author">
      <img
        src={comment.author.image || placeholder}
        class="comment-author-img"
        alt={comment.author.username}
      />
    </a>

    <a href="/profile/@{comment.author.username}" class="comment-author">
      {comment.author.username}
    </a>

    <span class="date-posted">{new Date(comment.createdAt).toDateString()}</span>

    {#if user && comment.author.username === user.username}
      <form
        method="POST"
        action="?/deleteComment&id={comment.id}"
        class="mod-options"
        {@attach enhance(submit)}
      >
        <button class="ion-trash-a" aria-label="Delete comment"></button>
      </form>
    {/if}
  </div>
</div>

<style>
  button {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font-size: inherit;
    margin-left: 5px;
    opacity: 0.6;
    cursor: pointer;
  }
</style>
