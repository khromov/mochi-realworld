<script lang="ts">
  import type { MochiFormResult } from 'mochi-framework';
  import EditorForm from '../lib/editor/EditorForm.svelte';
  import { formErrors } from '../lib/form';
  import Layout from '../lib/Layout.svelte';
  import type { ArticleDraft, PublicUser } from '../lib/types';

  const {
    user,
    pathname,
    article,
    form,
  }: {
    user: PublicUser | null;
    pathname: string;
    article: ArticleDraft;
    form?: MochiFormResult;
  } = $props();
</script>

<Layout {user} {pathname}>
  <EditorForm mochi:hydrate {article} errors={formErrors(form)} />
</Layout>
