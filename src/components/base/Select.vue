<template>
  <SelectShell
    v-bind="$attrs"
    v-model:open="isOpen"
    :label="label"
    :error="error"
    :hint="hint"
    :required="required"
    :compact="compact"
    :id="id"
    @escape="restoreTriggerFocus"
  >
    <template #trigger>
      <div
        ref="triggerRef"
        class="base-select__trigger"
        :class="{
          'base-select__trigger--disabled': disabled,
          'base-select__trigger--multiple': multiple,
          'base-select__trigger--with-tags': multiple && selectedItems.length > 0,
        }"
        v-bind="searchable ? {} : comboboxAttrs"
        @click="onTriggerClick"
        @keydown="!searchable && handleKeydown($event)"
      >
        <div class="base-select__value" :class="{ 'base-select__value--editable': searchable, 'base-select__value--multiple': multiple }">
          <template v-if="multiple">
            <Tag v-for="item in selectedItems" :key="item.value" class="base-select__selected-item" :label="item.label" variant="accent" removable :disabled="disabled" @remove="removeItem(item)" />
          </template>
          <input v-if="searchable" ref="searchInputRef" v-bind="comboboxAttrs" type="text" class="base-select__input"
            :value="isOpen ? searchQuery : (selectedItem?.label ?? '')"
            :placeholder="isOpen ? searchPlaceholder : (selectedItem?.label || placeholder)"
            :disabled="disabled" autocomplete="off" :spellcheck="false"
            @focus="onInputFocus" @input="onSearchInput" @keydown="handleSearchKeydown" />
          <template v-else>
            <span v-if="selectedItem" class="base-select__selected-text">{{ selectedItem.label }}</span>
            <span v-else-if="!multiple || !selectedItems.length" class="base-select__placeholder">{{ placeholder }}</span>
          </template>
        </div>
        <div class="base-select__indicators">
          <i v-if="loading" class="base-select__loading">⏳</i>
          <Icon icon="mdi:chevron-down" v-else class="base-select__arrow" :class="{ 'base-select__arrow--open': isOpen }" :width="compact ? 18 : 20" :height="compact ? 18 : 20" aria-hidden="true" />
        </div>
      </div>
    </template>

    <template #dropdown>
      <div v-if="filteredOptions.length === 0" class="base-select__no-results" role="status">{{ noResultsText }}</div>
      <div class="base-select__options" :id="`${id}-options`" role="listbox" :aria-label="label || placeholder" :aria-multiselectable="multiple">
        <div
          v-for="(option, index) in filteredOptions"
          :id="`${id}-option-${index}`"
          :key="option.value"
          class="base-select__option"
          :class="{
            'base-select__option--selected': isOptionSelected(option),
            'base-select__option--highlighted': highlightedIndex === index,
            'base-select__option--disabled': option.disabled,
          }"
          @mousedown.prevent
          @click="selectOption(option)"
          @mouseenter="highlightedIndex = option.disabled ? -1 : index"
          role="option"
          :aria-selected="isOptionSelected(option)"
          :aria-disabled="!!option.disabled"
        >
          <span class="base-select__option-text">{{ option.label }}</span>
          <i class="base-select__option-check" :class="{ 'base-select__option-check--hidden': !isOptionSelected(option) }" aria-hidden="true">✓</i>
        </div>
      </div>
    </template>
  </SelectShell>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });
import { ref, computed, watch, nextTick } from 'vue';
import { Icon } from '@iconify/vue';
import Tag from './Tag.vue';
import SelectShell from './SelectShell.vue';
import { generateDomUid } from '@/utils/generateDomUid';
import { isSelectListOptionSelected, type SelectOption, type SelectValue } from '@/lib/selectOptions';

const props = withDefaults(defineProps<{
  modelValue: SelectValue;
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
}>(), {
  options: () => [],
  placeholder: 'Sélectionner une option',
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
  (e: 'update:modelValue', value: SelectValue): void;
  (e: 'change', value: SelectValue): void;
}>();
const triggerRef = ref<HTMLElement>();
const searchInputRef = ref<HTMLInputElement>();
const isOpen = ref(false);
const searchQuery = ref('');
const highlightedIndex = ref(-1);
const descriptionIds = computed(() => [props.error ? `${props.id}-error` : '', props.hint ? `${props.id}-hint` : ''].filter(Boolean).join(' ') || undefined);
const comboboxAttrs = computed(() => ({
  id: props.id,
  role: 'combobox' as const,
  tabindex: props.disabled ? -1 : 0,
  'aria-labelledby': props.label ? `${props.id}-label` : undefined,
  'aria-label': props.label ? undefined : props.placeholder,
  'aria-disabled': props.disabled,
  'aria-invalid': !!props.error || undefined,
  'aria-required': props.required || undefined,
  'aria-describedby': descriptionIds.value,
  'aria-expanded': isOpen.value,
  'aria-controls': isOpen.value ? `${props.id}-options` : undefined,
  'aria-activedescendant': isOpen.value && highlightedIndex.value >= 0 ? `${props.id}-option-${highlightedIndex.value}` : undefined,
  'aria-haspopup': 'listbox' as const,
  'aria-autocomplete': props.searchable ? 'list' as const : undefined,
}));
const selectedItem = computed(() => props.multiple ? null : props.options.find(option => option.value === props.modelValue) ?? null);
const selectedItems = computed(() => props.multiple ? props.options.filter(option => isOptionSelected(option)) : []);
const filteredOptions = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return query ? props.options.filter(option => option.label.toLowerCase().includes(query)) : props.options;
});
const isOptionSelected = (option: SelectOption) => isSelectListOptionSelected(option, props.multiple, props.modelValue);

function closeDropdown() {
  isOpen.value = false;
  highlightedIndex.value = -1;
  searchQuery.value = '';
}
let restoringFocus = false;
async function restoreTriggerFocus() {
  await nextTick();
  restoringFocus = true;
  (props.searchable ? searchInputRef.value : triggerRef.value)?.focus();
  restoringFocus = false;
}
function onInputFocus() { if (!restoringFocus) void openDropdown(); }
async function openDropdown() {
  if (props.disabled || isOpen.value) return;
  isOpen.value = true;
  highlightedIndex.value = -1;
  searchQuery.value = '';
  await nextTick();
  if (isOpen.value && props.searchable) searchInputRef.value?.focus();
}
function toggleDropdown() {
  if (props.disabled) return;
  if (isOpen.value) closeDropdown();
  else void openDropdown();
}
function onTriggerClick() {
  if (props.searchable) { void openDropdown(); restoreTriggerFocus(); }
  else toggleDropdown();
}
function onSearchInput(event: Event) {
  if (props.disabled) return;
  isOpen.value = true;
  searchQuery.value = (event.target as HTMLInputElement).value;
  highlightedIndex.value = -1;
}
function updateSelection(value: SelectValue) {
  emit('update:modelValue', value);
  emit('change', value);
}
function selectOption(option: SelectOption) {
  if (props.disabled || option.disabled) return;
  if (props.multiple) {
    const values = Array.isArray(props.modelValue) ? props.modelValue : [];
    updateSelection(values.includes(option.value) ? values.filter(value => value !== option.value) : [...values, option.value]);
    searchQuery.value = '';
    highlightedIndex.value = -1;
    restoreTriggerFocus();
  } else {
    updateSelection(option.value);
    closeDropdown();
    restoreTriggerFocus();
  }
}
function removeItem(item: SelectOption) {
  if (props.disabled || !props.multiple) return;
  const values = Array.isArray(props.modelValue) ? props.modelValue : [];
  updateSelection(values.filter(value => value !== item.value));
}
function moveHighlight(direction: 1 | -1) {
  let index = highlightedIndex.value < 0 && direction === -1 ? filteredOptions.value.length : highlightedIndex.value;
  while (index + direction >= 0 && index + direction < filteredOptions.value.length) {
    index += direction;
    if (!filteredOptions.value[index].disabled) { highlightedIndex.value = index; return; }
  }
}
function handleSearchKeydown(event: KeyboardEvent) {
  if (event.key !== ' ') handleKeydown(event);
}
function handleKeydown(event: KeyboardEvent) {
  if (props.disabled || event.isComposing) return;
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (isOpen.value && highlightedIndex.value >= 0) {
        const option = filteredOptions.value[highlightedIndex.value];
        if (option) selectOption(option);
      } else toggleDropdown();
      break;
    case 'Escape':
      if (isOpen.value) {
        event.preventDefault(); event.stopPropagation();
        closeDropdown();
        restoreTriggerFocus();
      }
      break;
    case 'ArrowDown':
    case 'ArrowUp':
      event.preventDefault();
      if (!isOpen.value) void openDropdown();
      else moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
      break;
  }
}
watch(highlightedIndex, () => {
  void nextTick(() => {
    if (isOpen.value && highlightedIndex.value >= 0) document.getElementById(`${props.id}-option-${highlightedIndex.value}`)?.scrollIntoView?.({ block: 'nearest' });
  });
});
watch(isOpen, open => { if (!open) { searchQuery.value = ''; highlightedIndex.value = -1; } });
watch(() => props.modelValue, () => { if (!props.multiple) closeDropdown(); });
watch(() => props.disabled, disabled => { if (disabled) closeDropdown(); });
watch(filteredOptions, () => { highlightedIndex.value = -1; });
</script>

<style scoped>
.base-select__option {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: inherit;
  line-height: inherit;
}
.base-select--sm .base-select__option {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
}
.base-select__trigger--multiple { padding-inline: var(--spacing-sm); }
.base-select__value--multiple { flex-wrap: wrap; gap: var(--spacing-sm); }
.base-select__selected-item { padding-right: 0; }
.base-select__value--editable { cursor: text; }
.base-select__input {
  flex: 1 1 80px;
  width: 0;
  min-width: 0;
  min-height: var(--spacing-xl);
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  outline: none;
  box-shadow: none;
}
.base-select__input::placeholder { color: var(--color-text-secondary); opacity: .7; }
.base-select__input:disabled { cursor: not-allowed; }
</style>
