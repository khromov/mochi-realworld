<script lang="ts">
  import { enhance } from 'mochi-framework';
  import type { MochiSubmitFunction } from 'mochi-framework';
  import { placeholder } from '../constants';
  import type { Comment, PublicUser } from '../types';

  // Rendered inside the CommentContainer island, so `onCreated` is an ordinary Svelte prop — the
  // devalue boundary is at the island root, not here.
  const { user, onCreated }: { user: PublicUser; onCreated: (comment: Comment) => void } = $props();

  const submit: MochiSubmitFunction<{ comment: Comment }> = () => {
    return ({ result, formElement }) => {
      if (result.type === 'success' && result.data?.comment) {
        onCreated(result.data.comment);
        formElement.reset();
      }
    };
  };
</script>

<form method="POST" action="?/createComment" class="card comment-form" {@attach enhance(submit)}>
  <div class="card-block">
    <textarea class="form-control" name="comment" placeholder="Write a comment..." rows="3"
    ></textarea>
  </div>

  <div class="card-footer">
    <img src={user.image || placeholder} class="comment-author-img" alt={user.username} />
    <button class="btn btn-sm btn-primary" type="submit">Post Comment</button>
  </div>
</form>
