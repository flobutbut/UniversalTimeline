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
    <div v-else class="columns">
      <div class="column">
        <div class="column-header">
          <h2>Périodes</h2>
          <div class="header-actions">
            <SearchBar
              v-model="searchState.periodSearch"
              placeholder="Rechercher une période..."
              :minified="true"
              :naked="true"
            />
            <button class="action-button" @click="handleAddPeriod">Add</button>
          </div>
        </div>
        <div class="content">
          <DatabaseCard
            v-for="period in filteredPeriods"
            :key="period.id"
            type="period"
            :title="period.label.fr"
            :categories="period.categories"
            draggable="true"
            @dragstart="handleDragStart($event, 'period', period)"
            @edit="handleEditPeriod(period)"
          />
        </div>
      </div>
      <div class="column">
        <div class="column-header">
          <h2>Événements</h2>
          <div class="header-actions">
            <SearchBar
              v-model="searchState.eventSearch"
              placeholder="Rechercher un événement..."
              :minified="true"
              :naked="true"
            />
            <button class="action-button" @click="handleAddEvent">Add</button>
          </div>
        </div>
        <div class="content">
          <DatabaseCard
            v-for="event in filteredEvents"
            :key="event.id"
            type="event"
            :title="event.label.fr"
            :categories="event.categories"
            draggable="true"
            @dragstart="handleDragStart($event, 'event', event)"
            @edit="handleEditEvent(event)"
          />
        </div>
      </div>
      <div class="column">
        <div class="column-header">
          <h2>Stories</h2>
          <button class="action-button" @click="handleAddStory">Add</button>
        </div>
        <div class="content">
          <DatabaseCard
            v-for="story in databaseService.getStories()"
            :key="story.id"
            type="story"
            :title="story.title.fr"
            :categories="story.categories"
            :selected="selectedStory?.id === story.id"
            @edit="handleEditStory(story)"
            @click="selectStory(story)"
          />
        </div>
      </div>
      <div class="column">
        <div class="column-header">
          <h2>Détails de la Story</h2>
        </div>
        <div v-if="state.loadingStoryDetails" class="loading-details">
          <div class="spinner"></div>
          <span>Chargement des détails...</span>
        </div>
        <div v-else-if="selectedStory" class="content"
          @dragover.prevent="handleDragOver"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
          :class="{ 'drag-over': dragDropState.isDragOver }"
        >
          <div class="story-details">
            <h3>{{ selectedStory.title.fr }}</h3>
            <p class="story-author">Auteur: {{ selectedStory.author }}</p>
            <p class="story-visibility">
              Visibilité: {{ selectedStory.isPublic ? 'Publique' : 'Privée' }}
            </p>
            <div class="story-description">
              <h4>Description</h4>
              <p>{{ selectedStory.description?.fr || 'Aucune description' }}</p>
            </div>
            <div class="story-periods">
              <h4>Périodes associées</h4>
              <div v-if="selectedStory.periods?.length" class="story-items">
                <div
                  v-for="period in selectedStory.periods"
                  :key="period.id"
                  class="story-item"
                >
                  {{ period.label.fr }}
                </div>
              </div>
              <p v-else class="no-items">Aucune période associée</p>
            </div>
            <div class="story-events">
              <h4>Événements associés</h4>
              <div v-if="selectedStory.events?.length" class="story-items">
                <div
                  v-for="event in selectedStory.events"
                  :key="event.id"
                  class="story-item"
                >
                  {{ event.label.fr }}
                </div>
              </div>
              <p v-else class="no-items">Aucun événement associé</p>
            </div>
          </div>
        </div>
        <div v-else class="no-selection">
          <p>Sélectionnez une story pour voir ses détails</p>
        </div>
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
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { DatabaseViewService } from '@/services/DatabaseViewService';
import DatabaseCard from './DatabaseCard.vue';
import EditModal from './EditModal.vue';
import SearchBar from '@/components/SearchBar.vue';
import { useDatabaseView } from '@/composables/useDatabaseView';
import { useDatabaseSave } from '@/composables/useDatabaseSave';

const databaseService = DatabaseViewService.getInstance();

// Utilisation des composables
const {
  state,
  modalState,
  searchState,
  dragDropState,
  fullStories,
  selectedStory,
  filteredPeriods,
  filteredEvents,
  handleAddPeriod,
  handleAddEvent,
  handleAddStory,
  handleEditPeriod,
  handleEditEvent,
  handleEditStory,
  closeAddModal,
  closeEditModal,
  loadInitialData,
  handleDragStart,
  handleDrop,
  handleDragOver,
  handleDragLeave,
  selectStory
} = useDatabaseView();

const { loading: saveLoading, handleSave: saveHandler } = useDatabaseSave();

// Fonction de sauvegarde qui utilise le composable
const handleSave = async (formData: any) => {
  const success = await saveHandler(
    formData, 
    modalState.currentType, 
    modalState.currentMode, 
    modalState.currentItem
  );
  
  if (success) {
    closeAddModal();
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
  padding: var(--spacing-md);
  height: 100%;
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

.columns {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
  height: 100%;
}

.column {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  overflow-y: auto;
}

.column h2 {
  margin-bottom: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  font-size: var(--font-size-lg);
  color: var(--color-text);
}

.content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
}

.column-header h2 {
  font-size: var(--font-size-lg);
  color: var(--color-text);
  margin: 0;
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
}

.action-button:hover {
  color: var(--color-primary-dark);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.search-input {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  width: 200px;
  transition: border-color var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.story-content {
  padding: var(--spacing-sm);
}

.story-periods,
.story-events {
  margin-bottom: var(--spacing-sm);
}

.story-periods h3,
.story-events h3 {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-bottom: var(--spacing-xs);
}

.story-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.story-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-neutral-100);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.story-item:hover {
  background: var(--color-neutral-200);
}

.story-item i {
  color: var(--color-error);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.story-item:hover i {
  opacity: 1;
}

.story-details {
  padding: var(--spacing-md);
}

.story-details h3 {
  font-size: var(--font-size-lg);
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

.story-author,
.story-visibility {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-bottom: var(--spacing-xs);
}

.story-description {
  margin: var(--spacing-md) 0;
}

.story-description h4,
.story-periods h4,
.story-events h4 {
  font-size: var(--font-size-md);
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

.no-items {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  font-style: italic;
}

.no-selection {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--color-text-light);
  font-style: italic;
}

.loading-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-light);
}

.loading-details .spinner {
  margin-bottom: var(--spacing-sm);
}

.content.drag-over {
  background-color: var(--color-primary-light);
  border: 2px dashed var(--color-primary);
  border-radius: var(--radius-md);
  position: relative;
}

.content.drag-over::after {
  content: 'Déposer ici';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: var(--color-primary);
  color: var(--color-neutral-0);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  pointer-events: none;
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
</style> 