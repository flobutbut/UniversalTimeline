<template>
  <div class="search-input-wrap" :class="{ 'search-input-wrap--xs': size === 'xs' }">
    <DesignIcon name="search" class="search-input-wrap__icon" />
    <input
      type="search"
      :aria-label="placeholder || 'Rechercher'"
      :value="modelValue"
      class="search-input-wrap__field"
      :placeholder="placeholder"
      :disabled="disabled"
      v-bind="$attrs"
      ref="fieldRef"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      v-if="modelValue"
      class="search-input-wrap__clear"
      type="button"
      aria-label="Effacer la recherche"
      :disabled="disabled"
      @click="clear"
    >
      <DesignIcon name="close" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DesignIcon from './DesignIcon.vue';

defineProps<{ modelValue: string; placeholder?: string; size?: 'sm' | 'xs'; disabled?: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();
defineOptions({ inheritAttrs: false });

const fieldRef = ref<HTMLInputElement | null>(null);
function clear() {
  emit('update:modelValue', '');
  fieldRef.value?.focus();
}
defineExpose({
  focus: () => fieldRef.value?.focus(),
  blur: () => fieldRef.value?.blur(),
});
</script>

<style scoped>
.search-input-wrap {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  height: var(--field-height-md);
  padding: 0 var(--spacing-sm);
  background: var(--color-surface-default);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  transition: border-color var(--transition-fast);
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.search-input-wrap--xs {
  height: var(--field-height-sm);
}

.search-input-wrap:focus-within {
  border-color: var(--color-border-focus);
  box-shadow: inset 0 0 0 1px var(--color-border-focus);
}

.search-input-wrap__icon {
  flex-shrink: 0;
  width: var(--font-size-lg);
  height: var(--font-size-lg);
  color: var(--color-text-secondary);
}

.search-input-wrap__field {
  flex: 1;
  border: none !important;
  background: transparent !important;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  outline: none !important;
  box-shadow: none !important;
  min-width: 0;
  padding: 0;
}

.search-input-wrap__field::placeholder {
  color: var(--color-text-secondary);
}

.search-input-wrap__field::-webkit-search-cancel-button { -webkit-appearance: none; }

.search-input-wrap__clear {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0;
  color: var(--color-text-secondary);
  cursor: pointer;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.search-input-wrap__clear:hover {
  color: var(--color-text-primary);
}


.search-input-wrap__field { line-height: var(--line-height-small); }
.search-input-wrap:has(input:disabled) { background: var(--color-interaction-disabled); opacity: .5; }
</style>
