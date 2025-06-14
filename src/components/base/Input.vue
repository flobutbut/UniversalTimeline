<template>
  <div class="base-input" :class="{ 'base-input--error': error }">
    <label v-if="label" :for="id" class="base-input__label">
      {{ label }}
      <span v-if="required" class="base-input__required">*</span>
    </label>
    <div class="base-input__wrapper">
      <i v-if="icon" :class="icon" class="base-input__icon"></i>
      <textarea
        v-if="type === 'textarea'"
        :id="id"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        class="base-input__field"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      ></textarea>
      <input
        v-else
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        class="base-input__field"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />
    </div>
    <span v-if="error" class="base-input__error">{{ error }}</span>
    <span v-if="hint" class="base-input__hint">{{ hint }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: string;
  label?: string;
  type?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  icon?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  required: false,
  disabled: false,
  id: () => `input-${Math.random().toString(36).substr(2, 9)}`
});

defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'blur', event: FocusEvent): void;
  (e: 'focus', event: FocusEvent): void;
}>();
</script>

<style scoped>
.base-input {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  width: 100%;
}

.base-input__label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.base-input__required {
  color: var(--color-error);
}

.base-input__wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.base-input__icon {
  position: absolute;
  left: var(--spacing-md);
  color: var(--color-text-light);
  font-size: 1.1em;
}

.base-input__field {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg);
  padding-left: v-bind('icon ? "calc(var(--spacing-lg) * 2 + 16px)" : "var(--spacing-lg)"');
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text);
  background-color: var(--color-surface);
  transition: all var(--transition-fast);
}

.base-input__field::placeholder {
  color: var(--color-text-light);
  opacity: 0.7;
}

.base-input__field:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.base-input__field:disabled {
  background-color: var(--color-surface-hover);
  cursor: not-allowed;
  opacity: 0.7;
}

.base-input--error .base-input__field {
  border-color: var(--color-error);
}

.base-input--error .base-input__field:focus {
  box-shadow: 0 0 0 2px var(--color-error-light);
}

.base-input__error {
  font-size: var(--font-size-sm);
  color: var(--color-error);
}

.base-input__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

/* Style spécifique pour les textareas */
.base-input__field[type="textarea"],
.base-input__field[type="textarea"]:focus {
  min-height: 120px;
  resize: vertical;
  line-height: 1.5;
  padding-top: var(--spacing-md);
  white-space: pre-wrap;
  word-wrap: break-word;
  vertical-align: top;
  text-align: left;
  display: block;
  box-sizing: border-box;
}
</style> 