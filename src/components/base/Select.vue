<template>
  <SelectShell
    v-bind="$attrs"
    v-model:open="isOpen"
    :class="{ 'select--period-toolbar': isPeriod }"
    :label="label"
    :error="error"
    :hint="hint"
    :required="required"
    :compact="compact"
    :id="id"
    :dropdown-role="isList ? 'listbox' : 'listbox'"
    :dropdown-class="isPeriod ? 'base-select__dropdown--tall' : undefined"
    :highlight-open-trigger="isPeriod"
    :unbounded-dropdown="false"
    @escape="onEscapeFromShell"
  >
    <template #trigger>
      <div
        v-if="isList"
        ref="triggerRef"
        class="base-select__trigger"
        :class="{
          'base-select__trigger--disabled': disabled,
          'base-select__trigger--with-tags': multiple && selectedItems.length > 0,
        }"
        @click="toggleDropdown"
        @keydown="handleKeydown"
        tabindex="0"
        role="combobox"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
      >
        <div class="base-select__value">
          <template v-if="multiple">
            <div v-if="selectedItems.length === 0" class="base-select__placeholder">
              {{ listPlaceholder }}
            </div>
            <div v-else class="base-select__selected-items">
              <span
                v-for="item in selectedItems"
                :key="item.value"
                class="base-select__selected-item"
              >
                {{ item.label }}
                <button
                  type="button"
                  class="base-select__remove-item"
                  @click.stop="removeItem(item, $event)"
                >
                  ×
                </button>
              </span>
            </div>
          </template>
          <template v-else>
            <span v-if="selectedItem" class="base-select__selected-text">
              {{ selectedItem.label }}
            </span>
            <span v-else class="base-select__placeholder">
              {{ listPlaceholder }}
            </span>
          </template>
        </div>

        <div class="base-select__indicators">
          <i v-if="loading" class="base-select__loading">⏳</i>
          <ChevronDown
            v-else
            class="base-select__arrow"
            :class="{ 'base-select__arrow--open': isOpen }"
            :size="compact ? 18 : 20"
            stroke-width="2"
            aria-hidden="true"
          />
        </div>
      </div>

      <button
        v-else
        ref="triggerRef"
        type="button"
        class="base-select__trigger"
        :class="{ 'base-select__trigger--disabled': disabled }"
        :disabled="disabled"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
        aria-label="Choisir une période"
        @click="togglePeriodPanel"
        @keydown="handlePeriodTriggerKey"
      >
        <div class="base-select__value">
          <span class="base-select__selected-text select-period__summary">{{ periodSummary }}</span>
        </div>
        <div class="base-select__indicators">
          <ChevronDown
            class="base-select__arrow"
            :class="{ 'base-select__arrow--open': isOpen }"
            :size="compact ? 18 : 20"
            stroke-width="2"
            aria-hidden="true"
          />
        </div>
      </button>
    </template>

    <template #dropdown>
      <template v-if="isList">
        <div v-if="searchable" class="base-select__search-wrapper">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            class="base-select__search"
            :placeholder="searchPlaceholder"
            @input="handleSearch"
            @keydown="handleSearchKeydown"
          />
        </div>

        <div class="base-select__options">
          <div v-if="filteredOptions.length === 0" class="base-select__no-results">
            {{ noResultsText }}
          </div>
          <div
            v-for="(option, index) in filteredOptions"
            :key="option.value"
            class="base-select__option"
            :class="{
              'base-select__option--selected': isOptionSelected(option),
              'base-select__option--highlighted': highlightedIndex === index,
            }"
            @click="selectOption(option, $event)"
            @mouseenter="highlightedIndex = index"
            role="option"
            :aria-selected="isOptionSelected(option)"
          >
            <i
              class="base-select__option-check"
              :class="{ 'base-select__option-check--hidden': !isOptionSelected(option) }"
              aria-hidden="true"
            >✓</i>
            <span class="base-select__option-text">{{ option.label }}</span>
          </div>
        </div>
      </template>

      <template v-else>
        <div
          class="base-select__search-wrapper base-select__search-wrapper--toolbar"
          @keydown.stop
        >
          <input
            ref="periodSearchRef"
            v-model="periodSearch"
            type="search"
            class="base-select__search"
            :placeholder="drillSearchPlaceholder"
          />
          <Button variant="tertiary" size="sm" type="button" @click="clearAllPeriods">
            Toutes les périodes
          </Button>
        </div>

        <button
          v-if="currentParentId"
          type="button"
          class="base-select__option select-period__level-item"
          @click="goBackPeriodLevel"
        >
          <ChevronLeft class="select-period__level-back" :size="16" stroke-width="2" aria-hidden="true" />
          <span class="base-select__option-text">{{ periodLevelTitle }}</span>
        </button>

        <div class="base-select__options">
          <div v-if="displayedPeriodsDrill.length === 0" class="base-select__no-results">
            {{
              periodSearch.trim()
                ? 'Aucun résultat'
                : currentParentId
                  ? 'Aucune sous-période'
                  : 'Chargement…'
            }}
          </div>
          <button
            v-for="period in displayedPeriodsDrill"
            :key="period.id"
            type="button"
            class="base-select__option"
            :class="{ 'base-select__option--selected': period.id === periodModel }"
            @click="onPeriodItemSelect(period)"
          >
            <i
              class="base-select__option-check"
              :class="{ 'base-select__option-check--hidden': period.id !== periodModel }"
              aria-hidden="true"
            >✓</i>
            <span class="base-select__option-text base-select__option-text--wrap">{{
              formatSelectListPeriodLine(period)
            }}</span>
            <span
              v-if="listPeriodShowsDrillChevron(period, periods)"
              class="base-select__option-chevron-next"
              role="button"
              tabindex="-1"
              aria-label="Voir les sous-périodes"
              @click.stop="onPeriodDrillDown(period)"
            >
              <ChevronRight :size="18" stroke-width="2" aria-hidden="true" />
            </span>
          </button>
        </div>
      </template>
    </template>
  </SelectShell>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import SelectShell from './SelectShell.vue';
import Button from './Button.vue';
import { useDataStore } from '@/stores/useDataStore';
import { generateDomUid } from '@/utils/generateDomUid';
import {
  buildPeriodAncestorPathFromLeaf,
  formatSelectListPeriodLine,
  isSelectListOptionSelected,
  listPeriodShowsDrillChevron,
  sortListPeriodsByLabel,
} from '@/lib/selectListPeriodHelpers';
import type { ListPeriod } from '@/types/database';

type SelectMode = 'list' | 'period';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface Props {
  /** `list` : options plates ; `period` : filtre périodes (navigation par niveaux, comme la vue Événements). */
  mode?: SelectMode;
  modelValue: string | number | (string | number)[] | null;
  /** Requis en mode `list` (ignoré en `period`). */
  options?: SelectOption[];
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  noResultsText?: string;
  id?: string;
  loading?: boolean;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'list',
  options: () => [],
  required: false,
  disabled: false,
  multiple: false,
  searchable: true,
  searchPlaceholder: 'Rechercher...',
  noResultsText: 'Aucun résultat trouvé',
  id: () => generateDomUid('select'),
  loading: false,
  compact: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | (string | number)[] | null): void;
  (e: 'change', value: string | number | (string | number)[] | null): void;
}>();

const isPeriod = computed(() => props.mode === 'period');
const isList = computed(() => props.mode === 'list');

const dataStore = useDataStore();
const { periods } = storeToRefs(dataStore);

const triggerRef = ref<HTMLElement>();
const searchInputRef = ref<HTMLInputElement>();
const periodSearchRef = ref<HTMLInputElement>();
const isOpen = ref(false);
const searchQuery = ref('');
const highlightedIndex = ref(-1);
const periodSearch = ref('');
/** Niveau affiché en mode period (drill-down) */
const currentParentId = ref<string | null>(null);

const listPlaceholder = computed(() => props.placeholder ?? 'Sélectionner une option');

const periodModel = computed(() => String(props.modelValue ?? ''));

const selectedItem = computed(() => {
  if (!isList.value || props.multiple) return null;
  const value = props.modelValue;
  return props.options.find(option => option.value === value) || null;
});

const selectedItems = computed(() => {
  if (!isList.value || !props.multiple) return [];
  const values = Array.isArray(props.modelValue) ? props.modelValue : [];
  return props.options.filter(option => values.includes(option.value));
});

const filteredOptions = computed(() => {
  if (!isList.value) return [];
  if (!searchQuery.value) return props.options;
  const query = searchQuery.value.toLowerCase();
  return props.options.filter(
    option => option.label.toLowerCase().includes(query) && !option.disabled
  );
});

const rootsList = computed(() =>
  periods.value.filter((p: ListPeriod) => !p.parentId && !p.hasParent)
);

const rawListAtPeriodLevel = computed(() => {
  if (!currentParentId.value) return rootsList.value;
  return periods.value.filter(p => p.parentId === currentParentId.value);
});

const displayedPeriodsDrill = computed(() => {
  const list = sortListPeriodsByLabel(rawListAtPeriodLevel.value);
  const q = periodSearch.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(p => p.label.fr.toLowerCase().includes(q));
});

const periodLevelTitle = computed(() => {
  if (!currentParentId.value) return 'Racines';
  return periods.value.find(p => p.id === currentParentId.value)?.label.fr ?? 'Sous-périodes';
});

const drillSearchPlaceholder = computed(() =>
  currentParentId.value ? 'Filtrer la liste…' : 'Rechercher une racine…'
);

const periodSummary = computed(() => {
  if (!isPeriod.value) return '';
  if (!periodModel.value) return props.placeholder ?? 'Toutes les périodes';
  const p = dataStore.periodById(periodModel.value);
  if (!p) return props.placeholder ?? 'Toutes les périodes';
  return formatSelectListPeriodLine(p);
});

function onEscapeFromShell() {
  nextTick(() => triggerRef.value?.focus());
}

async function openPeriodPanel() {
  if (props.disabled) return;
  await dataStore.ensureRootsLoaded();
  isOpen.value = true;
  periodSearch.value = '';
  if (periodModel.value) {
    const sel = dataStore.periodById(periodModel.value);
    if (sel) {
      const chain = buildPeriodAncestorPathFromLeaf(periodModel.value, (id) => dataStore.periodById(id));
      for (const id of chain) {
        await dataStore.ensureChildrenLoaded(id);
      }
      currentParentId.value = sel.parentId ?? null;
    } else {
      currentParentId.value = null;
    }
  } else {
    currentParentId.value = null;
  }
  await nextTick();
  periodSearchRef.value?.focus();
}

function togglePeriodPanel() {
  if (props.disabled) return;
  if (isOpen.value) {
    closeDropdown();
  } else {
    void openPeriodPanel();
  }
}

function goBackPeriodLevel() {
  if (!currentParentId.value) return;
  const p = dataStore.periodById(currentParentId.value);
  currentParentId.value = p?.parentId ?? null;
  periodSearch.value = '';
}

function onPeriodItemSelect(period: ListPeriod) {
  if (period.id === periodModel.value) {
    emit('update:modelValue', '');
    emit('change', '');
  } else {
    emit('update:modelValue', period.id);
    emit('change', period.id);
    closeDropdown();
  }
}

async function onPeriodDrillDown(period: ListPeriod) {
  await dataStore.ensureChildrenLoaded(period.id);
  currentParentId.value = period.id;
  periodSearch.value = '';
}

function clearAllPeriods() {
  currentParentId.value = null;
  periodSearch.value = '';
  emit('update:modelValue', '');
  emit('change', '');
  closeDropdown();
}

const toggleDropdown = (event?: Event) => {
  if (!isList.value) return;
  if (props.disabled) return;
  if (event) event.stopPropagation();

  if (isOpen.value) {
    closeDropdown();
  } else {
    void openListPanel();
  }
};

async function openListPanel() {
  isOpen.value = true;
  highlightedIndex.value = -1;
  searchQuery.value = '';

  await nextTick();
  if (props.searchable && searchInputRef.value) {
    searchInputRef.value.focus();
  }
}

const closeDropdown = () => {
  isOpen.value = false;
  highlightedIndex.value = -1;
  searchQuery.value = '';
  periodSearch.value = '';
};

const selectOption = (option: SelectOption, event?: Event) => {
  if (!isList.value || option.disabled) return;
  if (event) event.stopPropagation();

  if (props.multiple) {
    const currentValues = Array.isArray(props.modelValue) ? props.modelValue : [];
    const newValues = currentValues.includes(option.value)
      ? currentValues.filter(v => v !== option.value)
      : [...currentValues, option.value];

    emit('update:modelValue', newValues);
    emit('change', newValues);
  } else {
    emit('update:modelValue', option.value);
    emit('change', option.value);
    closeDropdown();
  }
};

const removeItem = (item: SelectOption, event?: Event) => {
  if (!isList.value || !props.multiple) return;
  if (event) event.stopPropagation();

  const currentValues = Array.isArray(props.modelValue) ? props.modelValue : [];
  const newValues = currentValues.filter(v => v !== item.value);

  emit('update:modelValue', newValues);
  emit('change', newValues);
};

const isOptionSelected = (option: SelectOption) =>
  isSelectListOptionSelected(option, props.multiple, props.modelValue);

const handleSearch = () => {
  highlightedIndex.value = -1;
};

const handleSearchKeydown = (event: KeyboardEvent) => {
  handleKeydown(event);
};

function handlePeriodTriggerKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeDropdown();
    triggerRef.value?.focus();
    return;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    togglePeriodPanel();
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!isList.value || props.disabled) return;

  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (isOpen.value && highlightedIndex.value >= 0) {
        const option = filteredOptions.value[highlightedIndex.value];
        if (option) selectOption(option);
      } else {
        toggleDropdown();
      }
      break;

    case 'Escape':
      closeDropdown();
      triggerRef.value?.focus();
      break;

    case 'ArrowDown':
      event.preventDefault();
      if (!isOpen.value) {
        void openListPanel();
      } else {
        highlightedIndex.value = Math.min(
          highlightedIndex.value + 1,
          filteredOptions.value.length - 1
        );
      }
      break;

    case 'ArrowUp':
      event.preventDefault();
      if (isOpen.value) {
        highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
      }
      break;

    case 'Tab':
      closeDropdown();
      break;
  }
};

watch(
  () => props.modelValue,
  () => {
    if (isPeriod.value) return;
    if (!props.multiple) {
      closeDropdown();
    }
  }
);

onMounted(() => {
  if (props.mode === 'period') {
    void dataStore.ensureRootsLoaded();
  }
});
</script>

<style scoped>
.select-period__summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-select__search-wrapper {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border-light);
}

.base-select__search {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background-color: var(--color-surface);
  color: var(--color-text);
}

.base-select__search:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

:deep(.base-select--compact) .base-select__option {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
}

:deep(.base-select--compact) .base-select__search-wrapper {
  padding: var(--spacing-sm);
}

:deep(.base-select--compact) .base-select__search {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.base-select__options {
  max-height: calc(var(--spacing-xs) * 125 / 2);
  overflow-y: auto;
}

.base-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  font-size: var(--font-size-base);
  color: var(--color-text);
}

.base-select__option:hover {
  background-color: var(--color-surface-hover);
}

.base-select__option--highlighted {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

.base-select__option--selected {
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  color: var(--color-primary);
  font-weight: 500;
}

.base-select__option--selected:hover {
  background: color-mix(in srgb, var(--color-primary) 20%, transparent);
}

.base-select__option-text {
  flex: 1;
}

.base-select__option-check {
  flex-shrink: 0;
  width: 1.1em;
  font-size: var(--font-size-sm);
  font-weight: bold;
  text-align: center;
}

.base-select__option-check--hidden {
  visibility: hidden;
}

.base-select__no-results {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
}

.base-select__options::-webkit-scrollbar {
  width: var(--radius-md);
}

.base-select__options::-webkit-scrollbar-track {
  background: var(--color-surface-hover);
  border-radius: var(--radius-sm);
}

.base-select__options::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-sm);
}

.base-select__options::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-dark);
}
</style>

<style src="./select-period-toolbar.css"></style>
