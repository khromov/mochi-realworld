<script lang="ts">
  import { flip } from 'svelte/animate';
  import { scale } from 'svelte/transition';
  import { enhance } from 'mochi-framework';
  import type { MochiSubmitFunction } from 'mochi-framework';
  import { REQUEST_FAILED } from '../form';
  import ListErrors from '../ListErrors.svelte';
  import type { ApiErrors, ArticleDraft } from '../types';

  const { article, errors }: { article: ArticleDraft; errors?: ApiErrors } = $props();

  // svelte-ignore state_referenced_locally
  let tagList = $state(article.tagList);

  // The SSR snapshot from the page's `form` prop, so the no-JS POST re-render still shows errors.
  let clientErrors = $state<ApiErrors | undefined>(undefined);
  let submitted = $state(false);
  const shownErrors = $derived(submitted ? clientErrors : errors);

  const submit: MochiSubmitFunction<Record<string, unknown>, { errors: ApiErrors }> = () => {
    return ({ result }) => {
      submitted = true;
      if (result.type === 'redirect') {
        window.location.assign(result.location);
      } else if (result.type === 'failure') {
        clientErrors = result.data?.errors;
      } else if (result.type === 'error') {
        clientErrors = REQUEST_FAILED;
      } else {
        clientErrors = undefined;
      }
    };
  };
</script>

<div class="editor-page">
  <div class="container page">
    <div class="row">
      <div class="col-md-10 offset-md-1 col-xs-12">
        <ListErrors errors={shownErrors} />

        <form method="POST" {@attach enhance(submit)}>
          <fieldset class="form-group">
            <input
              name="title"
              class="form-control form-control-lg"
              placeholder="Article Title"
              value={article.title}
            />
          </fieldset>

          <fieldset class="form-group">
            <input
              name="description"
              class="form-control"
              placeholder="What's this article about?"
              value={article.description}
            />
          </fieldset>

          <fieldset class="form-group">
            <textarea
              name="body"
              class="form-control"
              rows="8"
              placeholder="Write your article (in markdown)"
              value={article.body}
            ></textarea>
          </fieldset>

          <fieldset class="form-group">
            <input
              class="form-control"
              placeholder="Enter tags"
              onkeydown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  const input = event.currentTarget;
                  if (!tagList.includes(input.value)) {
                    tagList.push(input.value);
                  }

                  input.value = '';
                }
              }}
            />
          </fieldset>

          <div class="tag-list">
            {#each tagList as tag, i (tag)}
              <button
                transition:scale|local={{ duration: 200 }}
                animate:flip={{ duration: 200 }}
                class="tag-default tag-pill"
                type="button"
                onclick={() => {
                  tagList.splice(i, 1);
                }}
                aria-label="Remove {tag} tag"
              >
                <i class="ion-close-round"></i>
                {tag}
              </button>
            {/each}
          </div>

          {#each tagList as tag}
            <input hidden name="tag" value={tag} />
          {/each}

          <button class="btn btn-lg pull-xs-right btn-primary">Publish Article</button>
        </form>
      </div>
    </div>
  </div>
</div>

<style>
  .tag-pill {
    border: none;
  }
</style>
