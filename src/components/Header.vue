<template>
  <header class="header">
    <div class="header-content">
      <h1 class="header-title">Timeline Géologique</h1>
      <SearchBar class="header-search" />
      <div class="header-right">
        <LanguageSelector
          :model-value="modelValue"
          @update:model-value="$emit('update:modelValue', $event)"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import LanguageSelector from './LanguageSelector.vue';
import SearchBar from './SearchBar.vue';

defineProps<{
  modelValue: string;
}>();

defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();
</script>

<style scoped>
.header {
  background: var(--color-background-bright);
  border-bottom: 1px solid var(--color-border-light);
  padding: var(--spacing-md) 0;
  width: 100%;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.header-search {
  max-width: 400px;
  width: 100%;
}
</style> 