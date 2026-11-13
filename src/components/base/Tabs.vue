<template>
  <div
    class="tabs"
    ref="root"
    :class="{
      'tabs--vertical': vertical,
      'tabs--underline': variant === 'underline',
      'tabs--comfortable': density === 'comfortable',
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
        <template #title><span class="tab-button__label">{{ uiText(tab.label) }}</span></template>
        <template v-if="tab.sublabel" #details><span class="tab-button__sublabel">{{ uiText(tab.sublabel) }}</span></template>
      </ItemSummary>
      <span v-if="tab.count !== undefined" class="tab-button__count">{{ tab.count }}</span>
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
import { uiText } from "@/i18n";
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
  density?: 'compact' | 'comfortable';
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
.tabs { display: flex; gap: var(--spacing-xs); padding: var(--spacing-xs); width: fit-content; border-radius: var(--radius-lg); background: var(--color-background-default); }
.tab-button { display: flex; align-items: center; gap: var(--spacing-xs); width: fit-content; padding: var(--spacing-sm) var(--spacing-md); border: 0; border-radius: var(--radius-md); background: none; color: var(--color-text-secondary); font: var(--type-compact); line-height: var(--line-height-small); cursor: pointer; transition: background-color var(--transition-fast), color var(--transition-fast); }
.tab-button:hover:not(:disabled), .tab-button--active { background: var(--color-surface-default); color: var(--color-text-link); }
.tab-button:focus-visible:not(:disabled) { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
.tab-button--disabled { opacity: .5; cursor: not-allowed; }
.tab-button__icon { font-size: 1.2em; flex-shrink: 0; color: inherit; }
.tab-button__stack { display: flex; flex-direction: column; align-items: flex-start; gap: 0; min-width: 0; text-align: inherit; }
.tab-button__label, .tab-button__sublabel { min-width: 0; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tab-button__sublabel { font: var(--type-meta); color: var(--color-text-secondary); }
.tab-button__count { flex-shrink: 0; min-width: var(--line-height-control); padding: 0 calc(var(--spacing-md) / 2); border-radius: var(--radius-pill); background: var(--color-interaction-hover); color: var(--color-text-secondary); font: var(--type-micro); text-align: center; }
.tabs--vertical { flex-direction: column; width: 100%; gap: 0; padding: 0; border-radius: 0; background: transparent; }
.tabs--vertical .tab-button { width: 100%; min-height: 54px; justify-content: flex-start; gap: var(--spacing-sm); border-radius: 0; text-align: left; background: var(--color-surface-default); color: var(--color-text-primary); }
.tabs--vertical .tab-button:not(:first-child) { border-top: 1px solid var(--color-border-light); }
.tabs--vertical .tab-button:hover:not(:disabled):not(.tab-button--active) { background: var(--color-interaction-hover); }
.tabs--vertical .tab-button__label { font-weight: var(--font-weight-semibold); }
.tabs--vertical .tab-button__sublabel { font: var(--type-micro); }
.tabs--vertical .tab-button--active, .tabs--vertical .tab-button--active:hover:not(:disabled) { background: var(--color-interaction-selected); color: var(--color-text-on-selected); }
.tabs--vertical .tab-button--active .tab-button__sublabel { color: inherit; }
.tabs--underline { gap: 0; padding: 0; width: auto; border-radius: 0; background: none; }
.tabs--underline .tab-button { border-radius: 0; border-bottom: 2px solid transparent; margin-bottom: -1px; background: none; }
.tabs--underline .tab-button:hover:not(:disabled) { background: none; color: var(--color-text-primary); }
.tabs--underline .tab-button--active, .tabs--underline .tab-button--active:hover:not(:disabled) { color: var(--color-text-link); border-bottom-color: var(--color-border-focus); }
.tabs--underline .tab-button--active .tab-button__count { background: var(--color-interaction-selected); color: var(--color-text-on-selected); }
.tabs--comfortable .tab-button { padding: var(--spacing-md) var(--spacing-lg); }
@media (max-width: 768px) {
  .tabs:not(.tabs--vertical) { width: 100%; justify-content: center; flex-wrap: wrap; }
  .tabs:not(.tabs--vertical) .tab-button { padding: var(--spacing-sm); }
}
</style>
