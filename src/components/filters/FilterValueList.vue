<template>
  <div class="filter-values" @keydown="onKeydown">
    <input v-if="searchable ?? options.length > 7" v-model="search" class="filter-values__search" type="search"
      :placeholder="uiText(searchPlaceholder)" :aria-label="uiText(searchPlaceholder)" />
    <p v-if="loading" class="filter-values__state" role="status">{{ uiText("Chargement…") }}</p>
    <p v-else-if="error" class="filter-values__state" role="alert">{{ uiText(error) }} <Button variant="tertiary" size="sm" type="button" @click="$emit('retry')">{{ uiText("Réessayer") }}</Button></p>
    <div v-else role="listbox" :aria-label="uiText(label)" :aria-multiselectable="multiple || undefined" class="filter-values__list">
      <div v-for="section in sections" :key="section.label" :role="section.label ? 'group' : undefined" :aria-label="uiText(section.label || undefined)">
        <p v-if="section.label" class="filter-values__group" aria-hidden="true">{{ uiText(section.label) }}</p>
        <button v-for="option in section.options" :key="option.value" type="button" role="option"
          :aria-selected="modelValue.includes(option.value)" class="filter-values__option" @click="pick(option.value)">
          <span>{{ uiText(option.label) }}</span><Icon v-if="modelValue.includes(option.value)" icon="mdi:check" width="17" />
        </button>
      </div>
      <p v-if="!filteredOptions.length" class="filter-values__state" role="status">{{ uiText("Aucun résultat") }}</p>
    </div>
    <button v-if="multiple && modelValue.length" type="button" class="filter-values__clear" @click="$emit('update:modelValue', [])">{{ uiText("Tout effacer") }}</button>
  </div>
</template>
<script setup lang="ts">
import { language, uiText } from '@/i18n';
import Button from '@/components/base/Button.vue';
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
const props = withDefaults(defineProps<{
  options: { value: string; label: string; group?: string }[];
  modelValue: string[];
  label: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  filterLocally?: boolean;
  multiple?: boolean;
  loading?: boolean;
  error?: string | null;
}>(), { searchPlaceholder: 'Rechercher…', filterLocally: true });
const emit = defineEmits<{ 'update:modelValue': [value: string[]]; done: []; retry: [] }>();
const search = defineModel<string>('search', { default: '' });
const filteredOptions = computed(() => props.options.filter(option => !props.filterLocally || option.label.toLocaleLowerCase(language.value).includes(search.value.trim().toLocaleLowerCase(language.value))));
/** Les options gardent leur ordre ; une option sans groupe reste dans une liste simple. */
const sections = computed(() => {
  const groups = new Map<string, typeof filteredOptions.value>();
  for (const option of filteredOptions.value) groups.set(option.group ?? '', [...(groups.get(option.group ?? '') ?? []), option]);
  return [...groups].map(([label, options]) => ({ label, options }));
});
function pick(value: string) {
  emit('update:modelValue', props.multiple ? props.modelValue.includes(value) ? props.modelValue.filter(id => id !== value) : [...props.modelValue, value] : [value]);
  if (!props.multiple) emit('done');
}
function onKeydown(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  if (event.target instanceof HTMLInputElement && !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
  const items = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="option"]')];
  if (!items.length) return;
  event.preventDefault(); event.stopPropagation();
  const index = items.indexOf(document.activeElement as HTMLElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : index < 0 ? event.key === 'ArrowDown' ? 0 : items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
  items[next]?.focus();
}
</script>
<style scoped>
.filter-values { display: flex; flex-direction: column; gap: var(--spacing-xs); min-width: 0; }
.filter-values__search { box-sizing: border-box; width: 100%; min-width: 0; margin-bottom: var(--spacing-xs); padding: var(--spacing-sm); border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); background: var(--color-surface-default); color: var(--color-text-primary); font: inherit; font-size: var(--font-size-sm); }
.filter-values__list { max-height: 300px; overflow-y: auto; }
.filter-values__option { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); width: 100%; padding: 10px var(--spacing-sm); border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-text-primary); font: inherit; font-size: var(--font-size-sm); text-align: left; cursor: pointer; }
.filter-values__group { margin: var(--spacing-xs) 0 0; padding: var(--spacing-xs) var(--spacing-sm); color: var(--color-text-secondary); font-size: var(--font-size-xs); }
.filter-values__option span { min-width: 0; overflow-wrap: anywhere; }
.filter-values__option svg { flex-shrink: 0; color: var(--color-text-link); }
.filter-values__option:hover, .filter-values__option:focus-visible { background: var(--color-interaction-hover); outline: none; }
.filter-values__state { margin: 0; padding: var(--spacing-md) var(--spacing-sm); color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.filter-values__clear { padding: var(--spacing-sm); border: 0; border-top: 1px solid var(--color-border-default); background: transparent; color: var(--color-text-secondary); font: inherit; font-size: var(--font-size-xs); text-align: left; cursor: pointer; }
.filter-values__clear:hover { color: var(--color-text-primary); }
</style>
