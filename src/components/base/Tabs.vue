<template>
  <div class="tabs" :class="{ 'tabs--vertical': vertical }">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      class="tab-button"
      :class="{
        'tab-button--active': modelValue === tab.value,
        'tab-button--disabled': tab.disabled
      }"
      @click="!tab.disabled && $emit('update:modelValue', tab.value)"
      :disabled="tab.disabled"
    >
      <Icon v-if="tab.icon" :icon="tab.icon" class="tab-button__icon" />
      <span class="tab-button__label">{{ tab.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
import { Icon } from '@iconify/vue';
import type { Tab } from '@/types/global';

defineProps<{
  modelValue: T;
  tabs: Tab<T>[];
  vertical?: boolean;
}>();

defineEmits<{
  (e: 'update:modelValue', value: T): void;
}>();
</script>

<style scoped>
.tabs {
  display: flex;
  gap: var(--spacing-xs);
  background-color: var(--color-background);
  padding: var(--spacing-xs);
  border-radius: var(--radius-lg);
  width: fit-content;
}

.tabs--vertical {
  flex-direction: column;
  width: 100%;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  background: none;
  border: none;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-light);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  width: fit-content;
}

.tabs--vertical .tab-button {
  width: 100%;
  justify-content: flex-start;
}

.tab-button:hover:not(:disabled) {
  color: var(--color-text);
  background-color: var(--color-surface);
}

.tab-button--active {
  background-color: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.tab-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: var(--color-text-light);
}

.tab-button__icon {
  font-size: 1.2em;
}

.tab-button__label {
  white-space: nowrap;
}

@media (max-width: var(--breakpoint-md)) {
  .tabs {
    width: 100%;
    justify-content: center;
  }

  .tab-button {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
  }
}
</style> 