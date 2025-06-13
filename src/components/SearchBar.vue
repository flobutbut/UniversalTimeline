<template>
  <div 
    class="search-bar" 
    :class="{ 
      'search-bar--minified': minified,
      'search-bar--naked': naked,
      'is-expanded': isExpanded
    }"
  >
    <div class="search-input-wrapper">
      <input
        v-if="!minified || isExpanded"
        ref="searchInput"
        v-model="searchValue"
        type="text"
        class="search-input"
        :placeholder="placeholder"
        @input="handleInput"
      />
      <button
        ref="toggleButton"
        class="search-toggle"
        @click="toggleExpand"
        :aria-label="isExpanded ? 'Réduire la recherche' : 'Agrandir la recherche'"
      >
        <Icon :icon="isExpanded ? 'mdi:close' : 'mdi:magnify'" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Icon } from '@iconify/vue';

interface Props {
  modelValue: string;
  placeholder?: string;
  minified?: boolean;
  naked?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Rechercher...',
  minified: false,
  naked: false
});

const emit = defineEmits(['update:modelValue']);

const searchValue = ref(props.modelValue);
const isExpanded = ref(false);
const searchInput = ref<HTMLInputElement | null>(null);
const toggleButton = ref<HTMLButtonElement | null>(null);

watch(() => props.modelValue, (newValue) => {
  searchValue.value = newValue;
});

const handleInput = () => {
  emit('update:modelValue', searchValue.value);
};

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
  if (!isExpanded.value) {
    searchValue.value = '';
    emit('update:modelValue', '');
    if (searchInput.value) {
      searchInput.value.blur();
    }
    if (toggleButton.value) {
      toggleButton.value.blur();
    }
  } else {
    setTimeout(() => {
      if (searchInput.value) {
        searchInput.value.focus();
      }
    }, 0);
  }
};
</script>

<style scoped>
.search-bar {
  position: relative;
  width: fit-content;
  min-width: 32px;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background: var(--color-neutral-0);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  width: 100%;
  height: 32px;
}

.search-bar--minified .search-input-wrapper {
  width: 32px;
  justify-content: center;
}

.search-bar--minified.is-expanded .search-input-wrapper {
  width: 200px;
  padding: 0 var(--spacing-sm);
}

.search-bar--naked .search-input-wrapper {
  background: transparent;
  border: none;
  padding: 0;
}

.search-bar--naked .search-input-wrapper:focus-within {
  background: var(--color-neutral-50);
  border-radius: var(--radius-sm);
}

.search-input {
  flex: 1;
  min-width: 120px;
  height: 32px;
  padding: 0 16px;
  border: none;
  background: transparent;
  color: var(--text-color);
  font-size: var(--font-size-base);
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    background: transparent;
  }
}

.search-toggle {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-text-light);
  cursor: pointer;
  transition: color var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
}

.search-toggle:hover {
  color: var(--color-primary);
}

.search-toggle .iconify {
  width: 20px;
  height: 20px;
}

.search-bar--naked {
  .search-input {
    &:focus {
      background: transparent;
    }
  }
}
</style> 