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
        <h2>Périodes</h2>
        <div class="content">
          <DatabaseCard
            v-for="period in periods"
            :key="period.id"
            type="period"
            :title="period?.label_fr || 'Sans titre'"
            :description="period?.description_fr"
            :date="period?.startDate && period?.endDate ? `${period.startDate} - ${period.endDate}` : undefined"
            :categories="period?.categories || []"
          />
        </div>
      </div>
      <div class="column">
        <h2>Événements</h2>
        <div class="content">
          <DatabaseCard
            v-for="event in events"
            :key="event.id"
            type="event"
            :title="event?.label_fr || 'Sans titre'"
            :description="event?.description_fr"
            :date="event?.date"
            :categories="event?.categories || []"
          />
        </div>
      </div>
      <div class="column">
        <h2>Stories</h2>
        <div class="content">
          <DatabaseCard
            v-for="story in stories"
            :key="story.id"
            type="story"
            :title="story?.title_fr || 'Sans titre'"
            :description="story?.description_fr"
            :categories="story?.categories || []"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { DatabaseViewService } from '../services/DatabaseViewService';
import DatabaseCard from './DatabaseCard.vue';

const databaseService = DatabaseViewService.getInstance();
const periods = databaseService.getPeriods();
const events = databaseService.getEvents();
const stories = databaseService.getStories();
const loading = databaseService.getLoading();
const error = databaseService.getError();

onMounted(async () => {
  await databaseService.loadData();
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
  background: var(--color-neutral-50);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  overflow-y: auto;
}

.column h2 {
  margin-bottom: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  border-bottom: 2px solid var(--color-border);
  font-size: var(--font-size-lg);
  color: var(--color-text);
}

.content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
</style> 