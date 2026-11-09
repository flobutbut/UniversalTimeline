<template>
  <section class="search-page" aria-labelledby="search-page-title">
    <div class="search-page__content">
      <Button :to="returnPath" variant="tertiary" size="sm"><template #icon><Icon icon="mdi:arrow-left" aria-hidden="true" /></template>Retour</Button>
      <h1 id="search-page-title">Rechercher</h1>
      <p class="search-page__description">Trouvez une frise, un événement ou un sujet Wikidata.</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <GlobalSearch :key="auth.identityVersion" page autofocus @select="selectResult" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import GlobalSearch from '@/components/GlobalSearch.vue';
import { useAuthStore } from '@/stores/useAuthStore';
import { safeReturnPath } from '@/router/access';
import { globalSearchLocation } from '@/router/searchTarget';
import type { GlobalSearchResult } from '@/services/SearchApiService';

const route = useRoute(), router = useRouter(), auth = useAuthStore();
const error = ref<string | null>(null);
const returnPath = computed(() => {
  const path = safeReturnPath(route.query.from);
  return /^\/search(?:[/?#]|$)/.test(path) ? '/timeline' : path;
});
async function selectResult(hit: GlobalSearchResult) {
  error.value = null;
  try { await router.push(globalSearchLocation(hit)); }
  catch { error.value = 'Impossible d’ouvrir ce résultat. Réessayez.'; }
}
</script>

<style scoped>
.search-page { overflow-y: auto; padding: var(--spacing-lg); box-sizing: border-box; }
.search-page__content { max-width: 720px; margin-inline: auto; }
.search-page h1 { margin-block: var(--spacing-xl) var(--spacing-sm); }
.search-page__description { color: var(--color-text-secondary); margin-bottom: var(--spacing-lg); }
</style>
