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
      <StoryTabsBar :tabs="openTabs" :active-id="selectedStoryId" @select="onTabSelect" @close="onTabClose" />
      <StoryGallery v-if="!selectedStoryId" v-model:search="storySearch" v-model:visibility="storyVisibility" v-model:time-range="storyTimeRange" v-model:categories="storyCategories" :stories="visibleStories" :category-options="storyCategoryOptions" :error="state.storyError" class="database-view__content" @open="openStory" @create="handleAddStory" />
      <div v-else class="database-story-detail-wrap database-view__content">
        <StoryDetailPanel :key="selectedStoryId" :story="selectedStory" :loading="state.loadingStoryDetails" :updating="relationsBusy || visibilityBusy || state.loadingDetails || saveLoading || deleteLoading" :error="state.storyError"
          @retry="retryStory" @period-imported="retryStory" @remove-period="removePeriodFromStory" @remove-event="removeEventFromStory" @add-periods="addPeriodsToStory" @event-added="retryStory"
          @add-child-stories="addChildStoriesToStory" @remove-child-story="removeChildStoryFromStory" @add-event-anchor="addEventAnchorToStory" @remove-event-anchor="removeEventAnchorFromStory"
          @change-root="changeRootPeriod" @edit-period="onEditStoryPeriod" @create-story-from-period="openStoryFromPeriod" @edit-event="onEditStoryEvent" @edit-story="onEditSelectedStory" @toggle-public="toggleStoryVisibility" />
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
    <StoryFromPeriodModal
      v-if="storyFromPeriod"
      :key="`${storyFromPeriod.storyId}:${storyFromPeriod.preview.periodId}`"
      :preview="storyFromPeriod.preview"
      :busy="storyFromPeriod.busy"
      :error="storyFromPeriod.error"
      @close="closeStoryFromPeriod"
      @confirm="confirmStoryFromPeriod"
    />
  </div>
</template>

<script setup lang="ts">
import type { EditFormSubmission } from '@/types/editForm';
import { computed, onMounted, ref, watch, inject } from 'vue';
import { routeLocationKey, routerKey } from 'vue-router';
import StoryGallery from './StoryGallery.vue';
import StoryTabsBar from './StoryTabsBar.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { useDataStore } from '@/stores/useDataStore';
import { readStoryTarget } from '@/router/storyTarget';
import { Icon } from '@iconify/vue';
import EditModal from './EditModal.vue';
import StoryDetailPanel from './StoryDetailPanel.vue';
import StoryFromPeriodModal from './StoryFromPeriodModal.vue';
import { useDatabaseView } from '@/composables/useDatabaseView';
import { useStoryTabs } from '@/composables/useStoryTabs';
import type { ListStory } from '@/types/database';
import { findById } from '@/lib/collectionUtils';
import { storyOverlapsRange, type StoryTimeRange } from '@/lib/storyTimeFilter';
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
  storyFromPeriod, openStoryFromPeriod, closeStoryFromPeriod, confirmStoryFromPeriod,
  removeEventFromStory,
  addPeriodsToStory,
  addChildStoriesToStory,
  removeChildStoryFromStory,
  addEventAnchorToStory,
  removeEventAnchorFromStory,
} = useDatabaseView();

const route = inject(routeLocationKey, undefined);
const router = inject(routerKey, undefined);
const storySearch = ref('');
const storyVisibility = ref<'all' | 'public' | 'private'>('all');
/** One reference instant per evaluation, so story bounds and the range are read at the same time. */
const storyTimeRange = ref<StoryTimeRange | null>(null);
/** Tags (catégories) des frises : une frise reste visible si elle porte l'un des tags choisis. */
const storyCategories = ref<string[]>([]);
const storyCategoryOptions = computed(() => {
  const labels = new Map<string, string>();
  for (const story of filteredStories.value) for (const category of story.categories) if (!labels.has(category.id)) labels.set(category.id, category.label.fr || category.label.en || category.id);
  return [...labels].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
});
const visibilityBusy = ref(false);
const visibleStories = computed(() => {
  const query = storySearch.value.trim().toLocaleLowerCase('fr');
  const now = Date.now();
  return filteredStories.value.filter(story => (!query || `${story.title.fr} ${story.title.en}`.toLocaleLowerCase('fr').includes(query)) && (storyVisibility.value === 'all' || story.isPublic === (storyVisibility.value === 'public'))
    && (!storyTimeRange.value || storyOverlapsRange(story, storyTimeRange.value, now))
    && (!storyCategories.value.length || story.categories.some(category => storyCategories.value.includes(category.id))));
});
const storyTabs = useStoryTabs();
const openTabs = computed(() => storyTabs.openIds.value.flatMap(id => {
  const story = findById(filteredStories.value, id);
  return story ? [{ id, label: story.title.fr || story.title.en || 'Sans titre' }] : [];
}));
// Only a loaded list can tell which open tabs are no longer accessible.
watch(filteredStories, stories => { if (!state.value.loading && !state.value.error) storyTabs.retain(new Set(stories.map(story => story.id))); });

function openStory(story: ListStory) {
  storyTabs.open(story.id);
  void selectStory(story);
  if (router) void router.replace({ name: 'database', query: { story: story.id } });
}
function showStoryList() {
  if (router) void router.replace({ name: 'database' });
  else clearStorySelection();
}
function onTabSelect(id: string | null) {
  const story = id ? findById(filteredStories.value, id) : undefined;
  if (story) openStory(story);
  else showStoryList();
}
function onTabClose(id: string) {
  const next = storyTabs.close(id, selectedStoryId.value);
  if (next === selectedStoryId.value) return;
  onTabSelect(next);
}
async function openRouteStory() {
  try {
    const id = readStoryTarget(route?.query.story);
    if (!id) { clearStorySelection(); return; }
    if (id === selectedStoryId.value) return;
    const story = filteredStories.value.find(s => s.id === id);
    if (story) { storyTabs.open(id); await selectStory(story); }
    else { storyTabs.close(id, null); clearStorySelection(); state.value.storyError = 'Cette frise est introuvable ou inaccessible.'; }
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
  const deletedType = modalState.value.currentType;
  const success = await deleteHandler(modalState.value.currentItem, deletedType);
  if (success) {
    closeEditModal();
    if (deletedType === 'story' && deletedId) onTabClose(deletedId);
  }
};

// Charger les données au montage du composant
onMounted(async () => {
  await loadInitialData();
  if (state.value.error) return;
  storyTabs.retain(new Set(filteredStories.value.map(story => story.id)));
  if (route) await openRouteStory();
});
</script>

<style scoped>
.database-view { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--color-background); }
.loading, .error { flex: 1; display: flex; align-items: center; justify-content: center; gap: 12px; }
.error { color: var(--color-status-error-foreground); }
.database-view__content { flex: 1; min-height: 0; }
.database-story-detail-wrap { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
</style>
