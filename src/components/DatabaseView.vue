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
          <button class="action-button" @click="handleAddPeriod">Add</button>
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
            @edit="handleEditPeriod(period)"
          />
        </div>
      </div>
      <div class="column">
        <div class="column-header">
          <h2>Événements</h2>
          <button class="action-button" @click="handleAddEvent">Add</button>
        </div>
        <div class="content">
          <DatabaseCard
            v-for="event in events"
            :key="event.id"
            type="event"
            :title="event.label.fr"
            :date="event?.date"
            :categories="event.categories"
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { DatabaseViewService } from '../services/DatabaseViewService';
import DatabaseCard from './DatabaseCard.vue';
import type { Event, Period, Story } from '../types/database';

const databaseService = DatabaseViewService.getInstance();
const periods = ref<Period[]>([]);
const events = ref<Event[]>([]);
const stories = ref<Story[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

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

const handleEditEvent = (event: Event) => {
  console.log('[DatabaseView] Édition de l\'événement:', event);
};

const handleEditPeriod = (period: Period) => {
  console.log('[DatabaseView] Édition de la période:', period);
};

const handleAddPeriod = () => {
  console.log('[DatabaseView] Ajout d\'une nouvelle période');
};

const handleAddEvent = () => {
  console.log('[DatabaseView] Ajout d\'un nouvel événement');
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