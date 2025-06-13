<template>
  <div class="database-view">
    <div v-if="loading" class="loading">
      <span>Chargement des données...</span>
    </div>
    <div v-else-if="error" class="error">
      <span>{{ error }}</span>
    </div>
    <div v-else class="columns">
      <div class="column">
        <div class="column-header">
          <h2>Périodes</h2>
          <div class="header-actions">
            <input 
              type="text" 
              v-model="periodSearch" 
              placeholder="Rechercher une période..." 
              class="search-input"
            />
            <button class="action-button" @click="openAddModal('period')">Add</button>
          </div>
        </div>
        <div class="content">
          <DatabaseCard
            v-for="period in filteredPeriods"
            :key="period.id"
            type="period"
            :title="period.label.fr"
            :date="period?.startDate"
            :endDate="period?.endDate"
            :categories="period.categories"
            @edit="openEditModal('period', period)"
          />
        </div>
      </div>
      <div class="column">
        <div class="column-header">
          <h2>Événements</h2>
          <div class="header-actions">
            <input 
              type="text" 
              v-model="eventSearch" 
              placeholder="Rechercher un événement..." 
              class="search-input"
            />
            <button class="action-button" @click="openAddModal('event')">Add</button>
          </div>
        </div>
        <div class="content">
          <DatabaseCard
            v-for="event in filteredEvents"
            :key="event.id"
            type="event"
            :title="event.label.fr"
            :date="event?.date"
            :categories="event.categories"
            @edit="openEditModal('event', event)"
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
            v-for="story in stories"
            :key="story.id"
            type="story"
            :title="story.title.fr"
            :categories="story.categories"
            @edit="handleEditStory(story)"
          />
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
import { DatabaseViewService } from '../services/DatabaseViewService';
import DatabaseCard from './DatabaseCard.vue';
import EditModal from './EditModal.vue';
import type { Event, Period, Story, ListPeriod, ListEvent, ListStory } from '../types/database';
import { DatabaseQueryService } from '../services/DatabaseQueryService';

const databaseService = DatabaseViewService.getInstance();
const queryService = DatabaseQueryService.getInstance();
const periods = ref<ListPeriod[]>([]);
const events = ref<ListEvent[]>([]);
const stories = ref<ListStory[]>([]);
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

// Computed properties pour le filtrage
const filteredPeriods = computed(() => {
  if (!periodSearch.value) return periods.value;
  const searchLower = periodSearch.value.toLowerCase();
  return periods.value.filter(period => 
    period.label.fr.toLowerCase().includes(searchLower) ||
    period.categories?.some(cat => String(cat).toLowerCase().includes(searchLower))
  );
});

const filteredEvents = computed(() => {
  if (!eventSearch.value) return events.value;
  const searchLower = eventSearch.value.toLowerCase();
  return events.value.filter(event => 
    event.label.fr.toLowerCase().includes(searchLower) ||
    event.categories?.some(cat => String(cat).toLowerCase().includes(searchLower))
  );
});

function openAddModal(type: 'period' | 'event' | 'story') {
  // Fermer d'abord la modale d'édition si elle est ouverte
  if (showEditModal.value) {
    closeEditModal();
  }
  currentType.value = type;
  currentMode.value = 'create';
  showAddModal.value = true;
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
    if (currentType.value === 'period') {
      if (currentMode.value === 'edit') {
        await queryService.updatePeriod(currentItem.value.id, formData);
      } else {
        await queryService.createPeriod(formData);
      }
    } else if (currentType.value === 'event') {
      if (currentMode.value === 'edit') {
        const response = await queryService.updateEvent(currentItem.value.id, formData);
      } else {
        await queryService.createEvent(formData);
      }
    } else if (currentType.value === 'story') {
      if (currentMode.value === 'edit') {
        await queryService.updateStory(currentItem.value.id, formData);
      } else {
        await queryService.createStory(formData);
      }
    }

    // Recharger les données après la mise à jour
    await databaseService.loadListData();
    periods.value = databaseService.getPeriods();
    events.value = databaseService.getEvents();
    stories.value = databaseService.getStories();
    
    closeAddModal();
    closeEditModal();
  } catch (error) {
    window.showToast('Erreur lors de la sauvegarde des données', 'error');
  }
}

onMounted(async () => {
  try {
    await databaseService.loadListData();
    
    // Mettre à jour les refs avec les données du service
    periods.value = databaseService.getPeriods();
    events.value = databaseService.getEvents();
    stories.value = databaseService.getStories();
    loading.value = databaseService.getLoading();
    error.value = databaseService.getError();
    
    if (events.value.length > 0) {
      if (periods.value.length > 0) {
        if (stories.value.length > 0) {
        }
      }
    }
  } catch (error) {
  }
});

const handleAddStory = () => {
  currentType.value = 'story';
  currentMode.value = 'create';
  showAddModal.value = true;
};

const handleEditStory = async (story: ListStory) => {
  try {
    currentType.value = 'story';
    currentMode.value = 'edit';
    currentItem.value = story;
    showEditModal.value = true;
  } catch (error) {
    window.showToast('Erreur lors du chargement des données', 'error');
  }
};
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
  background: var(--color-neutral-50);
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
</style> 