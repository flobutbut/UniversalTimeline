<template>
  <div
    class="finder-item"
    :class="{
      'selected': selected,
      'finder-item-has-children': hasChildren && !wikidataOnly,
      'finder-item-wikidata-children': hasChildren && wikidataOnly
    }"
    :aria-selected="selected"
    tabindex="0"
    :draggable="true"
    @dragstart="emit('dragstart', itemId)"
    @dragover.prevent
    @drop="emit('drop', itemId)"
    @click="emit('click')"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="finder-item-content" ref="contentRef">
      <div class="finder-item-text">
        <div
          class="finder-item-title"
          :class="{ 'finder-item-label-wikidata': wikidataOnly }"
        >
          <slot>{{ label.fr }}</slot>
        </div>
        <div class="finder-item-dates">
          <span v-if="categories && categories.length" class="finder-item-category">{{ categories[0].label.fr }}</span>
          <span v-if="categories && categories.length" class="finder-item-date-sep"> · </span>
          {{ dateSubtitle }}
        </div>
      </div>
    </div>
    <div class="finder-item-actions">
      <button
        v-if="itemId"
        class="action-button row-action-button"
        ref="editBtnRef"
        type="button"
        @click.stop="onRowActionClick"
        v-show="showRowAction"
      >
        {{ wikidataOnly ? 'Add' : 'Edit' }}
      </button>
      <div class="finder-item-chevron">
        <ChevronIcon
          :width="16"
          :height="16"
          :color="selected ? 'var(--color-text-white)' : 'var(--color-text-light)'"
          :style="{ opacity: chevronOpacity }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { MultilingualText, Category } from '@/types/database';
import { formatFinderItemDateRangeSubtitle } from '@/lib/finderItemDateLabels';
import ChevronIcon from '@/components/icons/ChevronIcon.vue';

const props = defineProps<{
  label: MultilingualText;
  selected: boolean;
  /** Sous-périodes possibles (API, Wikidata ou déjà chargées dans le store). */
  hasChildren: boolean;
  /** Ligne non persistée (id `wikidata:…`) : style distinct de l'enregistrement PostgreSQL. */
  wikidataOnly?: boolean;
  itemId: string;
  startDate?: string;
  endDate?: string;
  categories?: Category[];
}>();

const dateSubtitle = computed(() =>
  formatFinderItemDateRangeSubtitle(props.startDate, props.endDate)
);

const chevronOpacity = computed(() => {
  if (!props.hasChildren) return 0.3;
  if (props.selected) return 1;
  if (props.wikidataOnly) return 0.55;
  return 1;
});

const emit = defineEmits<{
  (e: 'click'): void;
  (e: 'dragstart', itemId: string): void;
  (e: 'drop', itemId: string): void;
  (e: 'edit', itemId: string): void;
  (e: 'add', itemId: string): void;
}>();

function onRowActionClick() {
  if (props.wikidataOnly) emit('add', props.itemId);
  else emit('edit', props.itemId);
}

const showRowAction = ref(false);
const editBtnRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);

function handleMouseEnter() {
  showRowAction.value = true;
}
function handleMouseLeave() {
  showRowAction.value = props.selected;
}

watch(
  () => props.selected,
  (val) => {
    showRowAction.value = val;
  },
  { immediate: true }
);
</script>

<style scoped>
.finder-item {
  position: relative;
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  color: var(--color-text);
  transition: all 0.2s ease;
  font-size: var(--font-size-base);
  line-height: 1.5;
  outline: none;
  min-height: auto;
  height: auto;
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border: none;
  width: 100%;
  box-sizing: border-box;
}

/* Séparateurs entre lignes : bordure haute (pas basse) pour pouvoir retirer celle au-dessus de la sélection. */
.finder-item:not(:first-child) {
  border-top: 1px solid var(--color-border-light);
}

.finder-item-content {
  flex: 1;
  min-width: 0;
  padding: 0 !important;
  margin: 0 !important;
  margin-right: var(--spacing-sm);
}

.finder-item-text {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}

.finder-item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.finder-item-dates {
  font-size: var(--font-size-xs);
  line-height: 1.25;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.finder-item.selected .finder-item-dates {
  color: color-mix(in srgb, var(--color-text-white) 82%, transparent);
}

.finder-item-label-wikidata {
  color: var(--color-wikidata-label);
}

.finder-item.selected .finder-item-label-wikidata {
  color: var(--color-wikidata-label-on-primary);
}

.finder-item-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.action-button {
  background: none;
  border: none;
  padding: 0;
  margin:0 6px;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
  white-space: nowrap;
  width: auto;
  min-width: 0;
}

.action-button:hover {
  color: var(--color-primary-dark);
}

.row-action-button {
  visibility: hidden;
}

.finder-item:hover .row-action-button,
.finder-item.selected .row-action-button {
  visibility: visible;
}

.finder-item.selected .action-button {
  color: var(--color-text-white);
}

.finder-item.selected .action-button:hover {
  color: color-mix(in srgb, var(--color-text-white) 88%, transparent);
}

.finder-item:hover,
.finder-item.droppable {
  background: var(--color-surface-hover);
}

.finder-item.selected {
  border: none;
  box-shadow: none;
  background: var(--color-primary);
  color: var(--color-text-white);
}

/* Clic = focus (tabindex) : pas de contour sur la sélection */
.finder-item.selected:focus,
.finder-item.selected:focus-visible {
  outline: none;
  box-shadow: none;
}

.finder-item:hover .finder-item-chevron,
.finder-item.droppable .finder-item-chevron {
  opacity: 1;
}

/* Anneau clavier seulement si non sélectionné */
.finder-item:focus-visible:not(.selected) {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.finder-item:focus:not(:focus-visible):not(.selected) {
  outline: none;
}

/* Barre gauche : enregistrement en base (enfants côté API / BDD). */
.finder-item-has-children {
  border-left: calc(var(--radius-md) / 2) solid var(--color-primary);
}

/* Hiérarchie connue uniquement via Wikidata (pas encore de ligne PostgreSQL). */
.finder-item-wikidata-children {
  border-left: calc(var(--radius-md) / 2) solid var(--color-text-secondary);
}

.finder-item.selected.finder-item-has-children,
.finder-item.selected.finder-item-wikidata-children {
  border-left: none;
  padding-left: calc(var(--spacing-md) + 3px);
}

.finder-item.selected .finder-item-chevron {
  color: var(--color-text-white);
  opacity: 1;
}

.finder-item-chevron {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: var(--spacing-xs);
}
</style> 