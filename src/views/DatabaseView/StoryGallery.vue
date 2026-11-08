<template>
  <section class="story-gallery" aria-label="Toutes les frises">
    <div class="story-gallery__header">
      <CatalogueToolbar v-model:search="search" placeholder="Rechercher une frise…">
        <template #filters><StoryFilters v-model="visibility" v-model:time-range="timeRange" v-model:period="period" v-model:tags="tags" :tag-options="tagOptions" /></template>
        <template #actions>
          <div class="story-gallery__views" role="group" aria-label="Affichage des frises">
            <Button variant="tertiary" size="sm" icon-only :pressed="view === 'cards'" aria-label="Afficher en cartes" @click="setView('cards')"><template #icon><Icon icon="mdi:view-grid" width="18" height="18" /></template></Button>
            <Button variant="tertiary" size="sm" icon-only :pressed="view === 'list'" aria-label="Afficher en liste" @click="setView('list')"><template #icon><DesignIcon name="list" /></template></Button>
          </div>
          <Button v-if="canCreate" size="sm" @click="$emit('create')"><template #icon><DesignIcon name="plus" /></template>Créer une frise</Button>
          <Button v-else size="sm" variant="secondary" :to="{ name: 'profile' }">Choisir un nom d’utilisateur</Button>
          <Button size="sm" variant="secondary" to="/generate">Depuis Wikidata</Button>
        </template>
      </CatalogueToolbar>
    </div>
    <p v-if="!canCreate" role="status" class="story-gallery__notice">Choisissez un nom d’utilisateur dans votre profil : il signe vos frises et il est nécessaire pour en créer.</p>
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
    <CatalogueTable v-else-if="stories.length" class="story-gallery__table" label="Frises" density="comfortable" :columns="columns" :items="stories" empty-text="Aucune frise">
      <template #row="{ item: story }">
        <span class="col-label" role="cell">
          <button type="button" class="catalogue-label-button catalogue-label-button--row" @click="$emit('open', story)">{{ titleOf(story) }}</button>
          <span class="story-card__meta">{{ countsOf(story) }}</span>
        </span>
        <span class="col-date" role="cell">{{ formatStorySpan(story) }}</span>
        <span class="col-updated" role="cell">{{ formatRecordAge(story.updatedAt, now) }}</span>
        <span class="col-date" role="cell">{{ formatRecordDate(story.createdAt) }}</span>
      </template>
    </CatalogueTable>
    <FeedbackState v-else :title="isFirstStory ? 'Votre première frise commence ici' : undefined">
      <template v-if="isFirstStory" #icon><Icon icon="mdi:timeline-plus-outline" width="32" height="32" /></template>
      <template v-if="isFirstStory">Aucune frise pour le moment. Explorez une époque, racontez une histoire ou retracez un parcours en réunissant périodes et événements.</template>
      <template v-else>Aucune frise ne correspond à votre recherche.</template>
      <template v-if="canCreate" #actions><Button size="sm" @click="$emit('create')"><template #icon><DesignIcon name="plus" /></template>{{ isFirstStory ? 'Créer ma première frise' : 'Créer une frise' }}</Button></template>
    </FeedbackState>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import DesignIcon from '@/components/base/DesignIcon.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import CatalogueTable from '@/components/catalogue/CatalogueTable.vue';
import type { CatalogueColumn } from '@/components/catalogue/columns';
import CatalogueToolbar from '@/components/filters/CatalogueToolbar.vue';
import StoryTimeline from '@/components/StoryTimeline.vue';
import StoryFilters from './StoryFilters.vue';
import type { StorySummary } from '@/types/database';
import type { PeriodFilter } from '@/components/filters/filterTypes';
import type { StoryTimeRange } from '@/lib/storyTimeFilter';
import { formatRecordAge, formatRecordDate, formatStorySpan } from '@/lib/storyListDates';

const props = withDefaults(defineProps<{ stories: StorySummary[]; totalStories: number; tagOptions: { value: string; label: string; group?: string }[]; error?: string | null; /** False when the account has no username yet. */ canCreate?: boolean }>(), { error: null, canCreate: true });
defineEmits<{ open: [story: StorySummary]; create: [] }>();
const search = defineModel<string>('search', { required: true });
const visibility = defineModel<'all' | 'public' | 'private'>('visibility', { required: true });
const period = defineModel<PeriodFilter | null>('period', { default: null });
const timeRange = defineModel<StoryTimeRange | null>('timeRange', { required: true });
const tags = defineModel<string[]>('tags', { required: true });

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
const columns: CatalogueColumn[] = [
  { key: 'title', label: 'Frise', minWidth: 260 },
  { key: 'span', label: 'Début – Fin', minWidth: 240 },
  { key: 'updated', label: 'Modifié', width: 160 },
  { key: 'created', label: 'Création', width: 150 },
];

const isFirstStory = computed(() => props.totalStories === 0);

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
.story-gallery__views { display: flex; gap: var(--spacing-xs); }
.story-gallery__notice { margin: 0; padding: 0 var(--spacing-lg) var(--spacing-sm); color: var(--color-status-error-foreground); }
.story-gallery__grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--spacing-lg); margin: 0; padding: 0 var(--spacing-lg) var(--spacing-xl); list-style: none; align-content: start; }
.story-card { --story-timeline-background: var(--color-surface-raised); position: relative; display: flex; flex-direction: column; gap: var(--spacing-lg); min-width: 0; padding: var(--spacing-lg); background: var(--story-timeline-background); border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); overflow: hidden; transition: border-color var(--transition-fast), background-color var(--transition-fast); }
.story-card:hover { --story-timeline-background: var(--color-surface-raised-hover); background: var(--story-timeline-background); border-color: var(--color-border-strong); }
.story-card:has(.story-card__open:focus-visible) { outline: 2px solid var(--color-border-focus); outline-offset: 3px; }
/* Room for four period lines and the event line, so every card's text starts at the same height. */
.story-card__preview { height: 58px; border-radius: var(--radius-sm); overflow: hidden; }
.story-card__text { display: flex; flex-direction: column; min-width: 0; }
.story-card__title { margin: 0; font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); line-height: var(--line-height-control); }
.story-card__open { display: block; width: 100%; padding: 0; border: 0; background: none; color: var(--color-text-primary); font: inherit; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
/* The whole card opens the frise; the button keeps a short accessible name. */
.story-card__open::after { content: ''; position: absolute; inset: 0; }
.story-card__open:focus-visible { outline: none; }
.story-card__meta { margin: 0; font-size: var(--font-size-xs); line-height: var(--line-height-small); color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 1100px) { .story-gallery__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 800px) { .story-gallery__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 480px) {
  .story-gallery__grid { grid-template-columns: minmax(0, 1fr); }
  .story-gallery__header, .story-gallery__grid { padding-inline: var(--spacing-md); }
}
.story-gallery__table { margin: 0 var(--spacing-lg) var(--spacing-xl); }
@media (max-width: 480px) { .story-gallery__table { margin-inline: var(--spacing-md); } }
</style>
