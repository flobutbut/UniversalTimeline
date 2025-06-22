<template>
  <button
    :class="[
      'base-button',
      `base-button--${variant}`,
      { 'base-button--icon-only': iconOnly },
      { 'base-button--disabled': disabled }
    ]"
    :disabled="disabled"
    :type="type"
    @click="$emit('click', $event)"
  >
    <i v-if="icon" :class="icon" class="base-button__icon"></i>
    <span v-if="!iconOnly" class="base-button__text">
      <slot></slot>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  type?: 'button' | 'submit' | 'reset';
  icon?: string;
  iconOnly?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  type: 'button',
  icon: '',
  iconOnly: false,
  disabled: false
});

defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
  outline: none;
}

.base-button--primary {
  background-color: var(--color-primary);
  color: var(--color-text-white);
}

.base-button--primary:hover:not(.base-button--disabled) {
  background-color: var(--color-primary-dark);
}

.base-button--secondary {
  background-color: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.base-button--secondary:hover:not(.base-button--disabled) {
  background-color: var(--color-surface-hover);
}

.base-button--tertiary {
  background-color: transparent;
  color: var(--color-primary);
  padding: 4px 8px;
}

.base-button--tertiary:hover:not(.base-button--disabled) {
  background-color: var(--color-surface-hover);
}

.base-button--icon-only {
  padding: 8px;
}

.base-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.base-button__icon {
  font-size: 1.1em;
}

.base-button__text {
  line-height: 1;
}

.base-button--danger {
  background-color: var(--color-error);
  color: var(--color-text-white);
  border: 1px solid var(--color-error);
}

.base-button--danger:hover:not(.base-button--disabled) {
  background-color: var(--color-error-dark);
}
</style> 