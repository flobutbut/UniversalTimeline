<template>
  <div
    class="switch"
    :class="{
      'switch--checked': modelValue,
      'switch--sm': variant === 'sm',
    }"
  >
    <label v-if="label && labelFirst" class="switch__label" :for="switchId">{{ label }}</label>
    <button
      :id="switchId"
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :aria-label="ariaLabel"
      :disabled="disabled"
      class="switch__button"
      @click="$emit('update:modelValue', !modelValue)"
    >
      <span class="switch__track"></span>
      <span class="switch__thumb"></span>
    </button>
    <label v-if="label && !labelFirst" class="switch__label" :for="switchId">{{ label }}</label>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue';

withDefaults(
  defineProps<{
    modelValue: boolean;
    label?: string;
    ariaLabel?: string;
    disabled?: boolean;
    /** `sm` : interrupteur compact (ex. en-têtes de colonnes). */
    variant?: 'default' | 'sm';
    /** `true` : libellé à gauche du bouton (LTR). Défaut : libellé après le switch. */
    labelFirst?: boolean;
  }>(),
  {
    variant: 'default',
    labelFirst: false,
  }
);

defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const switchId = useId();
</script>

<style scoped>
.switch {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-md);
}

.switch__button {
  position: relative;
  flex-shrink: 0;
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
  background-color: var(--color-switch-track-off);
  border-radius: calc(var(--radius-lg) + var(--spacing-xs));
  transition: background-color var(--transition-fast);
}

.switch__thumb {
  position: absolute;
  top: calc(var(--spacing-xs) / 2);
  left: calc(var(--spacing-xs) / 2);
  width: calc(var(--spacing-lg) + var(--spacing-xs));
  height: calc(var(--spacing-lg) + var(--spacing-xs));
  background-color: var(--color-switch-thumb);
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

.switch__button:disabled { opacity: .5; cursor: not-allowed; }

.switch__label {
  color: var(--color-text-primary);
  user-select: none;
}

.switch__button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
  border-radius: var(--radius-pill);
}

/* ─── Variant sm ─────────────────────────────────────────────────────────────── */

.switch--sm {
  gap: var(--spacing-md);
}

.switch--sm .switch__button {
  width: calc(var(--spacing-sm) * 3 + var(--spacing-xs) * 2);
  height: var(--spacing-lg);
}

.switch--sm .switch__thumb {
  top: 2px;
  left: 2px;
  width: var(--spacing-md);
  height: var(--spacing-md);
}

.switch--sm.switch--checked .switch__thumb {
  transform: translateX(
    calc(var(--spacing-sm) * 3 + var(--spacing-xs) * 2 - 4px - var(--spacing-md))
  );
}

.switch--sm .switch__button:disabled { opacity: .5; cursor: not-allowed; }

.switch__label {
  font: var(--type-action);
  white-space: nowrap;
}
.switch--sm .switch__label { font: var(--type-compact); }
</style>
