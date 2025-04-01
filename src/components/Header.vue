<template>
  <header class="header">
    <div class="header-content">
      <h1 class="header-title">Timeline Géologique</h1>
      <LanguageSelector
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import LanguageSelector from './LanguageSelector.vue';

defineProps<{
  modelValue: string;
}>();

defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();
</script>

<style scoped>
.header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: var(--spacing-md) 0;
  width: 100%;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}
</style> 