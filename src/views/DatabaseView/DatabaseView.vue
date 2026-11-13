<template>
  <div class="database-view">
    <FeedbackState v-if="state.loading" kind="loading" :message="uiText('Chargement des données…')" />
    <FeedbackState v-else-if="state.error" kind="error" :message="uiText(state.error)" retryable @retry="loadInitialData" />
    <template v-else>
      <FeedbackState v-if="targetLoading" kind="loading" layout="inline" :message="uiText('Ouverture de la fiche…')" />
      <FeedbackState v-else-if="targetError" kind="error" layout="inline" :message="uiText(targetError)" retryable @retry="retryTarget" />
      <StoryTabsBar :tabs="openTabs" :active-id="selectedStoryId" @select="onTabSelect" @close="onTabClose" @reorder="storyTabs.reorder" />
      <StoryGallery v-if="!selectedStoryId" v-model:search="storySearch" v-model:visibility="storyVisibility" v-model:time-range="storyTimeRange" v-model:period="storyPeriodFilter" v-model:tags="storyTagIds" :stories="visibleStories" :total-stories="filteredStories.length" :tag-options="storyTagOptions" :error="state.storyError" :can-create="auth.canCreateStories" class="database-view__content" @open="openStory" @create="handleAddStory" />
      <div v-else class="database-story-detail-wrap database-view__content">
        <StoryDetailPanel :key="selectedStoryId" :story="selectedStory" :loading="state.loadingStoryDetails" :updating="relationsBusy || visibilityBusy || state.loadingDetails || saveLoading || deleteLoading" :error="state.storyError" :settings-error="storySettingsError"
          @retry="retryStory" @period-imported="retryStory" @remove-period="removePeriodFromStory" @remove-event="removeEventFromStory" @add-periods="addPeriodsToStory" @event-added="retryStory" @entity-converted="retryStory"
          @add-child-stories="addChildStoriesToStory" @move-child-story="moveChildStoryToColumn" @display-child-story="displayChildStory" @remove-child-story="removeChildStoryFromStory" @add-event-anchor="addEventAnchorToStory" @remove-event-anchor="removeEventAnchorFromStory" @change-event-importance="changeEventImportance"
          @add-parent-entry="addParentEntryToStory" @remove-parent-entry="removeParentEntryFromStory" @set-parent="setParentOfStory"
          @change-root="changeRootPeriod" @edit-period="onEditStoryPeriod" @create-story-from-period="startStoryFromPeriod" @edit-event="onEditStoryEvent" @save-story="saveSelectedStory" @delete-story="deleteSelectedStory" @toggle-visibility="toggleStoryVisibility" />
      </div>
    </template>
    <EditModal
      v-if="modalState.showAddModal"
      :isOpen="modalState.showAddModal"
      :type="modalState.currentType"
      mode="create"
      :loading="saveLoading"
      :error="saveError"
      :story-parent-candidates="storyParentCandidates"
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
import { language, localizedText, uiFormat, uiText } from '@/i18n';
import { matchesTags, tagFilterOptions } from '@/lib/tags';
import FeedbackState from '@/components/base/FeedbackState.vue';
import type { EditFormSubmission } from '@/types/editForm';
import { computed, onMounted, ref, watch, inject } from 'vue';
import { routeLocationKey, routerKey } from 'vue-router';
import StoryGallery from './StoryGallery.vue';
import StoryTabsBar from './StoryTabsBar.vue';
import { readStoryTarget } from '@/router/storyTarget';

import EditModal from './EditModal.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { useDataStore } from '@/stores/useDataStore';
import { useConfirm } from '@/composables/useConfirm';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import StoryDetailPanel from './StoryDetailPanel.vue';
import StoryFromPeriodModal from './StoryFromPeriodModal.vue';
import { useDatabaseView } from '@/composables/useDatabaseView';
import { useStoryTabs } from '@/composables/useStoryTabs';
import type { ListStory } from '@/types/database';
import { findById } from '@/lib/collectionUtils';
import type { PeriodFilter } from '@/components/filters/filterTypes';
import { storyOverlapsRange, type StoryTimeRange } from '@/lib/storyTimeFilter';
import { useDatabaseSave } from '@/composables/useDatabaseSave';
import { useDatabaseDelete } from '@/composables/useDatabaseDelete';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToast } from '@/composables/useToast';
import { useSearchTarget } from '@/composables/useSearchTarget';

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
  handleEditPeriod,
  handleEditEvent,
  closeAddModal,
  closeEditModal,
  openEditModal,
  loadInitialData,
  selectStory,
  removePeriodFromStory,
  storyFromPeriod, openStoryFromPeriod, closeStoryFromPeriod, confirmStoryFromPeriod,
  removeEventFromStory,
  addPeriodsToStory,
  addChildStoriesToStory,
  moveChildStoryToColumn,
  displayChildStory,
  removeChildStoryFromStory,
  addEventAnchorToStory,
  removeEventAnchorFromStory,
  changeEventImportance,
  addParentEntryToStory,
  removeParentEntryFromStory,
  setParentOfStory,
} = useDatabaseView();

const route = inject(routeLocationKey, undefined);
const router = inject(routerKey, undefined);
const initialized = ref(false);
const recordType = computed(() => route?.query.event !== undefined ? 'event' as const : 'period' as const);
const { loading: targetLoading, error: targetError, retry: retryTarget } = useSearchTarget(
  recordType, () => initialized.value && !state.value.loading && !state.value.error && !state.value.loadingStoryDetails,
  async (target, isCurrent) => {
    if (route?.query.period !== undefined && route.query.event !== undefined) throw new Error('La fiche demandée est ambiguë.');
    if (target.kind !== 'local') throw new Error('Cette destination doit désigner une fiche existante.');
    await openEditModal(recordType.value, { id: target.id });
    if (isCurrent() && state.value.loadingError) throw new Error(state.value.loadingError);
  }, closeEditModal,
);
const storySearch = ref('');
const storyVisibility = ref<'all' | 'public' | 'private'>('all');
/** One reference instant per evaluation, so story bounds and the range are read at the same time. */
const storyTimeRange = ref<StoryTimeRange | null>(null);
const storyPeriodFilter = ref<PeriodFilter | null>(null);
/** Une frise reste visible si elle porte l'un des tags choisis. */
const storyTagIds = ref<string[]>([]);
const storyTagOptions = computed(() => tagFilterOptions(filteredStories.value));
const visibleStories = computed(() => {
  const query = storySearch.value.trim().toLocaleLowerCase(language.value);
  const now = Date.now();
  return filteredStories.value.filter(story => (!query || `${story.title.fr} ${story.title.en}`.toLocaleLowerCase(language.value).includes(query)) && (storyVisibility.value === 'all' || story.isPublic === (storyVisibility.value === 'public'))
    && (!storyTimeRange.value || storyOverlapsRange(story, storyTimeRange.value, now))
    && (!storyPeriodFilter.value || storyOverlapsRange(story, storyPeriodFilter.value.range, now))
    && matchesTags(story, storyTagIds.value));
});
const storyTabs = useStoryTabs();
const openTabs = computed(() => storyTabs.openIds.value.flatMap(id => {
  const story = findById(filteredStories.value, id);
  return story ? [{ id, label: localizedText(story.title) || 'Sans titre' }] : [];
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

const auth = useAuthStore(); const toast = useToast();
onMounted(() => { void auth.ensureProfile(); });
const usernameRequired = 'Choisissez un nom d’utilisateur dans votre profil avant de créer une frise.';
/** Frises modifiables par le compte : seules elles peuvent recevoir une sous-frise. */
const storyParentCandidates = computed(() => useDataStore().stories.filter(story => auth.canEditStory(story))
  .sort((a, b) => localizedText(a.title).localeCompare(localizedText(b.title), language.value)));
function handleAddStory() {
  if (!auth.canCreateStories) { toast.show(usernameRequired, 'error'); return; }
  saveError.value = null;
  openAddStory();
}
function startStoryFromPeriod(periodId: string) {
  if (!selectedStory.value || !auth.ownsStory(selectedStory.value)) return;
  if (!auth.canCreateStories) { toast.show(usernameRequired, 'error'); return; }
  openStoryFromPeriod(periodId);
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

const { handleSave: saveHandler, loading: saveLoading, error: saveError, savedStoryId } = useDatabaseSave();
const { handleDelete: deleteHandler, loading: deleteLoading } = useDatabaseDelete();

const handleSave = async (formData: EditFormSubmission) => {
  if (saveLoading.value || deleteLoading.value) return;
  const savedId = modalState.value.currentItem?.id;
  const savedType = modalState.value.currentType;
  const creatingStory = savedType === 'story' && modalState.value.currentMode === 'create';
  const success = await saveHandler(
    formData, 
    modalState.value.currentType, 
    modalState.value.currentMode, 
    modalState.value.currentItem
  );
  
  if (success) {
    closeAddModal();
    closeEditModal();
    if (creatingStory && savedStoryId.value) {
      const created = useDataStore().stories.find(story => story.id === savedStoryId.value);
      if (created) openStory(created);
      return;
    }
    if (savedId === selectedStoryId.value || (savedType === 'period' && selectedStory.value?.periods.some(period => period.id === savedId)) || (savedType === 'event' && selectedStory.value?.events.some(event => event.id === savedId))) await retryStory();
  }
};

/** Erreur propre aux onglets Settings et Catégories, distincte des sauvegardes faites dans la modale. */
const storySettingsError = ref<string | null>(null);
watch(selectedStoryId, () => { storySettingsError.value = null; });
async function saveSelectedStory(submission: EditFormSubmission) {
  const story = selectedStory.value;
  if (!story || saveLoading.value || deleteLoading.value) return;
  storySettingsError.value = null;
  const success = await saveHandler(submission, 'story', 'edit', story);
  if (selectedStoryId.value !== story.id) return;
  if (success) await retryStory();
  else storySettingsError.value = saveError.value;
}

const confirm = useConfirm();
const visibilityBusy = ref(false);
async function toggleStoryVisibility() {
  const story = selectedStory.value;
  if (!story || relationsBusy.value || visibilityBusy.value || saveLoading.value || deleteLoading.value) return;
  const next = story.isPublic ? 'privée' : 'publique';
  const accepted = await confirm(uiFormat`Rendre la frise ${next}`, story.isPublic
    ? `« ${localizedText(story.title)} » ne sera plus visible que par vous.`
    : uiFormat`« ${localizedText(story.title)} » sera visible par tous dans la timeline.`);
  if (!accepted || selectedStoryId.value !== story.id) return;
  visibilityBusy.value = true;
  storySettingsError.value = null;
  try {
    const updated = await StoryApiService.getInstance().updateStory(story.id, { title: story.title, description: story.description, author: story.author, isPublic: !story.isPublic, categories: story.categories });
    useDataStore().upsertSavedStory(updated);
    if (selectedStoryId.value === story.id) await retryStory();
  } catch (cause: unknown) {
    if (selectedStoryId.value === story.id) storySettingsError.value = mutationErrorMessage(cause, 'Impossible de modifier la visibilité. Réessayez.');
  } finally { visibilityBusy.value = false; }
}

async function deleteSelectedStory() {
  const story = selectedStory.value;
  if (!story || saveLoading.value || deleteLoading.value) return;
  if (await deleteHandler(story, 'story')) onTabClose(story.id);
}

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
  initialized.value = true;
  if (state.value.error) return;
  storyTabs.retain(new Set(filteredStories.value.map(story => story.id)));
  if (route) await openRouteStory();
});
</script>

<style scoped>
.database-view { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--color-background-default); }
.database-view__content { flex: 1; min-height: 0; }
.database-story-detail-wrap { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
</style>
