<template>
  <div
    class="tabs"
    :class="{
      'tabs--vertical': vertical,
      'tabs--underline': variant === 'underline',
    }"
  >
    <button
      v-for="tab in tabs"
      :key="tab.value"
      class="tab-button"
      :class="{
        'tab-button--active': modelValue === tab.value,
        'tab-button--disabled': tab.disabled,
      }"
      @click="!tab.disabled && $emit('update:modelValue', tab.value)"
      :disabled="tab.disabled"
    >
      <Icon v-if="tab.icon" :icon="tab.icon" class="tab-button__icon" />
      <span class="tab-button__stack">
        <span class="tab-button__label">{{ tab.label }}</span>
        <span v-if="tab.sublabel" class="tab-button__sublabel">{{ tab.sublabel }}</span>
      </span>
      <span v-if="tab.count !== undefined" class="tab-button__count">{{ tab.count }}</span>
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
  /** `pill` (défaut) : fond pill actif. `underline` : bordure basse, style header de section. */
  variant?: 'pill' | 'underline';
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
  gap: 0;
  padding: 0;
  border-radius: 0;
  background: transparent;
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
  transition: background-color var(--transition-fast), color var(--transition-fast);
  width: fit-content;
}

.tabs--vertical .tab-button {
  width: 100%;
  justify-content: flex-start;
  text-align: left;
  border-radius: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-base);
  font-weight: 400;
  color: var(--color-text);
  background: var(--color-surface);
  gap: var(--spacing-sm);
}

.tabs--vertical .tab-button:not(:first-child) {
  border-top: 1px solid var(--color-border-light);
}

.tab-button:hover:not(:disabled) {
  color: var(--color-text);
  background-color: var(--color-surface);
}

.tabs--vertical .tab-button:hover:not(:disabled):not(.tab-button--active) {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.tab-button:focus {
  outline: none;
}

.tab-button:focus-visible:not(:disabled) {
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.tabs--vertical .tab-button:focus-visible:not(:disabled):not(.tab-button--active) {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  box-shadow: none;
}

.tabs--vertical .tab-button--active:focus-visible {
  outline: none;
  box-shadow: none;
}

.tab-button--active {
  background-color: var(--color-surface);
  color: var(--color-primary);
}

.tabs--vertical .tab-button--active {
  background: var(--color-primary);
  color: var(--color-text-white);
  box-shadow: none;
}

.tabs--vertical .tab-button--active:hover:not(:disabled) {
  background: var(--color-primary);
  color: var(--color-text-white);
}

.tab-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: var(--color-text-light);
}

.tabs--vertical .tab-button--active.tab-button--disabled {
  opacity: 0.55;
}

.tab-button__icon {
  font-size: 1.2em;
  flex-shrink: 0;
  color: inherit;
}

.tab-button__stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  min-width: 0;
  text-align: inherit;
}

.tab-button__label {
  white-space: nowrap;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.tab-button__sublabel {
  font-size: var(--font-size-sm);
  font-weight: 400;
  line-height: 1.25;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.tabs--vertical .tab-button__sublabel {
  color: var(--color-text-light);
}

.tabs--vertical .tab-button--active .tab-button__sublabel {
  color: color-mix(in srgb, var(--color-text-white) 78%, transparent);
}

/* ─── Variant underline ───────────────────────────────────────────────────────── */

.tabs--underline {
  gap: 0;
  background: none;
  padding: 0;
  border-radius: 0;
  width: auto;
}

.tabs--underline .tab-button {
  background: none;
  border-radius: 0;
  border-bottom: 2px solid transparent;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-light);
  margin-bottom: -1px;
  gap: var(--spacing-xs);
}

.tabs--underline .tab-button:hover:not(:disabled) {
  background: none;
  color: var(--color-text);
}

.tabs--underline .tab-button--active {
  background: none;
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tabs--underline .tab-button--active:hover:not(:disabled) {
  background: none;
  color: var(--color-primary);
}

.tab-button__count {
  font-size: var(--font-size-xs);
  font-weight: 400;
  background: var(--color-surface-hover);
  color: var(--color-text-light);
  border-radius: var(--radius-pill);
  padding: 0 calc(var(--spacing-md) / 2);
  min-width: var(--line-height-tight);
  text-align: center;
  flex-shrink: 0;
}

.tabs--underline .tab-button--active .tab-button__count {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}

@media (max-width: var(--breakpoint-md)) {
  .tabs:not(.tabs--vertical) {
    width: 100%;
    justify-content: center;
  }

  .tabs:not(.tabs--vertical) .tab-button {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
  }
}
</style> 