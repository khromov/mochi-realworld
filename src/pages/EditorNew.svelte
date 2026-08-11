<script lang="ts">
  import type { MochiFormResult } from 'mochi-framework';
  import EditorForm from '../lib/editor/EditorForm.svelte';
  import { formErrors } from '../lib/form';
  import Layout from '../lib/Layout.svelte';
  import type { PublicUser } from '../lib/types';

  const {
    user,
    pathname,
    form,
  }: { user: PublicUser | null; pathname: string; form?: MochiFormResult } = $props();
</script>

<Layout {user} {pathname}>
  <EditorForm
    mochi:hydrate
    article={{
      title: '',
      description: '',
      body: '',
      tagList: [],
    }}
    errors={formErrors(form)}
  />
</Layout>
