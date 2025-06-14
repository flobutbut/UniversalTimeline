<template>
  <header class="header">
    <div class="header-content">
      <h1 class="header-title">Timeline Géologique</h1>
      <SearchBar class="header-search" :modelValue="''" />
      <div class="header-right">
        <Tabs
          :modelValue="currentView"
          :tabs="tabs"
          @update:modelValue="$emit('change-view', $event)"
        />
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SearchBar from './SearchBar.vue';
import ThemeToggle from './ThemeToggle.vue';
import Tabs from './base/Tabs.vue';

type ViewType = 'timeline' | 'database' | 'graph';

const props = defineProps<{
  currentView: ViewType
}>();

const tabs = [
  { label: 'Timeline', value: 'timeline' as ViewType, icon: 'mdi:timeline' },
  { label: 'Base de données', value: 'database' as ViewType, icon: 'mdi:database' },
  { label: 'Graph', value: 'graph' as ViewType, icon: 'mdi:graph' }
];

defineEmits<{
  (e: 'change-view', view: ViewType): void
}>();
</script>

<style scoped>
.header {
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: var(--spacing-md) 0;
  width: 100%;
  position: sticky;
  top: 0;
  z-index: var(--z-index-sticky);
  box-shadow: var(--shadow-sm);
}

.header-content {
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  max-width: var(--breakpoint-2xl);
}

.header-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  white-space: nowrap;
  line-height: var(--line-height-tight);
  text-decoration: none;
}

.header-title:hover {
  color: var(--color-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.header-search {
  max-width: 400px;
  width: 100%;
  flex: 1;
}

@media (max-width: var(--breakpoint-md)) {
  .header-content {
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }

  .header-search {
    order: 3;
    max-width: none;
    width: 100%;
  }

  .header-right {
    margin-left: auto;
  }
}
</style> 