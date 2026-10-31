<template>
  <div
    class="base-input"
    :class="{ 'base-input--error': error, 'base-input--sm': size === 'sm' }"
  >
    <label v-if="label" :for="id" class="base-input__label">
      {{ label }}
      <span v-if="required" class="base-input__required">*</span>
    </label>
    <div class="base-input__wrapper">
      <textarea
        v-if="type === 'textarea'"
        :id="id"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="[error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined"
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
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="[error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined"
        class="base-input__field"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />
    </div>
    <span v-if="error" :id="`${id}-error`" class="base-input__error">{{ error }}</span>
    <span v-if="hint" :id="`${id}-hint`" class="base-input__hint">{{ hint }}</span>
  </div>
</template>

<script setup lang="ts">
import { generateDomUid } from '@/utils/generateDomUid';

interface Props {
  modelValue: string;
  label?: string;
  type?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  size?: 'md' | 'sm';
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  required: false,
  disabled: false,
  size: 'md',
  id: () => generateDomUid('input')
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


.base-input__field {
  width: 100%;
  min-height: var(--field-height-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text);
  background-color: var(--color-surface);
  transition: all var(--transition-fast);
  box-sizing: border-box;
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

.base-input__field:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.base-input--sm .base-input__field {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  min-height: var(--field-height-md);
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
  min-height: calc(var(--spacing-sm) * 15);
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

<style scoped>
.base-input__label { line-height: 22px; }
.base-input__field { padding: 12px; font-size: var(--font-size-sm); line-height: 16px; }
.base-input__field::placeholder { opacity: 1; }
.base-input__field:focus, .base-input__field:focus-visible { outline: none; border-color: var(--color-border-focus); box-shadow: inset 0 0 0 1px var(--color-border-focus); }
.base-input__field:disabled { background: var(--color-interaction-disabled); opacity: .5; }
.base-input__field[type="textarea"] { min-height: 88px; line-height: 16px; }
</style>
