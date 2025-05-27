<template>
  <div v-if="results.length > 0" class="search-results">
    <div
      v-for="result in results"
      :key="result.id"
      class="result-item"
      @click="handleSelect(result)"
      @mouseenter="selectedIndex = results.indexOf(result)"
      :class="{ 'selected': selectedIndex === results.indexOf(result) }"
    >
      <div class="result-content">
        <div class="result-title">{{ result.label }}</div>
        <div class="result-metadata">{{ result.type }} • {{ result.id }}</div>
      </div>
      <div class="result-date">
        {{ formatDate(result.date, result.type) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { SearchResult } from '../services/WikidataSearchService'
import { DateFormatter } from '../utils/dateFormatter'

const props = defineProps<{
  results: SearchResult[]
}>()

const emit = defineEmits<{
  (e: 'select', result: SearchResult): void
}>()

const selectedIndex = ref(-1)

const handleSelect = (result: SearchResult) => {
  emit('select', result)
}

const formatDate = (date: string, type: 'period' | 'event' | 'person') => {
  const displayType = type === 'person' ? 'event' : type
  const formatted = DateFormatter.formatForDisplay(date, displayType)
  return formatted.duration 
    ? `${formatted.timeElapsed} ${formatted.duration}`
    : formatted.timeElapsed
}
</script>

<style scoped>
.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: var(--spacing-xs);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: var(--shadow-lg);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  transition: var(--transition-fast);
  border-bottom: 1px solid var(--color-border-light);
  background-color: var(--color-background-bright);
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover,
.result-item.selected {
  background-color: var(--color-background);
}

.result-content {
  flex: 1;
  min-width: 0;
  margin-right: var(--spacing-md);
}

.result-title {
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 2px;
}

.result-metadata {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  font-weight: normal;
  line-height: 1.2;
}

.result-date {
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  white-space: nowrap;
  margin-top: 2px;
}
</style> 