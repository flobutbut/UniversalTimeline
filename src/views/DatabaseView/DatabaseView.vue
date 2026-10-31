<template>
  <div class="database-view">
    <div v-if="state.loading" class="loading">
      <div class="spinner"></div>
      <span>Chargement des données...</span>
    </div>
    <div v-else-if="state.error" class="error">
      <Icon icon="mdi:alert-circle" />
      <span role="alert">{{ state.error }}</span>
      <button type="button" @click="loadInitialData">Réessayer</button>
    </div>
    <template v-else>
      <p v-if="galleryEnabled && !selectedStoryId && state.storyError" role="alert" class="story-gallery__notice">{{ state.storyError }}</p>
      <div v-if="galleryEnabled && !selectedStoryId" class="story-gallery">
        <div class="story-gallery__toolbar">
          <SearchInput v-model="storySearch" placeholder="Rechercher une frise…" aria-label="Rechercher une frise" />
          <StoryFilters v-model="storyVisibility" />
          <Button size="sm" @click="handleAddStory"><template #icon><DesignIcon name="plus" /></template>Créer une frise</Button>
        </div>
        <div v-if="visibleStories.length" class="story-gallery__grid database-story-tabs-wrap">
          <button v-for="story in visibleStories" :key="story.id" type="button" class="story-card" @click="openStory(story)">
            <span class="story-card__title">{{ story.title.fr || story.title.en || 'Sans titre' }}</span>
            <span class="story-card__meta">{{ story.previewPeriods?.length ?? 0 }} {{ story.previewPeriods?.length === 1 ? 'période' : 'périodes' }} – {{ story.previewEvents?.length ?? 0 }} {{ story.previewEvents?.length === 1 ? 'événement' : 'événements' }}</span>
            <span class="story-card__meta">{{ formatStoryListDateRangeSublabel(story) || 'Dates non déterminées' }}</span>
            <StoryTimeline :periods="story.previewPeriods" :events="story.previewEvents" compact />
          </button>
        </div>
        <div v-else class="story-gallery__empty"><p>{{ storySearch || storyVisibility !== 'all' ? 'Aucune frise ne correspond à votre recherche.' : 'Aucune frise pour le moment.' }}</p><Button size="sm" @click="handleAddStory">Créer une frise</Button></div>
      </div>
      <div v-else class="database-columns-layout">
        <aside class="story-sidebar" aria-label="Frises">
          <div class="story-sidebar__heading"><h2 class="story-sidebar__title">Frises</h2><Button size="sm" @click="handleAddStory"><template #icon><DesignIcon name="plus" /></template>Créer une frise</Button></div>
          <div class="story-sidebar__search"><SearchInput v-model="storySearch" placeholder="Rechercher une frise…" aria-label="Rechercher une frise" /><StoryFilters v-model="storyVisibility" /></div>
          <div class="finder-column-content database-story-tabs-wrap">
            <Tabs v-if="visibleStories.length" :model-value="selectedStoryTabId" :tabs="storyTabs" vertical @update:model-value="onStoryTabSelect" />
            <div v-else class="finder-empty-column">Aucune frise</div>
          </div>
        </aside>
        <div class="database-story-detail-wrap">
          <StoryDetailPanel :key="selectedStoryId ?? 'none'" :story="selectedStory" :loading="state.loadingStoryDetails" :updating="relationsBusy || visibilityBusy || state.loadingDetails || saveLoading || deleteLoading" :error="state.storyError"
            @retry="retryStory" @period-imported="retryStory" @remove-period="removePeriodFromStory" @remove-event="removeEventFromStory" @add-periods="addPeriodsToStory" @event-added="retryStory"
            @add-child-stories="addChildStoriesToStory" @remove-child-story="removeChildStoryFromStory" @add-event-anchor="addEventAnchorToStory" @remove-event-anchor="removeEventAnchorFromStory"
            @change-root="changeRootPeriod" @edit-period="onEditStoryPeriod" @edit-event="onEditStoryEvent" @edit-story="onEditSelectedStory" @toggle-public="toggleStoryVisibility" />
        </div>
      </div>
    </template>
    <EditModal
      v-if="modalState.showAddModal"
      :isOpen="modalState.showAddModal"
      :type="modalState.currentType"
      mode="create"
      :loading="saveLoading"
      :error="saveError"
      @close="closeAddModal"
      @submit="handleSave"
    />
    <EditModal
      v-if="modalState.showEditModal"
      :isOpen="modalState.showEditModal"
      :type="modalState.currentType"
      mode="edit"
      :data="modalState.currentItem"
      :loading="state.loadingDetails || saveLoading || deleteLoading"
      :error="saveError || state.loadingError"
      @close="closeEditModal"
      @submit="handleSave"
      @delete="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { EditFormSubmission } from '@/types/editForm';
import { computed, onMounted, ref, watch, inject } from 'vue';
import { routeLocationKey, routerKey } from 'vue-router';
import SearchInput from '@/components/base/SearchInput.vue';
import DesignIcon from '@/components/base/DesignIcon.vue';
import StoryTimeline from '@/components/StoryTimeline.vue';
import StoryFilters from './StoryFilters.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { useDataStore } from '@/stores/useDataStore';
import { readStoryTarget } from '@/router/storyTarget';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import EditModal from './EditModal.vue';
import StoryDetailPanel from './StoryDetailPanel.vue';
import Tabs from '@/components/base/Tabs.vue';
import { useDatabaseView } from '@/composables/useDatabaseView';
import type { ListStory } from '@/types/database';
import type { Tab } from '@/types/global';
import { formatStoryListDateRangeSublabel } from '@/lib/formatTemporalBoundLabel';
import { findById } from '@/lib/collectionUtils';
import { useDatabaseSave } from '@/composables/useDatabaseSave';
import { useDatabaseDelete } from '@/composables/useDatabaseDelete';

// Utilisation des composables
const {
  state,
  modalState,
  selectedStory,
  selectedStoryId,
  relationsBusy,
  retryStory,
  clearStorySelection,
  changeRootPeriod,
  filteredStories,
  handleAddStory: openAddStory,
  handleEditStory,
  handleEditPeriod,
  handleEditEvent,
  closeAddModal,
  closeEditModal,
  loadInitialData,
  selectStory,
  removePeriodFromStory,
  removeEventFromStory,
  addPeriodsToStory,
  addChildStoriesToStory,
  removeChildStoryFromStory,
  addEventAnchorToStory,
  removeEventAnchorFromStory,
} = useDatabaseView();

const route = inject(routeLocationKey, undefined);
const router = inject(routerKey, undefined);
// Temporarily keep the gallery unavailable; retain it for a later release.
const galleryEnabled = false;
const storySearch = ref('');
const storyVisibility = ref<'all' | 'public' | 'private'>('all');
const visibilityBusy = ref(false);
const visibleStories = computed(() => {
  const query = storySearch.value.trim().toLocaleLowerCase('fr');
  return filteredStories.value.filter(story => (!query || `${story.title.fr} ${story.title.en}`.toLocaleLowerCase('fr').includes(query)) && (storyVisibility.value === 'all' || story.isPublic === (storyVisibility.value === 'public')));
});
function openStory(story: ListStory) {
  void selectStory(story);
  if (router) void router.replace({ name: 'database', query: { story: story.id } });
}
async function openRouteStory() {
  try {
    const id = readStoryTarget(route?.query.story);
    if (!id) { clearStorySelection(); return; }
    if (id === selectedStoryId.value) return;
    const story = filteredStories.value.find(s => s.id === id);
    if (story) await selectStory(story);
    else { clearStorySelection(); state.value.storyError = 'Cette frise est introuvable ou inaccessible.'; }
  } catch { state.value.error = 'La frise demandée est invalide.'; }
}
if (route) watch(() => route.query.story, () => { if (!state.value.loading) void openRouteStory(); });
async function toggleStoryVisibility() {
  const story = selectedStory.value;
  if (!story || relationsBusy.value || visibilityBusy.value) return;
  visibilityBusy.value = true;
  try {
    const updated = await StoryApiService.getInstance().updateStory(story.id, { title: story.title, description: story.description, author: story.author, isPublic: !story.isPublic, categories: story.categories });
    useDataStore().upsertSavedStory(updated);
    await retryStory();
  } catch { if (selectedStoryId.value === story.id) state.value.storyError = 'Impossible de modifier la visibilité. Réessayez.'; }
  finally { visibilityBusy.value = false; }
}

const storyTabs = computed<Tab<string>[]>(() =>
  visibleStories.value.map((s: ListStory) => ({
    label: s.title?.fr || s.title?.en || 'Sans titre',
    value: s.id,
    sublabel: formatStoryListDateRangeSublabel(s),
  }))
);

const selectedStoryTabId = computed(() => selectedStoryId.value ?? '');

function onStoryTabSelect(id: string) {
  const story = findById(filteredStories.value, id);
  if (story) openStory(story);
}

function handleAddStory() {
  saveError.value = null;
  openAddStory();
}

function onEditStoryPeriod(id: string) {
  if (relationsBusy.value || saveLoading.value || deleteLoading.value || state.value.loadingDetails) return;
  const period = selectedStory.value?.periods.find(period => period.id === id);
  if (!period) return;
  saveError.value = null;
  void handleEditPeriod(period);
}

function onEditStoryEvent(id: string) {
  if (relationsBusy.value || saveLoading.value || deleteLoading.value || state.value.loadingDetails) return;
  const event = selectedStory.value?.events.find(event => event.id === id);
  if (!event) return;
  saveError.value = null;
  void handleEditEvent(event);
}

function onEditSelectedStory() {
  saveError.value = null;
  if (!selectedStory.value) return;
  const listStory = findById(filteredStories.value, selectedStory.value.id);
  if (listStory) handleEditStory(listStory);
}

const { handleSave: saveHandler, loading: saveLoading, error: saveError } = useDatabaseSave();
const { handleDelete: deleteHandler, loading: deleteLoading } = useDatabaseDelete();

const handleSave = async (formData: EditFormSubmission) => {
  if (saveLoading.value || deleteLoading.value) return;
  const savedId = modalState.value.currentItem?.id;
  const savedType = modalState.value.currentType;
  const success = await saveHandler(
    formData, 
    modalState.value.currentType, 
    modalState.value.currentMode, 
    modalState.value.currentItem
  );
  
  if (success) {
    closeAddModal();
    closeEditModal();
    if (savedId === selectedStoryId.value || (savedType === 'period' && selectedStory.value?.periods.some(period => period.id === savedId)) || (savedType === 'event' && selectedStory.value?.events.some(event => event.id === savedId))) await retryStory();
  }
};

const handleDelete = async () => {
  if (saveLoading.value || deleteLoading.value) return;
  const deletedId = modalState.value.currentItem?.id;
  const success = await deleteHandler(modalState.value.currentItem, modalState.value.currentType);
  if (success) {
    closeEditModal();
    if (selectedStoryId.value === deletedId) clearStorySelection();
  }
};

// Charger les données au montage du composant
onMounted(async () => {
  await loadInitialData();
  if (route && !state.value.error) await openRouteStory();
});
</script>

<style scoped>
.database-view { height: 100%; min-height: 0; background: var(--color-background); }
.loading, .error { height: 100%; display: flex; align-items: center; justify-content: center; gap: 12px; }
.error { color: var(--color-status-error-foreground); }
.story-gallery__notice { padding: 12px 16px; color: var(--color-status-error-foreground); margin: 0; }
.story-gallery { display: flex; flex-direction: column; height: 100%; overflow-y: auto; }
.story-gallery__toolbar { display: flex; align-items: center; gap: 8px; padding: 12px 16px; min-height: 60px; flex-shrink: 0; }
.story-gallery__toolbar > .base-search-input, .story-gallery__toolbar > :first-child { flex: 1; min-width: 0; }
.story-gallery__grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; padding: 76px 16px 24px; align-content: start; }
.story-card { display: flex; flex-direction: column; min-width: 0; height: 138px; padding: 12px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); text-align: left; transition: border-color var(--transition-fast), background-color var(--transition-fast); }
.story-card:hover { background: var(--color-surface-hover); border-color: var(--color-border-strong); }
.story-card:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 3px; }
.story-card__title { width: 100%; font-size: var(--font-size-base); font-weight: 600; line-height: var(--line-height-body); white-space: nowrap; text-overflow: ellipsis; overflow: hidden; margin-bottom: 4px; }
.story-card__meta { font-size: var(--font-size-xs); line-height: 16px; color: var(--color-text-secondary); }
.story-gallery__empty { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; padding: 24px; color: var(--color-text-secondary); }
.database-columns-layout { display: grid; grid-template-columns: 300px minmax(0, 1fr); height: 100%; min-height: 0; }
.story-sidebar { display: flex; flex-direction: column; min-height: 0; background: var(--color-surface); border-right: 1px solid var(--color-border); }
.story-sidebar__heading { display: flex; align-items: center; gap: 8px; padding: 12px; min-height: 64px; }
.story-sidebar__title { margin: 0; flex: 1; text-align: left; font-size: var(--font-size-base); font-weight: 600; line-height: 18px; }
.story-sidebar__search { display: flex; align-items: center; gap: 8px; padding: 12px; min-height: 60px; }
.story-sidebar__search > :first-child { flex: 1; min-width: 0; }
.database-story-detail-wrap { display: flex; flex-direction: column; min-width: 0; min-height: 0; height: 100%; overflow: hidden; }
@media (max-width: 1100px) { .story-gallery__grid { grid-template-columns: repeat(3,minmax(0,1fr)); } }
@media (max-width: 800px) { .story-gallery__grid { grid-template-columns: repeat(2,minmax(0,1fr)); padding-top: 32px; } .database-columns-layout { grid-template-columns: minmax(0,1fr); grid-template-rows: minmax(140px,28%) minmax(0,1fr); } .story-sidebar { border-bottom: 1px solid var(--color-border); border-right: 0; } }
@media (max-width: 480px) { .story-gallery__grid { grid-template-columns: minmax(0,1fr); padding-top: 24px; } .story-gallery__toolbar { flex-wrap: wrap; padding-inline: 12px; } .story-gallery__toolbar > :first-child { flex-basis: calc(100% - 44px); } .story-gallery__toolbar > .base-button { margin-left: auto; } }
</style>
