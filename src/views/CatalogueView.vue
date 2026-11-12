<template>
  <section ref="scrollArea" class="catalogue-page" aria-labelledby="catalogue-title" @scroll.passive="rememberScroll">
    <div ref="intro" class="catalogue-page__content catalogue-page__intro">
      <h1 id="catalogue-title">Découvrez les frises</h1>
      <p>Une époque, une découverte, un parcours : choisissez une frise et explorez son histoire.</p>
    </div>
    <div class="catalogue-page__filters" :class="{ 'is-pinned': filtersPinned }">
      <div class="catalogue-page__content">
        <CatalogueToolbar v-model:search="browse.search" placeholder="Rechercher une frise…">
          <template #filters><CatalogueFilters v-model:tags="browse.tagIds" v-model:time-range="browse.timeRange" v-model:period="browse.period" hide-visibility :tag-options="tagOptions" /></template>
        </CatalogueToolbar>
      </div>
    </div>
    <div class="catalogue-page__content">
      <FeedbackState v-if="loading" kind="loading" message="Chargement des frises…" />
      <FeedbackState v-else-if="error" kind="error" :message="error" retryable @retry="load" />
      <template v-else>
        <p class="catalogue-page__count" role="status">{{ visibleStories.length }} {{ visibleStories.length === 1 ? 'frise à explorer' : 'frises à explorer' }}</p>
        <ul v-if="visibleStories.length" class="catalogue-page__grid" aria-label="Frises publiques">
          <PublicStoryCard v-for="story in visibleStories" :key="story.id" :story="story" :editable="canUseWorkspace(auth) && auth.canEditStory(story)" />
        </ul>
        <FeedbackState v-else :title="publicStories.length ? 'Aucune frise ne correspond à votre recherche' : 'Les frises arrivent bientôt'" :message="publicStories.length ? 'Essayez un autre sujet ou élargissez vos filtres.' : 'Revenez prochainement découvrir les premières frises publiques.'">
          <template v-if="hasFilters" #actions><Button variant="secondary" size="sm" @click="browse.reset">Effacer les filtres</Button></template>
        </FeedbackState>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
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
import { canUseWorkspace } from '@/router/access';
import { matchesTags, tagFilterOptions } from '@/lib/tags';
import { storyOverlapsRange } from '@/lib/storyTimeFilter';

const data = useDataStore();
const auth = useAuthStore();
const browse = useCatalogueBrowseStore();
const requests = useLatestRequest();
const loading = ref(true);
const error = ref<string | null>(null);
const scrollArea = ref<HTMLElement>();
const intro = ref<HTMLElement>();
const filtersPinned = ref(false);
let introObserver: ResizeObserver | undefined;
function updatePinnedFilters() {
  if (!scrollArea.value || !intro.value) return;
  filtersPinned.value = scrollArea.value.scrollTop > 0 && scrollArea.value.scrollTop >= intro.value.offsetHeight;
}
// The workspace list can also contain owned private frises; discovery is always public.
const publicStories = computed(() => data.stories.filter(story => story.isPublic));
const tagOptions = computed(() => tagFilterOptions(publicStories.value));
const normalized = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr');
const visibleStories = computed(() => {
  const words = normalized(browse.search.trim()).split(/\s+/).filter(Boolean);
  const now = Date.now();
  return publicStories.value.filter(story => {
    const text = normalized([story.title.fr, story.title.en, story.description?.fr, story.description?.en].filter(Boolean).join(' '));
    return words.every(word => text.includes(word)) && matchesTags(story, browse.tagIds)
      && (!browse.timeRange || storyOverlapsRange(story, browse.timeRange, now))
      && (!browse.period || storyOverlapsRange(story, browse.period.range, now));
  });
});
const hasFilters = computed(() => !!(browse.search || browse.tagIds.length || browse.timeRange || browse.period));
function rememberScroll() {
  if (scrollArea.value) browse.scrollTop = scrollArea.value.scrollTop;
  updatePinnedFilters();
}
async function load() {
  const isCurrent = requests.begin();
  const previousScroll = browse.scrollTop;
  loading.value = true; error.value = null;
  try {
    await data.ensureStoriesLoaded(true, false, requests.signal);
    if (!isCurrent()) return;
    loading.value = false;
    await nextTick();
    if (isCurrent() && scrollArea.value) { scrollArea.value.scrollTop = previousScroll; updatePinnedFilters(); }
  } catch (cause) {
    if (isCurrent()) error.value = cause instanceof Error ? cause.message : 'Impossible de charger les frises. Réessayez.';
  } finally { if (isCurrent()) loading.value = false; }
}
watch(() => auth.identityVersion, load);
watch([() => browse.search, () => browse.tagIds, () => browse.timeRange, () => browse.period], () => {
  browse.scrollTop = 0;
  if (scrollArea.value) scrollArea.value.scrollTop = 0;
  updatePinnedFilters();
}, { deep: true });
onMounted(load);
onMounted(() => {
  if (intro.value && typeof ResizeObserver !== 'undefined') {
    introObserver = new ResizeObserver(updatePinnedFilters);
    introObserver.observe(intro.value);
  }
  updatePinnedFilters();
});
onBeforeUnmount(() => { rememberScroll(); introObserver?.disconnect(); });
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
@media (max-width: 1100px) { .catalogue-page__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 800px) { .catalogue-page__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 480px) { .catalogue-page__content { padding-inline: var(--spacing-md); } .catalogue-page__intro { padding-block: var(--spacing-lg); } .catalogue-page__grid { grid-template-columns: minmax(0, 1fr); } }
</style>
