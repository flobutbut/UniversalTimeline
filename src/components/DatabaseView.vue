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
          <button class="action-button" @click="openAddModal('period')">Add</button>
        </div>
        <div class="content">
          <DatabaseCard
            v-for="period in periods"
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
          <button class="action-button" @click="openAddModal('event')">Add</button>
        </div>
        <div class="content">
          <DatabaseCard
            v-for="event in events"
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
      @save="handleSave"
    />
    <EditModal
      v-if="showEditModal"
      :isOpen="showEditModal"
      :type="currentType"
      mode="edit"
      :data="currentItem"
      @close="closeEditModal"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { DatabaseViewService } from '../services/DatabaseViewService';
import DatabaseCard from './DatabaseCard.vue';
import EditModal from './EditModal.vue';
import type { Event, Period, Story } from '../types/database';
import { DatabaseQueryService } from '../services/DatabaseQueryService';

const databaseService = DatabaseViewService.getInstance();
const queryService = DatabaseQueryService.getInstance();
const periods = ref<Period[]>([]);
const events = ref<Event[]>([]);
const stories = ref<Story[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Modale
const showAddModal = ref(false);
const showEditModal = ref(false);
const currentType = ref<'period' | 'event'>('period');
const currentItem = ref<any>(null);

function openAddModal(type: 'period' | 'event') {
  // Fermer d'abord la modale d'édition si elle est ouverte
  if (showEditModal.value) {
    closeEditModal();
  }
  currentType.value = type;
  showAddModal.value = true;
}

function closeAddModal() {
  showAddModal.value = false;
  currentItem.value = null;
}

function openEditModal(type: 'period' | 'event', item: any) {
  // Fermer d'abord la modale d'ajout si elle est ouverte
  if (showAddModal.value) {
    closeAddModal();
  }
  currentType.value = type;
  currentItem.value = item;
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
  currentItem.value = null;
}

async function handleSave() {
  await databaseService.loadData();
  periods.value = databaseService.getPeriods();
  events.value = databaseService.getEvents();
  stories.value = databaseService.getStories();
  closeAddModal();
  closeEditModal();
}

onMounted(async () => {
  try {
    console.log('[DatabaseView] Chargement des données...');
    await databaseService.loadData();
    console.log('[DatabaseView] Données chargées');
    
    // Mettre à jour les refs avec les données du service
    periods.value = databaseService.getPeriods();
    events.value = databaseService.getEvents();
    stories.value = databaseService.getStories();
    loading.value = databaseService.getLoading();
    error.value = databaseService.getError();
    
    console.log('[DatabaseView] Nombre d\'événements:', events.value.length);
    console.log('[DatabaseView] Nombre de périodes:', periods.value.length);
    console.log('[DatabaseView] Nombre de stories:', stories.value.length);
    
    if (events.value.length > 0) {
      console.log('[DatabaseView] Premier événement:', JSON.stringify(events.value[0], null, 2));
    }
    if (periods.value.length > 0) {
      console.log('[DatabaseView] Première période:', JSON.stringify(periods.value[0], null, 2));
    }
    if (stories.value.length > 0) {
      console.log('[DatabaseView] Première story:', JSON.stringify(stories.value[0], null, 2));
    }
  } catch (error) {
    console.error('[DatabaseView] Erreur lors du chargement des données:', error);
  }
});

const handleAddStory = () => {
  console.log('[DatabaseView] Ajout d\'une nouvelle story');
};

const handleEditStory = (story: Story) => {
  console.log('[DatabaseView] Édition de la story:', story);
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
</style> 