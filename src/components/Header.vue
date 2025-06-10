<template>
  <header class="header">
    <div class="header-content">
      <h1 class="header-title">Timeline Géologique</h1>
      <SearchBar class="header-search" />
      <div class="header-right">
        <button class="database-button" @click="$emit('toggle-view')">
          {{ isDatabaseView ? 'Timeline' : 'Base de données' }}
        </button>
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import SearchBar from './SearchBar.vue';
import ThemeToggle from './ThemeToggle.vue';

defineProps<{
  isDatabaseView: boolean
}>();

defineEmits<{
  (e: 'toggle-view'): void
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

.database-button {
  background-color: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: var(--border-radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  text-decoration: none;
}

.database-button:hover {
  background-color: var(--color-primary-dark);
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

  .database-button {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
  }
}
</style> 