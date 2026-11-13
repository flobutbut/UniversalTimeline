<template>
  <div class="filter-bar" :class="{ 'filter-bar--no-title': hideTitle, 'filter-bar--panel': layout === 'panel' }">
    <h2 v-if="!hideTitle" class="filter-bar__title">{{ resolvedTitle }}</h2>
    <div class="filter-bar__filters">
      <div
        class="filter-bar__search-wrap"
        ref="searchWrapRef"
        @focusin="onSearchFocusIn"
        @focusout="onSearchFocusOut"
        @keydown.esc="closeSearchPanel"
      >
        <SearchInput
          ref="searchInputRef"
          v-model="search"
          :placeholder="uiText(searchPlaceholderResolved)"
          size="sm"
          autocomplete="off"
          role="combobox"
          aria-haspopup="dialog"
          :aria-expanded="dropdownVisible"
          :aria-controls="dropdownVisible ? panelId : undefined"
          @keydown.down.prevent="focusResults(1)"
          @keydown.up.prevent="focusResults(-1)"
        />
        <Teleport to="body">
          <PopoverSurface
            v-if="dropdownVisible"
            :ref="dropdownRefElement"
            class="filter-bar-dd"
            :style="dropdownStyle"
            :id="panelId"
            role="dialog"
            :aria-label="uiText('Résultats de recherche')"
            :aria-busy="searchLoading"
            @keydown.esc="closeSearchPanel"
            @keydown="onResultsKeydown"
            @focusout="onSearchFocusOut"
          >
            <div v-if="searchLoading" class="filter-bar-dd__empty" role="status">{{ uiText("Recherche en cours…") }}</div>
            <div v-else-if="searchError" class="filter-bar-dd__empty" role="alert">
              {{ uiText(searchError) }}
              <Button variant="tertiary" size="sm" type="button" @mousedown.prevent @click="$emit('retrySearch')">{{ uiText("Réessayer") }}</Button>
            </div>
            <template v-else-if="mode === 'periods'">
              <div v-if="!suggestions.length" class="filter-bar-dd__empty" role="status">{{ uiText("Aucun résultat") }}</div>
              <template v-else>
                <div
                  v-for="p in suggestions"
                  :key="p.id"
                  class="filter-bar-dd__item"
                >
                  <button type="button" class="filter-bar-dd__choose" @mousedown.prevent @click="onPickPeriod(p)">
                  <span class="filter-bar-dd__label">{{ localizedText(p.label) }}</span>
                  <span v-if="p.id.startsWith('wikidata:')" class="filter-bar-dd__meta">{{ uiText("Wikidata") }}</span>
                  <span v-else class="filter-bar-dd__meta">{{ formatPeriodLine(p) }}</span>
                  </button>
                  <button
                    v-if="allowWikidataCreate && p.id.startsWith('wikidata:')"
                    type="button"
                    class="filter-bar-dd__action"
                    @mousedown.stop.prevent
                    @click.stop.prevent="onWikidataAdd(p.id)"
                    :aria-label="uiFormat`Créer ${localizedText(p.label)}`"
                  > {{ uiText("Créer") }} </button>
                </div>
              </template>
            </template>
            <template v-else>
              <div v-if="!eventSuggestions.length" class="filter-bar-dd__empty" role="status">{{ uiText("Aucun résultat") }}</div>
              <template v-else>
                <div
                  v-for="ev in eventSuggestions"
                  :key="ev.id"
                  class="filter-bar-dd__item"
                >
                  <button type="button" class="filter-bar-dd__choose" @mousedown.prevent @click="onPickEvent(ev)">
                  <span class="filter-bar-dd__label">{{ localizedText(ev.label) }}</span>
                  <span class="filter-bar-dd__meta">{{ formatEventLine(ev) }}</span>
                  </button>
                </div>
              </template>
            </template>
          </PopoverSurface>
        </Teleport>
      </div>
      <div class="filter-bar__select">
        <Select
          v-model="tagId"
          :options="tagOptions"
          :placeholder="uiText('Tous les tags')"
          :searchable="tagOptions.length > 10"
          size="sm"
        />
      </div>
    </div>
    <div v-if="$slots.actions" class="filter-bar__slot-actions">
      <slot name="actions" />
    </div>
    <Button v-if="!hideAdd" variant="primary" size="sm" class="filter-bar__add-btn" @click="$emit('add')">
      {{ addButtonLabelResolved }}
    </Button>
  </div>
</template>

<script setup lang="ts">
import { localizedText, uiFormat, uiText } from '@/i18n';
import { elementRef } from '@/utils/elementRef';
import PopoverSurface from '@/components/base/PopoverSurface.vue';
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import SearchInput from '@/components/base/SearchInput.vue';
import Select from '@/components/base/Select.vue';
import Button from '@/components/base/Button.vue';
import type { ListEvent, ListPeriod } from '@/types/database';
import { formatSelectListPeriodLine } from '@/lib/selectListPeriodHelpers';
import { formatStoryEventDateLabel } from '@/lib/formatTemporalBoundLabel';
import { generateDomUid } from '@/utils/generateDomUid';

export interface FilterBarTagOption {
  value: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    /** `events` : recherche / liste d'autocomplétion pour les événements. */
    mode?: 'periods' | 'events';
    layout?: 'default' | 'panel';
    /** Masque le titre (h2) à gauche du header. */
    hideTitle?: boolean;
    hideAdd?: boolean;
    title?: string;
    searchPlaceholder?: string;
    addButtonLabel?: string;
    /** En mode périodes uniquement. */
    tagOptions: FilterBarTagOption[];
    /** Mode `periods` : résultats filtrés ; mode `events` : ignoré (tableau vide par défaut). */
    suggestions?: ListPeriod[];
    /** Mode `events` : autocomplétion ; mode `periods` : ignoré. */
    eventSuggestions?: ListEvent[];
    /** Affiche le bouton « Créer » sur les lignes Wikidata (mode périodes). */
    allowWikidataCreate?: boolean;
    searchLoading?: boolean;
    searchError?: string | null;
  }>(),
  {
    mode: 'periods',
    hideTitle: false,
    title: undefined,
    searchPlaceholder: undefined,
    addButtonLabel: undefined,
    tagOptions: () => [],
    suggestions: () => [],
    eventSuggestions: () => [],
    allowWikidataCreate: true,
    searchLoading: false,
    searchError: null,
  },
);

const emit = defineEmits<{
  add: [];
  pickPeriod: [period: ListPeriod];
  pickEvent: [event: ListEvent];
  wikidataAdd: [wikidataItemId: string];
  retrySearch: [];
}>();

const search = defineModel<string>('search', { default: '' });
const tagId = defineModel<string>('tagId', { default: '' });

const searchWrapRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<{ focus: () => void }>();
const panelId = generateDomUid('search-panel');
const dropdownRef = ref<HTMLElement | null>(null);
const dropdownRefElement = elementRef(dropdownRef);
const dropdownStyle = ref<Record<string, string>>({});
const panelOpen = ref(false);
let blurTimer: ReturnType<typeof setTimeout> | undefined;

const searchTrim = computed(() => search.value.trim());
const dropdownVisible = computed(
  () => panelOpen.value && searchTrim.value.length >= 1,
);

const resolvedTitle = computed(() => {
  if (props.title != null && props.title !== '') return props.title;
  return props.mode === 'events' ? 'Événements' : 'Périodes';
});

const searchPlaceholderResolved = computed(() => {
  if (props.searchPlaceholder) return props.searchPlaceholder;
  return props.mode === 'events' ? 'Rechercher un événement…' : 'Rechercher une période…';
});

const addButtonLabelResolved = computed(() => {
  if (props.addButtonLabel) return props.addButtonLabel;
  return props.mode === 'events' ? '+ Ajouter un événement' : '+ Ajouter une période';
});

function formatPeriodLine(p: ListPeriod) {
  return formatSelectListPeriodLine(p);
}

function formatEventLine(ev: ListEvent) {
  return formatStoryEventDateLabel(ev);
}

function updateDropdownPosition() {
  const el = searchWrapRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 16);
  dropdownStyle.value = {
    top: rect.bottom + 6 + 'px',
    left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) + 'px',
    width: width + 'px',
    maxHeight: Math.max(80, Math.min(420, window.innerHeight - rect.bottom - 14)) + 'px',
  };
}

const resultButtons = () => [...dropdownRef.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []];
function focusResults(direction: 1 | -1) {
  panelOpen.value = true;
  void nextTick(() => {
    const buttons = resultButtons();
    (direction === 1 ? buttons[0] : buttons[buttons.length - 1])?.focus();
  });
}
function onResultsKeydown(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const buttons = resultButtons();
  if (!buttons.length) return;
  event.preventDefault();
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
  buttons[index]?.focus();
}
function closeSearchPanel(event: KeyboardEvent) {
  if (!dropdownVisible.value) return;
  event.preventDefault(); event.stopPropagation();
  searchInputRef.value?.focus();
  panelOpen.value = false;
}
function dismissAfterSelection() { searchInputRef.value?.focus(); panelOpen.value = false; }

function onSearchFocusIn() {
  clearTimeout(blurTimer);
  panelOpen.value = true;
  if (dropdownVisible.value) void nextTick(() => updateDropdownPosition());
}

function onSearchFocusOut(e: FocusEvent) {
  const rt = e.relatedTarget as Node | null;
  if (rt && (searchWrapRef.value?.contains(rt) || dropdownRef.value?.contains(rt))) return;
  clearTimeout(blurTimer);
  blurTimer = setTimeout(() => {
    const ae = document.activeElement;
    if (searchWrapRef.value?.contains(ae) || dropdownRef.value?.contains(ae)) return;
    panelOpen.value = false;
  }, 150);
}

function onDocMouseDown(e: MouseEvent) {
  const t = e.target as Node;
  if (searchWrapRef.value?.contains(t)) return;
  if (dropdownRef.value?.contains(t)) return;
  panelOpen.value = false;
}

function onPickPeriod(p: ListPeriod) {
  emit('pickPeriod', p);
  dismissAfterSelection();
}

function onPickEvent(ev: ListEvent) {
  emit('pickEvent', ev);
  dismissAfterSelection();
}

function onWikidataAdd(id: string) {
  emit('wikidataAdd', id);
  dismissAfterSelection();
}

watch(
  () =>
    [
      dropdownVisible.value,
      props.suggestions.length,
      props.eventSuggestions.length,
      props.searchLoading,
      props.searchError,
      search.value,
    ] as const,
  () => {
    if (dropdownVisible.value) void nextTick(() => updateDropdownPosition());
  },
);

onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDown);
  window.addEventListener('scroll', updateDropdownPosition, true);
  window.addEventListener('resize', updateDropdownPosition);
});

onUnmounted(() => {
  clearTimeout(blurTimer);
  document.removeEventListener('mousedown', onDocMouseDown);
  window.removeEventListener('scroll', updateDropdownPosition, true);
  window.removeEventListener('resize', updateDropdownPosition);
});
</script>

<style scoped>
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-surface-default);
  border-bottom: 1px solid var(--color-border-default);
  box-sizing: border-box;
  min-width: 0;
}

.filter-bar__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-bar__filters {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1 1 260px;
  min-width: min(100%, 228px);
  overflow: visible;
}

.filter-bar--no-title .filter-bar__filters {
  flex: 1 1 260px;
}

.filter-bar__slot-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--spacing-sm);
}

.filter-bar__search-wrap {
  flex: 1 1 140px;
  min-width: 100px;
}

.filter-bar__select {
  flex: 1 1 160px;
  min-width: 120px;
  max-width: 240px;
}

.filter-bar__add-btn {
  flex-shrink: 0;
}
@media (max-width: 640px) {
  .filter-bar { flex-wrap: wrap; }
  .filter-bar__filters, .filter-bar--no-title .filter-bar__filters { flex: 1 1 100%; order: 2; overflow: visible; }
  .filter-bar__title { flex: 1; }
  .filter-bar__select { min-width: 0; }
  .filter-bar__add-btn { margin-left: auto; }
}
@media (max-width: 400px) {
  .filter-bar__filters { flex-wrap: wrap; }
  .filter-bar__search-wrap, .filter-bar__select { flex-basis: 100%; max-width: none; }
}

.filter-bar--panel { padding: var(--spacing-md); min-height: 54px; }
.filter-bar--panel .filter-bar__filters { flex: 0 1 504px; }
.filter-bar--panel .filter-bar__search-wrap { flex: 0 1 256px; }
.filter-bar--panel .filter-bar__select { flex: 0 1 240px; }
.filter-bar--panel .filter-bar__slot-actions { margin-left: auto; }
@media (max-width: 640px) { .filter-bar--panel .filter-bar__filters { flex: 1 1 100%; } }
@media (max-width: 400px) { .filter-bar--panel .filter-bar__search-wrap, .filter-bar--panel .filter-bar__select { flex-basis: 100%; } }
</style>

<style>
/* Dropdown téléporté. */
.filter-bar-dd {
  position: fixed;
  z-index: var(--z-index-search-layer);
  max-height: min(55vh, calc(var(--spacing-xs) * 105));
  overflow-y: auto;
  box-sizing: border-box;
}

.filter-bar-dd__empty {
  padding: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-style: italic;
}

.filter-bar-dd__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-md);
  border: none;
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-surface-default);
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: var(--color-text-primary);
  transition: background var(--transition-fast);
}

.filter-bar-dd__item:last-child {
  border-bottom: none;
}

.filter-bar-dd__choose { display: flex; flex: 1; min-width: 0; align-items: center; gap: var(--spacing-sm); text-align: left; min-height: 32px; }

.filter-bar-dd__item:hover {
  background: var(--color-interaction-hover);
}

.filter-bar-dd__label {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.filter-bar-dd__meta {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-bar-dd__action {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  padding: 2px var(--spacing-xs);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-link);
  cursor: pointer;
}

.filter-bar-dd__action:hover {
  background: var(--color-primary-light);
}
</style>
