<template>
  <div class="database-view">
    <div v-if="state.loading" class="loading">
      <div class="spinner"></div>
      <span>Chargement des données...</span>
    </div>
    <div v-else-if="state.error" class="error">
      <i class="fas fa-exclamation-circle"></i>
      <span>{{ state.error }}</span>
    </div>
    <div v-else class="database-columns-layout">
      <div class="finder-columns">
        <div class="finder-column">
          <div class="finder-column-header">
            <h2>Stories</h2>
            <div class="database-story-header-actions">
              <button type="button" class="action-button" @click="handleAddStory">Ajouter</button>
              <button
                v-if="selectedStory"
                type="button"
                class="action-button"
                @click="onEditSelectedStory"
              >
                Modifier
              </button>
            </div>
          </div>
          <div class="finder-column-content database-story-tabs-wrap">
            <template v-if="filteredStories.length > 0">
              <Tabs
                :model-value="selectedStoryTabId"
                :tabs="storyTabs"
                vertical
                @update:model-value="onStoryTabSelect"
              />
            </template>
            <div v-else class="finder-empty-column">Aucune story</div>
          </div>
        </div>
      </div>
      <div class="database-story-detail-wrap">
        <StoryDetailPanel
          :story="selectedStory"
          :loading="state.loadingStoryDetails"
          @remove-period="removePeriodFromStory"
          @remove-event="removeEventFromStory"
          @add-periods="addPeriodsToStory"
          @add-events="addEventsToStory"
        />
      </div>
    </div>
    <EditModal
      v-if="modalState.showAddModal"
      :isOpen="modalState.showAddModal"
      :type="modalState.currentType"
      mode="create"
      @close="closeAddModal"
      @submit="handleSave"
    />
    <EditModal
      v-if="modalState.showEditModal"
      :isOpen="modalState.showEditModal"
      :type="modalState.currentType"
      mode="edit"
      :data="modalState.currentItem"
      :loading="state.loadingDetails"
      :error="state.loadingError"
      @close="closeEditModal"
      @submit="handleSave"
      @delete="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
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
  filteredStories,
  handleAddStory,
  handleEditStory,
  closeAddModal,
  closeEditModal,
  loadInitialData,
  selectStory,
  removePeriodFromStory,
  removeEventFromStory,
  addPeriodsToStory,
  addEventsToStory,
} = useDatabaseView();

const storyTabs = computed<Tab<string>[]>(() =>
  filteredStories.value.map((s: ListStory) => ({
    label: s.title?.fr || s.title?.en || 'Sans titre',
    value: s.id,
    sublabel: formatStoryListDateRangeSublabel(s),
  }))
);

const selectedStoryTabId = computed(() => selectedStory.value?.id ?? '');

function onStoryTabSelect(id: string) {
  const story = findById(filteredStories.value, id);
  if (story) selectStory(story);
}

function onEditSelectedStory() {
  if (!selectedStory.value) return;
  const listStory = findById(filteredStories.value, selectedStory.value.id);
  if (listStory) handleEditStory(listStory);
}

const { handleSave: saveHandler } = useDatabaseSave();
const { handleDelete: deleteHandler } = useDatabaseDelete();

const handleSave = async (formData: any) => {
  const success = await saveHandler(
    formData, 
    modalState.value.currentType, 
    modalState.value.currentMode, 
    modalState.value.currentItem
  );
  
  if (success) {
    closeAddModal();
    closeEditModal();
  }
};

const handleDelete = async () => {
  console.log('[DatabaseView] handleDelete a été appelé.');
  const success = await deleteHandler(modalState.value.currentItem, modalState.value.currentType);
  if (success) {
    closeEditModal();
  }
};

// Charger les données au montage du composant
onMounted(() => {
  loadInitialData();
});
</script>

<style scoped>
.database-view {
  box-sizing: border-box;
  padding: 0;
  height: 100%;
  background-color: var(--color-neutral-0);
}

.loading, .error {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: var(--font-size-lg);
}

.error {
  color: var(--color-error);
}

/* Grille : colonne stories (même gabarit que la vue Périodes) + panneau détail */
.database-columns-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 0;
  height: 100%;
  min-height: 0;
}

/* Surcharges grille stories : pas de scroll horizontal sur la colonne finder */
.database-columns-layout .finder-columns {
  overflow-x: hidden;
  max-width: 100%;
}

.database-story-header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.database-story-tabs-wrap {
  min-height: 0;
}

.database-story-tabs-wrap :deep(.tabs.tabs--vertical) {
  width: 100%;
}

.action-button {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: color var(--transition-fast);
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
}

.action-button:hover {
  color: var(--color-primary-dark);
}

.database-story-detail-wrap {
  min-height: 0;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

</style> 