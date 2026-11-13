<template>
  <section ref="scrollArea" class="catalogue-page" aria-labelledby="catalogue-title" @scroll.passive="rememberScroll">
    <div ref="intro" class="catalogue-page__content catalogue-page__intro">
      <h1 id="catalogue-title">{{ uiText("Découvrez les frises") }}</h1>
      <p>{{ uiText("Une époque, une découverte, un parcours : choisissez une frise et explorez son histoire.") }}</p>
    </div>
    <div class="catalogue-page__filters" :class="{ 'is-pinned': filtersPinned }">
      <div class="catalogue-page__content">
        <CatalogueToolbar v-model:search="browse.search" :placeholder="uiText('Rechercher une frise…')">
          <template #filters><CatalogueFilters v-model:tags="browse.tagIds" v-model:time-range="browse.timeRange" v-model:period="browse.period" hide-visibility :tag-options="tagOptions" /></template>
        </CatalogueToolbar>
      </div>
    </div>
    <div class="catalogue-page__content">
      <FeedbackState v-if="loading" kind="loading" :message="uiText('Chargement des frises…')" />
      <FeedbackState v-else-if="error" kind="error" :message="uiText(error)" retryable @retry="loadFirst(true)" />
      <template v-else>
        <p class="catalogue-page__count" role="status">{{ uiText(countLabel) }}</p>
        <ul v-if="visibleStories.length" class="catalogue-page__grid" :aria-label="uiText('Frises publiques')">
          <PublicStoryCard v-for="story in visibleStories" :key="story.id" :story="story" />
        </ul>
        <FeedbackState v-else :title="uiText(catalogue?.publicTotal || hasFilters ? 'Aucune frise ne correspond à votre recherche' : 'Les frises arrivent bientôt')" :message="uiText(catalogue?.publicTotal || hasFilters ? 'Essayez un autre sujet ou élargissez vos filtres.' : 'Revenez prochainement découvrir les premières frises publiques.')">
          <template v-if="hasFilters" #actions><Button variant="secondary" size="sm" @click="browse.reset">{{ uiText("Effacer les filtres") }}</Button></template>
        </FeedbackState>
        <div v-if="visibleStories.length" ref="pageEnd" class="catalogue-page__more">
          <FeedbackState v-if="loadingMore" kind="loading" layout="inline" :message="uiText('Chargement des frises suivantes…')" />
          <FeedbackState v-else-if="moreError" kind="error" layout="inline" :message="uiText(moreError)" retryable @retry="loadMore" />
          <Button v-else-if="catalogue?.nextCursor" variant="secondary" size="sm" @click="loadMore">{{ uiText("Charger plus de frises") }}</Button>
          <p v-else class="catalogue-page__end">{{ uiText("Vous avez parcouru toutes les frises") }}{{ uiText(hasFilters ? ' correspondant à ces filtres' : '') }}.</p>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { uiFormat, uiText } from '@/i18n';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Button from '@/components/base/Button.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import CatalogueToolbar from '@/components/filters/CatalogueToolbar.vue';
import CatalogueFilters from '@/components/filters/CatalogueFilters.vue';
import PublicStoryCard from '@/components/catalogue/PublicStoryCard.vue';
import { useDataStore } from '@/stores/useDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCatalogueBrowseStore } from '@/stores/useCatalogueBrowseStore';
import { useLatestRequest } from '@/composables/useLatestRequest';
import { tagFilterOptions } from '@/lib/tags';
import { StoryApiService, type StoryCatalogueQuery } from '@/services/StoryApiService';

const data = useDataStore();
const auth = useAuthStore();
const browse = useCatalogueBrowseStore();
const requests = useLatestRequest();
const loading = ref(true);
const error = ref<string | null>(null);
const loadingMore = ref(false);
const moreError = ref<string | null>(null);
const scrollArea = ref<HTMLElement>();
const pageEnd = ref<HTMLElement>();
const intro = ref<HTMLElement>();
const filtersPinned = ref(false);
let introObserver: ResizeObserver | undefined;
let endObserver: IntersectionObserver | undefined;
let searchTimer: ReturnType<typeof setTimeout> | undefined;
function updatePinnedFilters() {
  if (!scrollArea.value || !intro.value) return;
  filtersPinned.value = scrollArea.value.scrollTop > 0 && scrollArea.value.scrollTop >= intro.value.offsetHeight;
}
const query = computed<StoryCatalogueQuery>(() => ({ search: browse.search.trim(), tagIds: [...browse.tagIds].sort(), timeRange: browse.timeRange, periodRange: browse.period?.range ?? null }));
const queryKey = computed(() => JSON.stringify(query.value));
const catalogue = computed(() => data.publicCatalogue?.key === queryKey.value ? data.publicCatalogue : null);
const visibleStories = computed(() => catalogue.value?.items ?? []);
// Facets describe the whole public catalogue, never just the pages loaded so far.
const tagOptions = computed(() => tagFilterOptions([{ tags: data.publicCatalogue?.tags ?? [] }]));
const countLabel = computed(() => {
  const count = visibleStories.value.length;
  if (!catalogue.value?.nextCursor) return `${count} ${count === 1 ? 'frise à explorer' : 'frises à explorer'}`;
  const displayed = count === 1 ? 'frise affichée' : 'frises affichées';
  if (catalogue.value?.total != null && catalogue.value.total > count) return uiFormat`${count} ${displayed} sur ${catalogue.value.total}`;
  return `${count} ${displayed}`;
});
const hasFilters = computed(() => !!(browse.search || browse.tagIds.length || browse.timeRange || browse.period));
function rememberScroll() {
  if (scrollArea.value) browse.scrollTop = scrollArea.value.scrollTop;
  updatePinnedFilters();
  maybeLoadMore();
}
function maybeLoadMore() {
  const area = scrollArea.value;
  if (area && area.clientHeight > 0 && !moreError.value && area.scrollHeight - area.scrollTop - area.clientHeight < 600) void loadMore();
}
async function loadFirst(force = false) {
  clearTimeout(searchTimer);
  const isCurrent = requests.begin();
  const previousScroll = browse.scrollTop;
  const key = queryKey.value;
  loading.value = true; loadingMore.value = false; error.value = null; moreError.value = null;
  try {
    if (force || !catalogue.value) {
      const page = await StoryApiService.getInstance().getPublicCatalogue(query.value, { signal: requests.signal });
      if (!isCurrent() || key !== queryKey.value) return;
      data.savePublicCataloguePage(key, page);
    }
    if (!isCurrent()) return;
    loading.value = false;
    await nextTick();
    if (isCurrent() && scrollArea.value) { scrollArea.value.scrollTop = previousScroll; updatePinnedFilters(); }
  } catch (cause) {
    if (isCurrent()) error.value = cause instanceof Error ? cause.message : 'Impossible de charger les frises. Réessayez.';
  } finally { if (isCurrent()) loading.value = false; }
}
async function loadMore() {
  const current = catalogue.value;
  if (loading.value || loadingMore.value || !current?.nextCursor || error.value) return;
  const key = queryKey.value;
  const isCurrent = requests.begin();
  loadingMore.value = true; moreError.value = null;
  try {
    const page = await StoryApiService.getInstance().getPublicCatalogue(query.value, { cursor: current.nextCursor, signal: requests.signal });
    if (!isCurrent() || key !== queryKey.value) return;
    data.savePublicCataloguePage(key, page, true);
  } catch (cause) {
    if (isCurrent()) moreError.value = cause instanceof Error ? cause.message : 'Impossible de charger la suite des frises. Réessayez.';
  } finally {
    if (isCurrent()) {
      loadingMore.value = false;
      await nextTick();
      if (!moreError.value) maybeLoadMore();
    }
  }
}
watch(() => auth.identityVersion, () => { void loadFirst(true); });
watch(queryKey, (_next, previous) => {
  requests.cancel(); clearTimeout(searchTimer);
  loading.value = true; loadingMore.value = false;
  browse.scrollTop = 0;
  if (scrollArea.value) scrollArea.value.scrollTop = 0;
  updatePinnedFilters();
  const searchChanged = previous !== undefined && JSON.parse(previous).search !== query.value.search;
  if (searchChanged && query.value.search) searchTimer = setTimeout(() => { void loadFirst(true); }, 250);
  else void loadFirst(true);
});
watch(pageEnd, element => {
  endObserver?.disconnect();
  if (element && scrollArea.value && typeof IntersectionObserver !== 'undefined') {
    endObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && !moreError.value) void loadMore();
    }, { root: scrollArea.value, rootMargin: '600px' });
    endObserver.observe(element);
  }
}, { flush: 'post' });
onMounted(() => { void loadFirst(); });
onMounted(() => {
  if (intro.value && typeof ResizeObserver !== 'undefined') {
    introObserver = new ResizeObserver(updatePinnedFilters);
    introObserver.observe(intro.value);
  }
  updatePinnedFilters();
});
onBeforeUnmount(() => {
  if (scrollArea.value) browse.scrollTop = scrollArea.value.scrollTop;
  clearTimeout(searchTimer); endObserver?.disconnect(); introObserver?.disconnect();
});
</script>

<style scoped>
.catalogue-page { overflow-y: auto; box-sizing: border-box; }
.catalogue-page__content { max-width: 1440px; margin-inline: auto; padding-inline: var(--spacing-lg); box-sizing: border-box; }
.catalogue-page__intro { padding-block: var(--spacing-xl); }
.catalogue-page__filters { position: sticky; top: 0; z-index: var(--z-index-sticky); padding-block: var(--spacing-md); background: transparent; border-bottom: 1px solid transparent; }
.catalogue-page__filters.is-pinned { background: var(--color-surface-default); border-bottom-color: var(--color-border-default); }
.catalogue-page__intro h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: var(--font-weight-semibold); }
.catalogue-page__intro p { margin: 0; color: var(--color-text-secondary); font: var(--type-body); }
.catalogue-page__count { margin: var(--spacing-lg) 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.catalogue-page__grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--spacing-lg); padding: 0; margin: 0 0 var(--spacing-xl); list-style: none; }
.catalogue-page__more { display: flex; justify-content: center; min-height: var(--field-height-lg); padding-bottom: var(--spacing-xl); }
.catalogue-page__end { margin: 0; font: var(--type-meta); color: var(--color-text-secondary); }
@media (max-width: 1100px) { .catalogue-page__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 800px) { .catalogue-page__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 480px) { .catalogue-page__content { padding-inline: var(--spacing-md); } .catalogue-page__intro { padding-block: var(--spacing-lg); } .catalogue-page__grid { grid-template-columns: minmax(0, 1fr); } }
</style>
