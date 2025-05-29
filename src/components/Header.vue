<template>
  <header class="header">
    <div class="header-content">
      <h1 class="header-title">Timeline Géologique</h1>
      <SearchBar class="header-search" />
      <div class="header-right">
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import SearchBar from './SearchBar.vue';
import ThemeToggle from './ThemeToggle.vue';
</script>

<style scoped>
.header {
  background-color: var(--color-neutral-0);
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