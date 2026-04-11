<template>
  <button
    :class="[
      'base-button',
      `base-button--${variant}`,
      { 'base-button--icon-only': iconOnly },
      { 'base-button--sm': size === 'sm' },
      { 'base-button--disabled': disabled }
    ]"
    :disabled="disabled"
    :type="type"
    @click="$emit('click', $event)"
  >
    <span v-if="$slots.icon || icon" class="base-button__leading">
      <slot name="icon">
        <i v-if="icon" :class="icon" class="base-button__icon"></i>
      </slot>
    </span>
    <span v-if="!iconOnly" class="base-button__text">
      <slot></slot>
    </span>
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  type?: 'button' | 'submit' | 'reset';
  size?: 'md' | 'sm';
  icon?: string;
  iconOnly?: boolean;
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  type: 'button',
  size: 'md',
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
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
  outline: none;
}

.base-button--primary {
  background-color: var(--color-primary-button, var(--color-primary-dark));
  color: var(--color-text-white);
}

.base-button--primary:hover:not(.base-button--disabled) {
  background-color: var(--color-primary-button-hover, var(--color-primary-dark));
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
  padding: var(--spacing-xs) var(--spacing-sm);
}

.base-button--tertiary:hover:not(.base-button--disabled) {
  background-color: var(--color-surface-hover);
}

.base-button--icon-only {
  padding: var(--spacing-sm);
}

.base-button--sm {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  min-height: calc(var(--spacing-sm) * 9 / 2);
}

.base-button--sm.base-button--icon-only {
  padding: calc((var(--spacing-sm) + var(--spacing-xs)) / 2);
  min-width: calc(var(--spacing-sm) * 9 / 2);
  min-height: calc(var(--spacing-sm) * 9 / 2);
}

.base-button__leading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
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