<template>
  <div class="database-view">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>Chargement des données...</span>
    </div>
    <div v-else-if="error" class="error">
      <i class="fas fa-exclamation-circle"></i>
      <span>{{ error }}</span>
    </div>
    <div v-else class="columns">
      <div class="column">
        <div class="column-header">
          <h2>Périodes</h2>
          <div class="header-actions">
            <SearchBar
              v-model="periodSearch"
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
              v-model="eventSearch"
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
        <div v-if="loadingStoryDetails" class="loading-details">
          <div class="spinner"></div>
          <span>Chargement des détails...</span>
        </div>
        <div v-else-if="selectedStory" class="content"
          @dragover.prevent="handleDragOver"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
          :class="{ 'drag-over': isDragOver }"
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
      v-if="showAddModal"
      :isOpen="showAddModal"
      :type="currentType"
      mode="create"
      @close="closeAddModal"
      @submit="handleSave"
    />
    <EditModal
      v-if="showEditModal"
      :isOpen="showEditModal"
      :type="currentType"
      mode="edit"
      :data="currentItem"
      :loading="loadingDetails"
      :error="loadingError"
      @close="closeEditModal"
      @submit="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { DatabaseViewService } from '@/services/DatabaseViewService';
import DatabaseCard from './DatabaseCard.vue';
import EditModal from './EditModal.vue';
import SearchBar from '@/components/SearchBar.vue';
import type { Event, Period, Story, ListPeriod, ListEvent, ListStory } from '@/types/database';
import { DatabaseQueryService } from '@/services/DatabaseQueryService';

const databaseService = DatabaseViewService.getInstance();
const queryService = DatabaseQueryService.getInstance();
const fullStories = ref<Map<number, Story>>(new Map());
const loading = ref(false);
const error = ref<string | null>(null);

// Modale
const showAddModal = ref(false);
const showEditModal = ref(false);
const currentType = ref<'period' | 'event' | 'story'>('period');
const currentItem = ref<any>(null);
const currentMode = ref<'create' | 'edit'>('create');

// Ajout des refs pour la recherche
const periodSearch = ref('');
const eventSearch = ref('');

// Ajout des refs pour le chargement des données détaillées
const loadingDetails = ref(false);
const loadingError = ref<string | null>(null);

// État du drag & drop
const draggedItem = ref<{ type: 'period' | 'event', data: any } | null>(null);

// Ajout de la ref pour la story sélectionnée
const selectedStory = ref<Story | null>(null);
const loadingStoryDetails = ref(false);
const isDragOver = ref(false);

// Computed properties pour le filtrage
const filteredPeriods = computed(() => {
  const searchLower = periodSearch.value.toLowerCase();
  return databaseService.getPeriods().filter(period => {
    const labelFr = period.label?.fr;
    return typeof labelFr === 'string' ? labelFr.toLowerCase().includes(searchLower) : false;
  });
});

const filteredEvents = computed(() => {
  const searchLower = eventSearch.value.toLowerCase();
  return databaseService.getEvents().filter(event => {
    const labelFr = event.label?.fr;
    return typeof labelFr === 'string' ? labelFr.toLowerCase().includes(searchLower) : false;
  });
});

// Fonctions pour gérer les modales
function handleAddPeriod() {
  currentType.value = 'period';
  currentMode.value = 'create';
  showAddModal.value = true;
}

function handleAddEvent() {
  currentType.value = 'event';
  currentMode.value = 'create';
  showAddModal.value = true;
}

function handleAddStory() {
  currentType.value = 'story';
  currentMode.value = 'create';
  showAddModal.value = true;
}

function handleEditPeriod(period: ListPeriod) {
  openEditModal('period', period);
}

function handleEditEvent(event: ListEvent) {
  openEditModal('event', event);
}

function handleEditStory(story: ListStory) {
  openEditModal('story', story);
}

function closeAddModal() {
  showAddModal.value = false;
  currentItem.value = null;
}

async function openEditModal(type: 'period' | 'event' | 'story', item: any) {
  // Fermer d'abord la modale d'ajout si elle est ouverte
  if (showAddModal.value) {
    closeAddModal();
  }
  currentType.value = type;
  currentMode.value = 'edit';
  
  try {
    loadingDetails.value = true;
    loadingError.value = null;
    
    // Charger les données complètes de l'élément
    if (type === 'period') {
      currentItem.value = await databaseService.loadFullPeriod(item.id);
    } else if (type === 'event') {
      currentItem.value = await databaseService.loadFullEvent(item.id);
    } else if (type === 'story') {
      currentItem.value = await databaseService.loadFullStory(item.id);
    }
    showEditModal.value = true;
  } catch (error: any) {
    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      loadingError.value = 'L\'élément n\'a pas été trouvé dans la base de données';
      window.showToast('L\'élément n\'a pas été trouvé dans la base de données', 'error');
    } else {
      loadingError.value = 'Erreur lors du chargement des données';
      window.showToast('Erreur lors du chargement des données', 'error');
    }
  } finally {
    loadingDetails.value = false;
  }
}

function closeEditModal() {
  showEditModal.value = false;
  currentItem.value = null;
}

async function handleSave(formData: any) {
  try {
    loading.value = true;
    let updatedItem;
    let retryCount = 0;
    const maxRetries = 3;

    const executeWithRetry = async (operation: () => Promise<any>) => {
      while (retryCount < maxRetries) {
        try {
          return await operation();
        } catch (error: any) {
          if (error.message?.includes('ECONNRESET') || error.message?.includes('socket hang up')) {
            retryCount++;
            if (retryCount === maxRetries) {
              throw error;
            }
            // Attendre un peu avant de réessayer
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }
          throw error;
        }
      }
    };

    if (currentType.value === 'period') {
      if (currentMode.value === 'edit' && currentItem.value) {
        const itemId = currentItem.value.id;
        updatedItem = await executeWithRetry(() => 
          queryService.updatePeriod(itemId, formData)
        );
        // Mettre à jour uniquement la période modifiée dans la liste
        const periods = [...databaseService.getPeriods()];
        const index = periods.findIndex(p => p.id === itemId);
        if (index !== -1) {
          periods[index] = {
            ...periods[index],
            label: { fr: formData.title.fr, en: formData.title.en },
            startDate: formData.startDate,
            endDate: formData.endDate,
            categories: periods[index].categories
          };
          databaseService.setPeriods(periods);
        }
      } else {
        updatedItem = await executeWithRetry(() => 
          queryService.createPeriod(formData)
        );
        // Ajouter la nouvelle période à la liste
        const periods = [...databaseService.getPeriods()];
        periods.push({
          id: updatedItem.id,
          label: { fr: formData.title.fr, en: formData.title.en },
          startDate: formData.startDate,
          endDate: formData.endDate,
          categories: []
        });
        databaseService.setPeriods(periods);
      }
    } else if (currentType.value === 'event') {
      if (currentMode.value === 'edit' && currentItem.value) {
        const itemId = currentItem.value.id;
        updatedItem = await executeWithRetry(() => 
          queryService.updateEvent(itemId, formData)
        );
        // Mettre à jour uniquement l'événement modifié dans la liste
        const events = [...databaseService.getEvents()];
        const index = events.findIndex(e => e.id === itemId);
        if (index !== -1) {
          events[index] = {
            ...events[index],
            label: { fr: formData.title, en: formData.title },
            date: formData.date,
            categories: events[index].categories
          };
          databaseService.setEvents(events);
        }
      } else {
        updatedItem = await executeWithRetry(() => 
          queryService.createEvent(formData)
        );
        // Ajouter le nouvel événement à la liste
        const events = [...databaseService.getEvents()];
        events.push({
          id: updatedItem.id,
          label: { fr: formData.title, en: formData.title },
          date: formData.date,
          categories: []
        });
        databaseService.setEvents(events);
      }
    } else if (currentType.value === 'story') {
      if (currentMode.value === 'edit' && currentItem.value) {
        const itemId = currentItem.value.id;
        updatedItem = await executeWithRetry(() => 
          queryService.updateStory(itemId, formData)
        );
        // Mettre à jour uniquement la story modifiée dans la liste
        const stories = [...databaseService.getStories()];
        const index = stories.findIndex(s => s.id === itemId);
        if (index !== -1) {
          stories[index] = {
            ...stories[index],
            title: { fr: formData.title, en: formData.title },
            categories: stories[index].categories
          };
          databaseService.setStories(stories);
        }
      } else {
        updatedItem = await executeWithRetry(() => 
          queryService.createStory(formData)
        );
        // Ajouter la nouvelle story à la liste
        const stories = [...databaseService.getStories()];
        stories.push({
          id: updatedItem.id,
          title: { fr: formData.title, en: formData.title },
          categories: []
        });
        databaseService.setStories(stories);
      }
    }

    window.showToast('Données mises à jour avec succès', 'success');
    closeAddModal();
    closeEditModal();
  } catch (error: any) {
    console.error('Erreur lors de la sauvegarde:', error);
    if (error.message?.includes('ECONNRESET') || error.message?.includes('socket hang up')) {
      window.showToast('Erreur de connexion. Veuillez réessayer.', 'error');
    } else {
      window.showToast('Erreur lors de la sauvegarde des données', 'error');
    }
  } finally {
    loading.value = false;
  }
}

// Fonction pour charger les données initiales
async function loadInitialData() {
  try {
    loading.value = true;
    error.value = null;
    await databaseService.loadListData();
    // Charger les données complètes des stories
    await Promise.all(
      databaseService.getStories().map(async (story) => {
        try {
          const fullStory = await databaseService.loadFullStory(story.id);
          fullStories.value.set(story.id, fullStory);
        } catch (error) {
          console.error(`Erreur lors du chargement de la story ${story.id}:`, error);
        }
      })
    );
  } catch (error: any) {
    error.value = error.message || 'Une erreur est survenue lors du chargement des données';
    window.showToast(error.value, 'error');
  } finally {
    loading.value = false;
  }
}

// Charger les données au montage du composant
onMounted(() => {
  loadInitialData();
});

// Gestion du drag & drop
function handleDragStart(event: DragEvent, type: 'period' | 'event', item: any) {
  draggedItem.value = { type, data: item };
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}

async function handleDrop(event: DragEvent) {
  isDragOver.value = false;
  if (!draggedItem.value || !selectedStory.value) return;

  try {
    if (draggedItem.value.type === 'period') {
      await queryService.addPeriodToStory(selectedStory.value.id, draggedItem.value.data.id);
      // Recharger les données de la story
      const updatedStory = await databaseService.loadFullStory(selectedStory.value.id);
      fullStories.value.set(selectedStory.value.id, updatedStory);
      selectedStory.value = updatedStory;
      window.showToast('Période ajoutée à la story avec succès', 'success');
    } else if (draggedItem.value.type === 'event') {
      await queryService.addEventToStory(selectedStory.value.id, draggedItem.value.data.id);
      // Recharger les données de la story
      const updatedStory = await databaseService.loadFullStory(selectedStory.value.id);
      fullStories.value.set(selectedStory.value.id, updatedStory);
      selectedStory.value = updatedStory;
      window.showToast('Événement ajouté à la story avec succès', 'success');
    }
  } catch (error) {
    window.showToast('Erreur lors de l\'ajout de l\'élément à la story', 'error');
  }
}

function handleDragOver(event: DragEvent) {
  if (selectedStory.value) {
    isDragOver.value = true;
  }
}

function handleDragLeave(event: DragEvent) {
  isDragOver.value = false;
}

// Fonction pour sélectionner une story
async function selectStory(story: ListStory) {
  try {
    loadingStoryDetails.value = true;
    const fullStory = await databaseService.loadFullStory(story.id);
    selectedStory.value = fullStory;
  } catch (error) {
    window.showToast('Erreur lors du chargement des détails de la story', 'error');
    selectedStory.value = null;
  } finally {
    loadingStoryDetails.value = false;
  }
}
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
  border-bottom: 2px solid var(--color-border);
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