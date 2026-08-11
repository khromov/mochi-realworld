<script lang="ts">
  import { enhance } from 'mochi-framework';
</script>

<form method="POST" action="?/deleteArticle" {@attach enhance()}>
  <button class="btn btn-outline-danger btn-sm">
    <i class="ion-trash-a"></i> Delete Article
  </button>
</form>
