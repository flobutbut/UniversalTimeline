<template>
  <div ref="root" class="filter-builder">
    <Tag v-for="filter in activeFilters" :key="filter.key" :label="filter.label" variant="accent" size="md" removable :remove-label="`Retirer le filtre ${filter.label}`" @remove="emit('remove', filter.key)" class="filter-chip" :class="{ 'filter-chip--dates': filter.type === 'time' }">
      <template #label><slot :name="`chip-${filter.type}`" :filter="filter" :expanded="open && !adding && selectedType === filter.type"
        :open="(event: MouseEvent, focus?: string) => showEditor(filter.type, event, focus)">
        <button type="button" class="filter-chip__edit" :aria-label="`Modifier le filtre ${filter.label}`"
          :data-filter-type="filter.type" aria-haspopup="dialog" :aria-expanded="open && !adding && selectedType === filter.type" @click="showEditor(filter.type, $event)">
          <Icon v-if="filter.type === 'time'" icon="mdi:calendar-range-outline" width="15" /><span>{{ filter.label }}</span><Icon icon="mdi:chevron-down" width="14" />
        </button>
      </slot></template>
    </Tag>
    <Button ref="trigger" variant="ghost" size="sm" :aria-expanded="open && adding" aria-haspopup="menu"
      :aria-controls="open ? `${id}-panel` : undefined" @click="toggleMenu">
      <template #icon><Icon icon="mdi:plus" width="16" /></template>Ajouter un filtre
    </Button>
    <Teleport to="body">
      <PopoverSurface padded v-if="open" :ref="panelElement" :id="`${id}-panel`" class="filter-builder__panel" :class="{ 'filter-builder__panel--cascade': adding && selectedType }" :style="panelStyle"
        :role="selectedType ? 'dialog' : 'menu'" :aria-label="selectedType ? selectedLabel : 'Types de filtres'"
        @keydown.esc="onEscape" @keydown="onMenuKeydown">
        <div v-if="adding" class="filter-builder__types" :role="selectedType ? 'menu' : undefined" aria-label="Types de filtres">
          <button v-for="type in addableTypes" :key="type.key" type="button" role="menuitem" class="filter-builder__type"
            :class="{ 'filter-builder__type--active': selectedType === type.key }" :data-filter-key="type.key" :disabled="type.disabled" :aria-disabled="type.disabled || undefined"
            @mouseenter="previewType(type.key)" @click="selectType(type.key)">
            <Icon :icon="type.icon" width="17" /><span>{{ type.label }}</span><Icon :icon="type.trigger ? 'mdi:plus' : 'mdi:chevron-right'" width="16" />
          </button>
        </div>
        <div v-if="selectedType" class="filter-builder__values">
          <div class="filter-builder__heading">
            <button v-if="adding" type="button" class="filter-builder__back" aria-label="Choisir un autre type de filtre" @click="showTypes"><Icon icon="mdi:chevron-left" width="18" /></button>
            <span>{{ selectedLabel }}</span>
            <button type="button" class="filter-builder__close" aria-label="Fermer le filtre" @click="close(true)"><Icon icon="mdi:close" width="16" /></button>
          </div>
          <div class="filter-builder__editor"><slot :type="selectedType" :close="() => close(true)" /></div>
        </div>
      </PopoverSurface>
    </Teleport>
  </div>
</template>
<script setup lang="ts">
import { elementRef } from '@/utils/elementRef';
import PopoverSurface from '@/components/base/PopoverSurface.vue';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { Icon } from '@iconify/vue';
import Tag from '@/components/base/Tag.vue';
import Button from '@/components/base/Button.vue';
import { generateDomUid } from '@/utils/generateDomUid';
import type { ActiveFilter, FilterType } from './filterTypes';
const props = defineProps<{ types: FilterType[]; activeFilters: ActiveFilter[] }>();
const emit = defineEmits<{ remove: [key: string]; add: [type: string] }>();
const id = generateDomUid('filters');
const root = ref<HTMLElement>();
const panel = ref<HTMLElement | null>(null);
const panelElement = elementRef(panel);
const trigger = ref<{ $el: HTMLButtonElement }>();
const open = ref(false);
const adding = ref(false);
const addableTypes = computed(() => props.types.filter(type => !type.trigger || !props.activeFilters.some(filter => filter.type === type.key)));
const selectedType = ref<string | null>(null);
const selectedLabel = computed(() => props.types.find(type => type.key === selectedType.value)?.label ?? '');
const panelStyle = ref<Record<string, string>>({});
let anchor: HTMLElement | null = null;
let requestedFocus: string | undefined;
function positionPanel() {
  if (!open.value || !anchor) return;
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(adding.value ? selectedType.value ? 568 : 232 : 336, window.innerWidth - 24);
  const panelHeight = panel.value?.getBoundingClientRect().height ?? 260;
  const below = window.innerHeight - rect.bottom - 20;
  const above = rect.top - 20;
  const placeAbove = below < panelHeight && above > below;
  panelStyle.value = {
    left: `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`,
    width: `${width}px`,
    maxHeight: `${Math.max(100, placeAbove ? above : below)}px`,
    ...(placeAbove ? { bottom: `${window.innerHeight - rect.top + 6}px` } : { top: `${rect.bottom + 6}px` }),
  };
}
async function focusPanel() {
  await nextTick(); positionPanel();
  const focusTarget = requestedFocus ? panel.value?.querySelector<HTMLElement>(requestedFocus) : selectedType.value
    ? panel.value?.querySelector<HTMLElement>('.filter-builder__editor input, .filter-builder__editor [role="option"], .filter-builder__editor .base-select__trigger') ?? panel.value?.querySelector<HTMLElement>('.filter-builder__values button')
    : panel.value?.querySelector<HTMLElement>('[role="menuitem"]');
  focusTarget?.focus();
}
function toggleMenu(event: MouseEvent) {
  if (open.value && adding.value) { close(true); return; }
  anchor = event.currentTarget as HTMLElement; adding.value = true; requestedFocus = undefined; selectedType.value = null; open.value = true;
  positionPanel(); void focusPanel();
}
function showEditor(type: string, event: MouseEvent, focus?: string) {
  requestedFocus = focus;
  anchor = event.currentTarget as HTMLElement; adding.value = false; selectedType.value = type; open.value = true;
  positionPanel(); void focusPanel();
}
function previewType(type: string) {
  if (props.types.find(item => item.key === type)?.disabled) return;
  if (props.types.find(item => item.key === type)?.trigger) selectedType.value = null;
  else selectedType.value = type;
  void nextTick(positionPanel);
}
async function selectType(type: string) {
  if (props.types.find(item => item.key === type)?.disabled) return;
  if (props.types.find(item => item.key === type)?.trigger) {
    emit('add', type); close();
    await nextTick();
    root.value?.querySelector<HTMLElement>(`[data-filter-type="${type}"]`)?.focus();
  } else { selectedType.value = type; void focusPanel(); }
}
function showTypes() { selectedType.value = null; void focusPanel(); }
function close(restoreFocus = false) {
  open.value = false;
  if (restoreFocus) (anchor?.isConnected ? anchor : trigger.value?.$el)?.focus();
}
function onEscape(event: KeyboardEvent) {
  if (event.defaultPrevented) return;
  event.preventDefault(); event.stopPropagation(); close(true);
}
function onMenuKeydown(event: KeyboardEvent) {
  if (!adding.value) return;
  if (selectedType.value && event.key === 'ArrowLeft' && !(event.target instanceof HTMLInputElement)) {
    event.preventDefault(); showTypes(); return;
  }
  if (!(event.target instanceof HTMLElement) || !event.target.matches('[role="menuitem"]')) return;
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    const type = event.target.dataset.filterKey;
    if (type) void selectType(type);
    return;
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const items = [...panel.value!.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')];
  const index = items.indexOf(document.activeElement as HTMLElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
  items[next]?.focus();
  const nextType = items[next]?.dataset.filterKey;
  if (nextType) previewType(nextType);
}
function onOutside(event: Event) {
  if (!open.value || !(event.target instanceof Node)) return;
  if (!root.value?.contains(event.target) && !panel.value?.contains(event.target)) close();
}
onMounted(() => {
  document.addEventListener('pointerdown', onOutside);
  document.addEventListener('focusin', onOutside);
  window.addEventListener('resize', positionPanel);
  window.addEventListener('scroll', positionPanel, true);
});
onUnmounted(() => {
  document.removeEventListener('pointerdown', onOutside);
  document.removeEventListener('focusin', onOutside);
  window.removeEventListener('resize', positionPanel);
  window.removeEventListener('scroll', positionPanel, true);
});
</script>
<style scoped>
.filter-builder { display: flex; flex-wrap: nowrap; flex-shrink: 0; align-items: center; gap: var(--spacing-sm); min-width: 0; }
.filter-chip { max-width: 300px; }
.filter-chip--dates { max-width: none; }
.filter-chip button { display: inline-flex; align-items: center; gap: 6px; padding: 7px var(--spacing-sm); border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.filter-chip__edit { min-width: 0; }
.filter-chip__edit span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.filter-chip__edit svg { flex-shrink: 0; }
.filter-chip button:hover { background: var(--color-interaction-hover); }
.filter-chip button:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
.filter-builder__panel { position: fixed; z-index: var(--z-index-dropdown); box-sizing: border-box; overflow-y: auto; }
.filter-builder__panel--cascade { display: flex; }
.filter-builder__types { flex: 0 0 220px; min-width: 0; }
.filter-builder__values { flex: 1; min-width: 0; }
.filter-builder__panel--cascade .filter-builder__values { border-left: 1px solid var(--color-border-default); margin-left: 6px; padding-left: 6px; }
@media (max-width: 600px) { .filter-builder__panel--cascade { flex-direction: column; } .filter-builder__types { flex-basis: auto; } .filter-builder__panel--cascade .filter-builder__values { margin-left: 0; padding-left: 0; border-left: 0; border-top: 1px solid var(--color-border-default); } }
.filter-builder__type { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px; border: 0; border-radius: var(--radius-sm); color: var(--color-text-primary); background: transparent; font: inherit; font-size: var(--font-size-sm); text-align: left; cursor: pointer; }
.filter-builder__type:disabled { opacity: 0.4; cursor: default; }
.filter-builder__type span { flex: 1; }
.filter-builder__type--active, .filter-builder__type:hover:not(:disabled), .filter-builder__type:focus-visible { background: var(--color-interaction-hover); outline: none; }
.filter-builder__heading { display: flex; align-items: center; gap: 6px; padding: 2px 0 var(--spacing-sm); border-bottom: 1px solid var(--color-border-default); color: var(--color-text-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.filter-builder__heading button { display: inline-flex; padding: 5px; border: 0; background: transparent; color: inherit; border-radius: var(--radius-sm); cursor: pointer; }
.filter-builder__heading button:hover { background: var(--color-interaction-hover); }
.filter-builder__heading span { flex: 1; }
.filter-builder__editor { padding: 6px 0; }
.filter-builder__editor:has(.temporal-range__time) { padding: var(--spacing-md) var(--spacing-sm); }
/* Keep value choices inside the scrolling editor instead of clipping an absolute dropdown. */
.filter-builder__editor :deep(.base-select__dropdown) { position: static; margin-top: var(--spacing-sm); box-shadow: none; }
@media (max-width: 640px) { .filter-builder { flex-wrap: wrap; max-width: 100%; } .filter-chip--dates { max-width: 100%; flex-wrap: wrap; } }
</style>
