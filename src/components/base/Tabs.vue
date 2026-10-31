<template>
  <div
    class="tabs"
    ref="root"
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
      @keydown="onKeydown($event, tab.value)"
      type="button"
      :aria-current="modelValue === tab.value ? 'true' : undefined"
      :disabled="tab.disabled"
    >
      <Icon v-if="tab.icon" :icon="tab.icon" class="tab-button__icon" aria-hidden="true" />
      <ItemSummary class="tab-button__stack">
        <template #title><span class="tab-button__label">{{ tab.label }}</span></template>
        <template v-if="tab.sublabel" #details><span class="tab-button__sublabel">{{ tab.sublabel }}</span></template>
      </ItemSummary>
      <span v-if="tab.count !== undefined" class="tab-button__count">{{ tab.count }}</span>
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
import { Icon } from '@iconify/vue';
import { ref, nextTick } from 'vue';
import type { Tab } from '@/types/global';
import ItemSummary from './ItemSummary.vue';

const props = defineProps<{
  modelValue: T;
  tabs: Tab<T>[];
  vertical?: boolean;
  /** `pill` (défaut) : fond pill actif. `underline` : bordure basse, style header de section. */
  variant?: 'pill' | 'underline';
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: T): void;
}>();
const root = ref<HTMLElement>();
function onKeydown(event: KeyboardEvent, value: T) {
  const forward = props.vertical ? 'ArrowDown' : 'ArrowRight';
  const backward = props.vertical ? 'ArrowUp' : 'ArrowLeft';
  if (![forward, backward, 'Home', 'End'].includes(event.key)) return;
  const enabled = props.tabs.filter(tab => !tab.disabled);
  if (!enabled.length) return;
  event.preventDefault();
  const current = enabled.findIndex(tab => tab.value === value);
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : (current + (event.key === forward ? 1 : -1) + enabled.length) % enabled.length;
  emit('update:modelValue', enabled[index].value);
  void nextTick(() => root.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')[index]?.focus());
}
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
  outline: 2px solid var(--color-text-white);
  outline-offset: -3px;
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

@media (max-width: 768px) {
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

<style scoped>
.tab-button, .tabs--underline .tab-button { font-weight: 400; line-height: var(--line-height-small); }
.tabs--vertical .tab-button { min-height: 54px; font-size: var(--font-size-sm); }
.tabs--vertical .tab-button__label { font-weight: 600; line-height: var(--line-height-small); }
.tabs--vertical .tab-button__sublabel { font-size: var(--font-size-xs); line-height: var(--line-height-micro); }
.tabs--vertical .tab-button--active, .tabs--vertical .tab-button--active:hover:not(:disabled) { background: var(--color-interaction-selected); color: var(--color-text-on-selected); }
.tabs--vertical .tab-button--active .tab-button__sublabel { color: var(--color-text-on-selected); }
.tabs--vertical .tab-button--active:focus-visible { outline-color: var(--color-border-focus); }
</style>
