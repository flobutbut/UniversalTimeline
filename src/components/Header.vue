<template>
  <header class="header">
    <div class="header-content">
      <div class="header-brand">
        <h1 class="header-title header-title--wordmark">Universal Timeline</h1>
      </div>
      <div class="header-search-wrap">
        <GlobalSearch />
      </div>
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
import GlobalSearch from './GlobalSearch.vue';
import ThemeToggle from './ThemeToggle.vue';
import Tabs from './base/Tabs.vue';

type ViewType = 'timeline' | 'database' | 'graph' | 'events' | 'designSystem';

defineProps<{
  currentView: ViewType
}>();

const tabs = [
  { label: 'Timeline', value: 'timeline' as ViewType, icon: 'mdi:timeline' },
  { label: 'Stories', value: 'database' as ViewType, icon: 'mdi:book-open-page-variant' },
  { label: 'Periods', value: 'graph' as ViewType, icon: 'mdi:chart-tree' },
  { label: 'Events', value: 'events' as ViewType, icon: 'mdi:calendar-clock' },
  { label: 'Design system', value: 'designSystem' as ViewType, icon: 'mdi:palette-swatch' },
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

}

.header-content {
  box-sizing: border-box;
  width: 100%;
  padding: 0 var(--spacing-lg);
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: var(--spacing-md);
}

.header-brand {
  justify-self: start;
  display: flex;
  align-items: center;
  min-height: 2rem;
  min-width: 0;
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

.header-title--wordmark {
  font-family: var(--font-family-heading);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.header-title:hover {
  color: var(--color-primary);
}

.header-right {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  min-width: 0;
}

/* Colonne centrale : même largeur de part et d’autre (1fr / 1fr) → la recherche est centrée dans le header */
.header-search-wrap {
  justify-self: center;
  width: min(400px, 92vw);
  max-width: 400px;
  min-width: 0;
}

.header-search-wrap :deep(.search-bar) {
  width: 100%;
  max-width: 400px;
}

@media (max-width: var(--breakpoint-md)) {
  .header-content {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    row-gap: var(--spacing-sm);
  }

  .header-brand {
    grid-column: 1;
    grid-row: 1;
  }

  .header-right {
    grid-column: 2;
    grid-row: 1;
  }

  .header-search-wrap {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-self: stretch;
    width: 100%;
    max-width: none;
  }

  .header-search-wrap :deep(.search-bar) {
    max-width: none;
  }
}
</style> 