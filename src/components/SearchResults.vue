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
        <div class="result-row">
          <div class="result-title">{{ result.label }}</div>
          <div class="result-date">{{ result.date }}</div>
        </div>
        <div class="result-row">
          <span class="result-meta">{{ result.type }} • {{ result.id }}</span>
          <div class="result-actions">
            <button class="action-button" @click.stop="handleSave(result)">Save</button>
            <button class="action-button" @click.stop="openWikidata(result.id)">Wikidata</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { SearchResult } from '../services/WikidataSearchService';
import { useToast } from '@/composables/useToast';
import {
  searchResultSavedToastMessage,
  searchResultSelectionToastMessage,
  searchResultWikidataOpenedToastMessage,
  wikidataEntityWikiUrl,
} from '@/lib/wikidataSearchResultUi';

defineProps<{
  results: SearchResult[]
}>()

const emit = defineEmits<{
  (e: 'select', result: SearchResult): void
  (e: 'save', result: SearchResult): void
}>()

const selectedIndex = ref(-1)
const toast = useToast()

const handleSelect = (result: SearchResult) => {
  emit('select', result);
  toast.show(searchResultSelectionToastMessage(result.label), 'info');
};

const handleSave = (result: SearchResult) => {
  emit('save', result);
  toast.show(searchResultSavedToastMessage(result.label), 'success');
};

const openWikidata = (id: string) => {
  window.open(wikidataEntityWikiUrl(id), '_blank');
  toast.show(searchResultWikidataOpenedToastMessage(), 'info');
};
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
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-height: calc(var(--spacing-sm) * 50);
  overflow-y: auto;
  z-index: var(--z-index-dropdown);
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover,
.result-item.selected {
  background-color: var(--color-surface);
}

.result-content {
  flex: 1;
  min-width: 0;
  margin-right: var(--spacing-md);
}

.result-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.result-title {
  flex: 1 1 auto;
  font-weight: 500;
  color: var(--color-text);
  font-size: var(--font-size-base);
  line-height: var(--line-height-tight);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-date {
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  white-space: nowrap;
  margin-left: var(--spacing-md);
}

.result-meta {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
}

.result-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-left: auto;
  flex-shrink: 0;
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