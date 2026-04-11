<template>
  <div class="switch" :class="{ 'switch--checked': modelValue }">
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      class="switch__button"
      @click="$emit('update:modelValue', !modelValue)"
    >
      <span class="switch__track"></span>
      <span class="switch__thumb"></span>
    </button>
    <label v-if="label" class="switch__label">{{ label }}</label>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  label?: string;
}>();

defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();
</script>

<style scoped>
.switch {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.switch__button {
  position: relative;
  width: calc(var(--spacing-sm) * 4 + var(--spacing-xs) * 3);
  height: var(--spacing-xl);
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  outline: none;
}

.switch__track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-surface-hover);
  border-radius: calc(var(--radius-lg) + var(--spacing-xs));
  transition: background-color var(--transition-fast);
}

.switch__thumb {
  position: absolute;
  top: calc(var(--spacing-xs) / 2);
  left: calc(var(--spacing-xs) / 2);
  width: calc(var(--spacing-lg) + var(--spacing-xs));
  height: calc(var(--spacing-lg) + var(--spacing-xs));
  background-color: var(--color-surface);
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-fast);
}

.switch--checked .switch__track {
  background-color: var(--color-primary);
}

.switch--checked .switch__thumb {
  transform: translateX(calc(var(--spacing-lg) + var(--spacing-xs)));
}

.switch__label {
  font-size: var(--font-size-base);
  color: var(--color-text);
  user-select: none;
}

.switch__button:focus-visible .switch__track {
  box-shadow: 0 0 0 2px var(--color-primary-light);
}
</style> 