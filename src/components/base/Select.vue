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
        :id="id"
        ref="triggerRef"
        class="base-select__trigger"
        :class="{
          'base-select__trigger--disabled': disabled,
          'base-select__trigger--with-tags': multiple && selectedItems.length > 0,
        }"
        @click="toggleDropdown"
        @keydown="handleKeydown"
        :tabindex="disabled ? -1 : 0"
        role="combobox"
        :aria-labelledby="label ? `${id}-label` : undefined"
        :aria-label="label ? undefined : placeholder"
        :aria-disabled="disabled"
        :aria-invalid="!!error || undefined"
        :aria-required="required || undefined"
        :aria-describedby="descriptionIds"
        :aria-expanded="isOpen"
        :aria-controls="isOpen ? `${id}-options` : undefined"
        :aria-activedescendant="isOpen && highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined"
        aria-haspopup="listbox"
      >
        <div class="base-select__value">
          <template v-if="multiple">
            <div v-if="selectedItems.length === 0" class="base-select__placeholder">{{ placeholder }}</div>
            <div v-else class="base-select__selected-items">
              <span v-for="item in selectedItems" :key="item.value" class="base-select__selected-item">
                {{ item.label }}
                <button
                  type="button"
                  class="base-select__remove-item"
                  :disabled="disabled"
                  :aria-label="`Retirer ${item.label}`"
                  @click.stop="removeItem(item)"
                  @keydown.stop
                >×</button>
              </span>
            </div>
          </template>
          <template v-else>
            <span v-if="selectedItem" class="base-select__selected-text">{{ selectedItem.label }}</span>
            <span v-else class="base-select__placeholder">{{ placeholder }}</span>
          </template>
        </div>
        <div class="base-select__indicators">
          <i v-if="loading" class="base-select__loading">⏳</i>
          <Icon icon="mdi:chevron-down" v-else class="base-select__arrow" :class="{ 'base-select__arrow--open': isOpen }" :width="compact ? 18 : 20" :height="compact ? 18 : 20" aria-hidden="true" />
        </div>
      </div>
    </template>

    <template #dropdown>
      <div v-if="searchable" class="base-select__search-wrapper">
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          class="base-select__search"
          :placeholder="searchPlaceholder"
          :aria-label="searchPlaceholder"
          role="combobox"
          aria-autocomplete="list"
          :aria-expanded="isOpen"
          :aria-controls="`${id}-options`"
          :aria-activedescendant="highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined"
          @input="highlightedIndex = -1"
          @keydown="handleSearchKeydown"
        />
      </div>
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
          @click="selectOption(option)"
          @mouseenter="highlightedIndex = option.disabled ? -1 : index"
          role="option"
          :aria-selected="isOptionSelected(option)"
          :aria-disabled="!!option.disabled"
        >
          <i class="base-select__option-check" :class="{ 'base-select__option-check--hidden': !isOptionSelected(option) }" aria-hidden="true">✓</i>
          <span class="base-select__option-text">{{ option.label }}</span>
        </div>
      </div>
    </template>
  </SelectShell>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });
import { ref, computed, watch, nextTick } from 'vue';
import { Icon } from '@iconify/vue';
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
function restoreTriggerFocus() {
  void nextTick(() => triggerRef.value?.focus());
}
async function openDropdown() {
  if (props.disabled) return;
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
function updateSelection(value: SelectValue) {
  emit('update:modelValue', value);
  emit('change', value);
}
function selectOption(option: SelectOption) {
  if (props.disabled || option.disabled) return;
  if (props.multiple) {
    const values = Array.isArray(props.modelValue) ? props.modelValue : [];
    updateSelection(values.includes(option.value) ? values.filter(value => value !== option.value) : [...values, option.value]);
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
  if (props.disabled) return;
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
watch(() => props.modelValue, () => { if (!props.multiple) closeDropdown(); });
watch(() => props.disabled, disabled => { if (disabled) closeDropdown(); });
watch(filteredOptions, () => { highlightedIndex.value = -1; });
</script>
