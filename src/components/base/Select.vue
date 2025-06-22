<template>
  <div class="base-select" :class="{ 'base-select--error': error, 'base-select--open': isOpen }">
    <label v-if="label" :for="id" class="base-select__label">
      {{ label }}
      <span v-if="required" class="base-select__required">*</span>
    </label>
    
    <div class="base-select__wrapper">
      <div 
        ref="triggerRef"
        class="base-select__trigger"
        :class="{ 'base-select__trigger--disabled': disabled }"
        @click="toggleDropdown"
        @keydown="handleKeydown"
        tabindex="0"
        role="combobox"
        :aria-expanded="isOpen"
        :aria-haspopup="true"
      >
        <div class="base-select__value">
          <template v-if="multiple">
            <div v-if="selectedItems.length === 0" class="base-select__placeholder">
              {{ placeholder }}
            </div>
            <div v-else class="base-select__selected-items">
              <span 
                v-for="item in selectedItems" 
                :key="item.value"
                class="base-select__selected-item"
              >
                {{ item.label }}
                <button 
                  @click.stop="removeItem(item, $event)"
                  class="base-select__remove-item"
                  type="button"
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
              {{ placeholder }}
            </span>
          </template>
        </div>
        
        <div class="base-select__indicators">
          <i v-if="loading" class="base-select__loading">⏳</i>
          <i v-else class="base-select__arrow" :class="{ 'base-select__arrow--open': isOpen }">▼</i>
        </div>
      </div>

      <Transition name="select-dropdown">
        <div 
          v-if="isOpen" 
          ref="dropdownRef"
          class="base-select__dropdown"
          role="listbox"
        >
          <div class="base-select__search-wrapper" v-if="searchable">
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
            <div 
              v-if="filteredOptions.length === 0"
              class="base-select__no-results"
            >
              {{ noResultsText }}
            </div>
            <div
              v-for="(option, index) in filteredOptions"
              :key="option.value"
              class="base-select__option"
              :class="{
                'base-select__option--selected': isOptionSelected(option),
                'base-select__option--highlighted': highlightedIndex === index
              }"
              @click="selectOption(option, $event)"
              @mouseenter="highlightedIndex = index"
              role="option"
              :aria-selected="isOptionSelected(option)"
            >
              <span class="base-select__option-text">{{ option.label }}</span>
              <i v-if="isOptionSelected(option)" class="base-select__option-check">✓</i>
            </div>
          </div>
        </div>
      </Transition>
    </div>
    
    <span v-if="error" class="base-select__error">{{ error }}</span>
    <span v-if="hint" class="base-select__hint">{{ hint }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface Props {
  modelValue: string | number | (string | number)[] | null;
  options: SelectOption[];
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
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Sélectionner une option',
  required: false,
  disabled: false,
  multiple: false,
  searchable: true,
  searchPlaceholder: 'Rechercher...',
  noResultsText: 'Aucun résultat trouvé',
  id: () => `select-${Math.random().toString(36).substr(2, 9)}`,
  loading: false
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | (string | number)[] | null): void;
  (e: 'change', value: string | number | (string | number)[] | null): void;
}>();

// Refs
const triggerRef = ref<HTMLElement>();
const dropdownRef = ref<HTMLElement>();
const searchInputRef = ref<HTMLInputElement>();
const isOpen = ref(false);
const searchQuery = ref('');
const highlightedIndex = ref(-1);

// Computed
const selectedItem = computed(() => {
  if (props.multiple) return null;
  const value = props.modelValue;
  return props.options.find(option => option.value === value) || null;
});

const selectedItems = computed(() => {
  if (!props.multiple) return [];
  const values = Array.isArray(props.modelValue) ? props.modelValue : [];
  return props.options.filter(option => values.includes(option.value));
});

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options;
  
  const query = searchQuery.value.toLowerCase();
  return props.options.filter(option => 
    option.label.toLowerCase().includes(query) && !option.disabled
  );
});

// Methods
const toggleDropdown = (event?: Event) => {
  if (props.disabled) return;
  
  // Empêcher la propagation si l'événement vient du trigger
  if (event) {
    event.stopPropagation();
  }
  
  if (isOpen.value) {
    closeDropdown();
  } else {
    openDropdown();
  }
};

const openDropdown = async () => {
  isOpen.value = true;
  highlightedIndex.value = -1;
  searchQuery.value = '';
  
  await nextTick();
  if (props.searchable && searchInputRef.value) {
    searchInputRef.value.focus();
  }
};

const closeDropdown = () => {
  isOpen.value = false;
  highlightedIndex.value = -1;
  searchQuery.value = '';
};

const selectOption = (option: SelectOption, event?: Event) => {
  if (option.disabled) return;
  
  // Empêcher la propagation si l'événement vient d'un clic
  if (event) {
    event.stopPropagation();
  }
  
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
  if (!props.multiple) return;
  
  // Empêcher la propagation
  if (event) {
    event.stopPropagation();
  }
  
  const currentValues = Array.isArray(props.modelValue) ? props.modelValue : [];
  const newValues = currentValues.filter(v => v !== item.value);
  
  emit('update:modelValue', newValues);
  emit('change', newValues);
};

const isOptionSelected = (option: SelectOption) => {
  if (props.multiple) {
    const values = Array.isArray(props.modelValue) ? props.modelValue : [];
    return values.includes(option.value);
  }
  return props.modelValue === option.value;
};

const handleSearch = () => {
  highlightedIndex.value = -1;
};

const handleSearchKeydown = (event: KeyboardEvent) => {
  handleKeydown(event);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return;
  
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
        openDropdown();
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

// Click outside handler
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement;
  
  // Vérifier si le clic est en dehors du composant Select
  if (
    triggerRef.value && 
    !triggerRef.value.contains(target) &&
    dropdownRef.value && 
    !dropdownRef.value.contains(target)
  ) {
    closeDropdown();
  }
};

// Gestionnaire pour les touches clavier globales
const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (isOpen.value && event.key === 'Escape') {
    closeDropdown();
    triggerRef.value?.focus();
  }
};

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside, true);
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
  document.removeEventListener('keydown', handleGlobalKeydown);
});

// Watch for modelValue changes to close dropdown on external changes
watch(() => props.modelValue, () => {
  if (!props.multiple) {
    closeDropdown();
  }
});
</script>

<style scoped>
.base-select {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  width: 100%;
  position: relative;
}

.base-select__label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.base-select__required {
  color: var(--color-error);
}

.base-select__wrapper {
  position: relative;
}

.base-select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  cursor: pointer;
  transition: all var(--transition-fast);
  outline: none;
}

.base-select__trigger:hover:not(.base-select__trigger--disabled) {
  border-color: var(--color-border-dark);
}

.base-select__trigger:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.base-select__trigger--disabled {
  background-color: var(--color-surface-hover);
  cursor: not-allowed;
  opacity: 0.7;
}

.base-select__value {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  min-height: 20px;
}

.base-select__placeholder {
  color: var(--color-text-light);
  opacity: 0.7;
}

.base-select__selected-text {
  color: var(--color-text);
}

.base-select__selected-items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.base-select__selected-item {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-primary-light);
  color: var(--color-text-white);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.base-select__remove-item {
  background: none;
  border: none;
  color: var(--color-text-white);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: bold;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color var(--transition-fast);
}

.base-select__remove-item:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.base-select__indicators {
  display: flex;
  align-items: center;
  margin-left: var(--spacing-md);
}

.base-select__arrow {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  transition: transform var(--transition-fast);
}

.base-select__arrow--open {
  transform: rotate(180deg);
}

.base-select__loading {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.base-select__dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: var(--z-index-dropdown);
  margin-top: var(--spacing-xs);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-height: 300px;
  overflow: hidden;
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

.base-select__options {
  max-height: 250px;
  overflow-y: auto;
}

.base-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  background-color: var(--color-primary-light);
  color: var(--color-primary-dark);
}

.base-select__option--selected {
  background-color: var(--color-primary);
  color: white;
}

.base-select__option--selected:hover {
  background-color: var(--color-primary-dark);
}

.base-select__option-text {
  flex: 1;
}

.base-select__option-check {
  font-size: var(--font-size-sm);
  font-weight: bold;
}

.base-select__no-results {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
}

.base-select--error .base-select__trigger {
  border-color: var(--color-error);
}

.base-select--error .base-select__trigger:focus {
  box-shadow: 0 0 0 2px var(--color-error-light);
}

.base-select__error {
  font-size: var(--font-size-sm);
  color: var(--color-error);
}

.base-select__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

/* Transitions */
.select-dropdown-enter-active,
.select-dropdown-leave-active {
  transition: all var(--transition-fast);
}

.select-dropdown-enter-from,
.select-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Scrollbar styling */
.base-select__options::-webkit-scrollbar {
  width: 6px;
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