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
  width: 44px;
  height: 24px;
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
  border-radius: 12px;
  transition: background-color var(--transition-fast);
}

.switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: var(--color-surface);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform var(--transition-fast);
}

.switch--checked .switch__track {
  background-color: var(--color-primary);
}

.switch--checked .switch__thumb {
  transform: translateX(20px);
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