<template>
  <div class="search-input-wrap" :class="{ 'search-input-wrap--focused': focused }">
    <Icon icon="mdi:magnify" class="search-input-wrap__icon" />
    <input
      :value="modelValue"
      class="search-input-wrap__field"
      :placeholder="placeholder"
      v-bind="$attrs"
      ref="fieldRef"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @focus="focused = true"
      @blur="focused = false"
    />
    <button
      v-if="modelValue"
      class="search-input-wrap__clear"
      type="button"
      @click="$emit('update:modelValue', '')"
    >
      <Icon icon="mdi:close" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Icon } from '@iconify/vue';

defineProps<{ modelValue: string; placeholder?: string }>();
defineEmits<{ (e: 'update:modelValue', v: string): void }>();
defineOptions({ inheritAttrs: false });

const focused = ref(false);
const fieldRef = ref<HTMLInputElement | null>(null);
defineExpose({
  focus: () => fieldRef.value?.focus(),
  blur: () => fieldRef.value?.blur(),
});
</script>

<style scoped>
.search-input-wrap {
  display: flex;
  align-items: center;
  gap: calc((var(--spacing-sm) + var(--spacing-xs)) / 2);
  height: calc(var(--spacing-sm) * 4);
  padding: 0 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition: border-color var(--transition-fast);
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.search-input-wrap--focused {
  border-color: var(--color-primary);
}

.search-input-wrap__icon {
  flex-shrink: 0;
  width: var(--font-size-lg);
  height: var(--font-size-lg);
  color: var(--color-text-light);
}

.search-input-wrap__field {
  flex: 1;
  border: none !important;
  background: transparent !important;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  outline: none !important;
  box-shadow: none !important;
  min-width: 0;
  padding: 0;
}

.search-input-wrap__field::placeholder {
  color: var(--color-text-light);
}

.search-input-wrap__clear {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0;
  color: var(--color-text-light);
  cursor: pointer;
  width: var(--font-size-lg);
  height: var(--font-size-lg);
  flex-shrink: 0;
}

.search-input-wrap__clear:hover {
  color: var(--color-text);
}
</style>
