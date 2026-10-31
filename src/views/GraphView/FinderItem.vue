<template>
  <div
    class="finder-item"
    :class="{
      selected,
      'finder-item-has-children': hasChildren && !wikidataOnly,
      'finder-item-wikidata-children': hasChildren && wikidataOnly,
      'finder-item--external-catalog': isExternalCatalog,
    }"
    :draggable="isDraggable"
    @dragstart="onDragStart"
    @dragover.prevent
    @drop="emit('drop', itemId)"
    @click="emit('click')"
  >
    <button ref="contentButton" type="button" class="finder-item-content" :aria-label="label.fr" :aria-current="selected ? 'true' : undefined" @click.stop="emit('click')">
      <ItemSummary class="finder-item-text">
        <template #title><span
          class="finder-item-title"
          :class="{ 'finder-item-label-wikidata': wikidataOnly }"
        >
          <slot>{{ label.fr }}</slot>
        </span></template>
        <template #details><span class="finder-item-dates">
          <span v-if="categories && categories.length" class="finder-item-category">{{ categories[0].label.fr }}</span>
          <span v-if="categories && categories.length" class="finder-item-date-sep"> · </span>
          {{ dateSubtitle }}
        </span></template>
      </ItemSummary>
    </button>
    <div
      class="finder-item-actions"
      :class="{ 'finder-item-actions--slot-trailing': hideChevron }"
    >
      <div v-if="$slots.actions" class="finder-item-actions__slot">
        <slot name="actions" />
      </div>
      <button
        v-if="itemId && !hideRowAction"
        class="action-button row-action-button"
        type="button"
        @click.stop="onRowActionClick"
        :aria-label="`${wikidataOnly ? 'Ajouter' : 'Modifier'} ${label.fr}`"
      >
        {{ wikidataOnly ? 'Add' : 'Edit' }}
      </button>
      <div v-if="!hideChevron" class="finder-item-chevron">
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
/**
 * Ligne finder unique : tout passe par les props / le slot `#actions` (retirer, ajouter, etc.).
 * Ex. story — périodes : `hide-row-action`, slot actions, `is-external-catalog`, `hide-chevron` si pas de drilldown ;
 * story — événements : `hide-chevron`, `date-subtitle-override`, slot actions.
 */
import { computed, ref, watchPostEffect } from 'vue';
import type { MultilingualText, Category } from '@/types/database';
import { formatFinderItemDateRangeSubtitle } from '@/lib/finderItemDateLabels';
import ChevronIcon from '@/components/icons/ChevronIcon.vue';
import ItemSummary from '@/components/base/ItemSummary.vue';

const props = defineProps<{
  label: MultilingualText;
  selected: boolean;
  focusRequested?: boolean;
  /** Sous-périodes possibles (API, Wikidata ou déjà chargées dans le store). */
  hasChildren: boolean;
  /** Ligne non persistée (id `wikidata:…`) : style distinct de l'enregistrement PostgreSQL. */
  wikidataOnly?: boolean;
  itemId: string;
  startDate?: string;
  endDate?: string;
  categories?: Category[];
  /** Désactive le drag HTML5 (ex. périodes d'une story en mode colonnes). */
  draggable?: boolean;
  /** Masque le bouton Edit / Add en fin de ligne. */
  hideRowAction?: boolean;
  /** Masque le chevron (ex. liste d'événements avec actions custom). */
  hideChevron?: boolean;
  /** Sous-titre dates : remplace le calcul à partir de startDate / endDate. */
  dateSubtitleOverride?: string;
  /**
   * Ligne « catalogue » hors périmètre story (ex. période globale affichée en finder) :
   * libellés / dates atténués jusqu'au survol.
   */
  isExternalCatalog?: boolean;
}>();

const isDraggable = computed(() => props.draggable !== false);

const dateSubtitle = computed(() => {
  const o = props.dateSubtitleOverride;
  if (o !== undefined && String(o).trim() !== '') return o;
  return formatFinderItemDateRangeSubtitle(props.startDate, props.endDate);
});
const contentButton = ref<HTMLButtonElement | null>(null);
watchPostEffect(() => {
  if (props.focusRequested && props.selected) contentButton.value?.focus();
});

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

function onDragStart(e: DragEvent) {
  if (!isDraggable.value) {
    e.preventDefault();
    return;
  }
  emit('dragstart', props.itemId);
}

function onRowActionClick() {
  if (props.wikidataOnly) emit('add', props.itemId);
  else emit('edit', props.itemId);
}

</script>

<style scoped>
.finder-item {
  position: relative;
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  color: var(--color-text);
  transition: all 0.2s ease;
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  outline: none;
  min-height: auto;
  height: auto;
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border: none;
  border-bottom: 1px solid var(--color-border-light);
  width: 100%;
  box-sizing: border-box;
}

.finder-item-content {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
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
  row-gap: 0;
  min-width: 0;
  line-height: var(--line-height-tight);
}

.finder-item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: var(--line-height-tight);
  margin: 0;
  padding: 0;
}

.finder-item-dates {
  font-size: var(--font-size-xs);
  line-height: var(--line-height-tight);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
  padding: 0;
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

.finder-item-actions--slot-trailing {
  justify-content: flex-end;
}

.finder-item-actions__slot {
  display: flex;
  align-items: center;
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
  opacity: 0;
  min-height: 24px;
}

.finder-item:hover .row-action-button,
.finder-item:focus-within .row-action-button,
.finder-item.selected .row-action-button {
  opacity: 1;
}

.finder-item.selected button:focus-visible { outline: 2px solid var(--color-text-white); outline-offset: -2px; }
@media (hover: none) { .row-action-button { opacity: 1; } }

.finder-item.selected .action-button {
  color: var(--color-text-white);
}

.finder-item.selected .action-button:hover {
  color: color-mix(in srgb, var(--color-text-white) 88%, transparent);
}

.finder-item:hover {
  background: var(--color-surface-hover);
}

.finder-item.selected {
  border: none;
  border-bottom: 1px solid var(--color-border-light);
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

.finder-item:hover .finder-item-chevron {
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

/* Période catalogue hors story (story / finder colonnes) */
.finder-item--external-catalog:not(.selected) .finder-item-title,
.finder-item--external-catalog:not(.selected) .finder-item-dates {
  opacity: 0.58;
}

.finder-item--external-catalog:not(.selected):hover .finder-item-title,
.finder-item--external-catalog:not(.selected):hover .finder-item-dates {
  opacity: 0.78;
}
</style>
