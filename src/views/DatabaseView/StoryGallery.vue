<template>
  <section class="story-gallery" aria-label="Toutes les frises">
    <div class="story-gallery__header">
      <div class="story-gallery__toolbar">
        <div class="story-gallery__filters">
          <SearchInput v-model="search" class="story-gallery__search" placeholder="Rechercher une frise…" aria-label="Rechercher une frise" />
          <StoryFilters v-model="visibility" v-model:time-range="timeRange" v-model:categories="categories" :category-options="categoryOptions" />
        </div>
        <div class="story-gallery__actions">
          <div class="story-gallery__views" role="group" aria-label="Affichage des frises">
            <Button variant="tertiary" size="sm" icon-only :pressed="view === 'cards'" aria-label="Afficher en cartes" @click="setView('cards')"><template #icon><Icon icon="mdi:view-grid" width="18" height="18" /></template></Button>
            <Button variant="tertiary" size="sm" icon-only :pressed="view === 'list'" aria-label="Afficher en liste" @click="setView('list')"><template #icon><DesignIcon name="list" /></template></Button>
          </div>
          <Button size="sm" @click="$emit('create')"><template #icon><DesignIcon name="plus" /></template>Créer une frise</Button>
        </div>
      </div>
      <ul v-if="activeFilters.length" class="story-gallery__chips" aria-label="Filtres actifs">
        <li v-for="filter in activeFilters" :key="filter.key" class="story-gallery__chip">
          <span>{{ filter.label }}</span>
          <button type="button" :aria-label="`Retirer le filtre ${filter.label}`" @click="filter.clear"><DesignIcon name="tag-close" /></button>
        </li>
      </ul>
    </div>
    <p v-if="error" role="alert" class="story-gallery__notice">{{ error }}</p>
    <ul v-if="stories.length && view === 'cards'" class="story-gallery__grid" aria-label="Frises">
      <li v-for="story in stories" :key="story.id" class="story-card">
        <div class="story-card__preview" aria-hidden="true"><StoryTimeline :periods="story.previewPeriods" :events="story.previewEvents" compact /></div>
        <div class="story-card__text">
          <h3 class="story-card__title"><button type="button" class="story-card__open" @click="$emit('open', story)">{{ titleOf(story) }}</button></h3>
          <p class="story-card__meta">{{ countsOf(story) }}</p>
          <p class="story-card__meta">{{ formatStorySpan(story) }}</p>
        </div>
      </li>
    </ul>
    <div v-else-if="stories.length" class="story-gallery__table-wrap" role="region" aria-label="Liste des frises" tabindex="0">
      <table class="story-table">
        <thead>
          <tr><th scope="col">Frise</th><th scope="col">Début – Fin</th><th scope="col">Last edit</th><th scope="col">Création</th></tr>
        </thead>
        <tbody>
          <tr v-for="story in stories" :key="story.id" class="story-table__row">
            <th scope="row">
              <button type="button" class="story-table__open" @click="$emit('open', story)">{{ titleOf(story) }}</button>
              <span class="story-table__meta">{{ countsOf(story) }}</span>
            </th>
            <td>{{ formatStorySpan(story) }}</td>
            <td>{{ formatRecordAge(story.updatedAt, now) }}</td>
            <td>{{ formatRecordDate(story.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="story-gallery__empty">
      <p>{{ activeFilters.length || search ? 'Aucune frise ne correspond à votre recherche.' : 'Aucune frise pour le moment.' }}</p>
      <Button size="sm" @click="$emit('create')">Créer une frise</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import DesignIcon from '@/components/base/DesignIcon.vue';
import SearchInput from '@/components/base/SearchInput.vue';
import StoryTimeline from '@/components/StoryTimeline.vue';
import StoryFilters from './StoryFilters.vue';
import type { StorySummary } from '@/types/database';
import { formatStoryTimeRange, type StoryTimeRange } from '@/lib/storyTimeFilter';
import { formatRecordAge, formatRecordDate, formatStorySpan } from '@/lib/storyListDates';

const props = defineProps<{ stories: StorySummary[]; categoryOptions: { value: string; label: string }[]; error?: string | null }>();
defineEmits<{ open: [story: StorySummary]; create: [] }>();
const search = defineModel<string>('search', { required: true });
const visibility = defineModel<'all' | 'public' | 'private'>('visibility', { required: true });
const timeRange = defineModel<StoryTimeRange | null>('timeRange', { required: true });
const categories = defineModel<string[]>('categories', { required: true });

// Préférence d'affichage propre à ce navigateur ; la page reste utilisable sans stockage.
const VIEW_KEY = 'frises:view';
type GalleryView = 'cards' | 'list';
const view = ref<GalleryView>(readView());
function readView(): GalleryView {
  try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'cards'; } catch { return 'cards'; }
}
function setView(next: GalleryView) {
  view.value = next;
  try { localStorage.setItem(VIEW_KEY, next); } catch { /* préférence non conservée */ }
}
/** Instant de référence des âges relatifs, fixé au rendu de la liste. */
const now = Date.now();

const activeFilters = computed(() => [
  ...(visibility.value !== 'all' ? [{ key: 'visibility', label: visibility.value === 'public' ? 'Frises publiques' : 'Frises privées', clear: () => { visibility.value = 'all'; } }] : []),
  ...(timeRange.value ? [{ key: 'time', label: formatStoryTimeRange(timeRange.value), clear: () => { timeRange.value = null; } }] : []),
  ...categories.value.map(id => ({
    key: `category:${id}`,
    label: props.categoryOptions.find(option => option.value === id)?.label ?? id,
    clear: () => { categories.value = categories.value.filter(selected => selected !== id); },
  })),
]);

function titleOf(story: StorySummary) { return story.title.fr || story.title.en || 'Sans titre'; }
function countsOf(story: StorySummary) {
  const periods = story.previewPeriods?.length ?? 0;
  const events = story.previewEvents?.length ?? 0;
  return `${periods} ${periods === 1 ? 'période' : 'périodes'} – ${events} ${events === 1 ? 'événement' : 'événements'}`;
}
</script>

<style scoped>
.story-gallery { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow-y: auto; }
.story-gallery__header { display: flex; flex-direction: column; gap: var(--spacing-sm); padding: var(--spacing-lg); }
.story-gallery__toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--spacing-sm) var(--spacing-lg); }
.story-gallery__filters, .story-gallery__actions { display: flex; align-items: center; gap: var(--spacing-sm); min-width: 0; }
.story-gallery__actions { gap: var(--spacing-lg); }
.story-gallery__search { width: 256px; max-width: 100%; }
.story-gallery__views { display: flex; gap: 4px; }
.story-gallery__chips { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); margin: 0; padding: 0; list-style: none; }
.story-gallery__chip { display: inline-flex; align-items: center; gap: var(--spacing-sm); padding: 9px 8px 9px 13px; background: var(--color-interaction-hover); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--font-size-xs); line-height: 16px; color: var(--color-text-secondary); }
.story-gallery__chip button { display: inline-flex; padding: 0; border: 0; background: none; color: inherit; border-radius: var(--radius-sm); cursor: pointer; }
.story-gallery__chip button:hover { color: var(--color-text-primary); }
.story-gallery__chip button:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }
.story-gallery__notice { margin: 0; padding: 0 var(--spacing-lg) var(--spacing-sm); color: var(--color-status-error-foreground); }
.story-gallery__grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--spacing-lg); margin: 0; padding: 0 var(--spacing-lg) 24px; list-style: none; align-content: start; }
.story-card { position: relative; display: flex; flex-direction: column; gap: var(--spacing-lg); min-width: 0; padding: var(--spacing-lg); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; transition: border-color var(--transition-fast), background-color var(--transition-fast); }
.story-card:hover { background: var(--color-surface-hover); border-color: var(--color-border-strong); }
.story-card:has(.story-card__open:focus-visible) { outline: 2px solid var(--color-border-focus); outline-offset: 3px; }
/* Room for four period lines and the event line, so every card's text starts at the same height. */
.story-card__preview { height: 58px; border-radius: var(--radius-sm); overflow: hidden; }
.story-card__text { display: flex; flex-direction: column; min-width: 0; }
.story-card__title { margin: 0; font-size: var(--font-size-base); font-weight: 600; line-height: 18px; }
.story-card__open { display: block; width: 100%; padding: 0; border: 0; background: none; color: var(--color-text-primary); font: inherit; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
/* The whole card opens the frise; the button keeps a short accessible name. */
.story-card__open::after { content: ''; position: absolute; inset: 0; }
.story-card__open:focus-visible { outline: none; }
.story-card__meta { margin: 0; font-size: var(--font-size-xs); line-height: 16px; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.story-gallery__table-wrap { padding: 0 var(--spacing-lg) 24px; overflow-x: auto; }
.story-gallery__table-wrap:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
.story-table { width: 100%; min-width: 640px; border-collapse: separate; border-spacing: 0 4px; table-layout: fixed; font-size: var(--font-size-base); line-height: 18px; }
.story-table th, .story-table td { padding: var(--spacing-md) var(--spacing-lg); background: var(--color-surface); border-block: 1px solid var(--color-border); text-align: left; font-weight: 400; color: var(--color-text-secondary); }
.story-table thead th { height: 52px; color: var(--color-text-primary); }
.story-table th:first-child, .story-table td:first-child { border-left: 1px solid var(--color-border); border-radius: var(--radius-lg) 0 0 var(--radius-lg); }
.story-table th:last-child, .story-table td:last-child { border-right: 1px solid var(--color-border); border-radius: 0 var(--radius-lg) var(--radius-lg) 0; }
.story-table__row { position: relative; }
.story-table__row th, .story-table__row td { height: 68px; transition: background-color var(--transition-fast); }
.story-table__row:hover th, .story-table__row:hover td { background: var(--color-surface-hover); }
.story-table__row:has(.story-table__open:focus-visible) { outline: 2px solid var(--color-border-focus); outline-offset: 1px; }
.story-table__open { display: block; width: 100%; padding: 0; border: 0; background: none; color: var(--color-text-primary); font: inherit; font-weight: 600; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.story-table__open::after { content: ''; position: absolute; inset: 0; }
.story-table__open:focus-visible { outline: none; }
.story-table__meta { display: block; font-size: var(--font-size-xs); line-height: 16px; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.story-gallery__empty { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; padding: 24px; color: var(--color-text-secondary); }
@media (max-width: 1100px) { .story-gallery__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 800px) { .story-gallery__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 480px) {
  .story-gallery__grid { grid-template-columns: minmax(0, 1fr); }
  .story-gallery__header, .story-gallery__grid, .story-gallery__table-wrap { padding-inline: 12px; }
  .story-gallery__filters, .story-gallery__actions { flex-wrap: wrap; width: 100%; }
  .story-gallery__search { flex: 1 1 100%; width: auto; }
  .story-gallery__actions { justify-content: space-between; }
}
</style>
