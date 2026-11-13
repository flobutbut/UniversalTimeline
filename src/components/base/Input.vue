<template>
  <div class="base-input" :class="[$attrs.class, { 'base-input--error': error, 'base-input--sm': size === 'sm', 'base-input--textarea-lg': textareaSize === 'lg' }]" :style="$attrs.style">
    <label v-if="label" :for="id" class="base-input__label">
      {{ uiText(label) }}<span v-if="required" class="base-input__required">*</span>
    </label>
    <component
      :is="type === 'textarea' ? 'textarea' : 'input'"
      v-bind="fieldAttrs()"
      :id="id"
      :type="type === 'textarea' ? undefined : type"
      :value="modelValue"
      :placeholder="uiText(placeholder)"
      :disabled="disabled"
      :required="required"
      :aria-invalid="error ? 'true' : $attrs['aria-invalid']"
      :aria-describedby="descriptionIds()"
      class="base-input__field"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
    />
    <span v-if="error" :id="`${id}-error`" class="base-input__error">{{ uiText(error) }}</span>
    <span v-if="hint" :id="`${id}-hint`" class="base-input__hint">{{ hint }}</span>
  </div>
</template>

<script setup lang="ts">
import { uiText } from "@/i18n";
import { useAttrs } from 'vue';
import { generateDomUid } from '@/utils/generateDomUid';
defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<{
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
  textareaSize?: 'md' | 'lg';
}>(), { type: 'text', placeholder: '', required: false, disabled: false, size: 'md', textareaSize: 'md', id: () => generateDomUid('input') });
const attrs = useAttrs();
function fieldAttrs() {
  return Object.fromEntries(Object.entries(attrs).filter(([key]) => !['class', 'style'].includes(key)));
}
function descriptionIds() {
  return [attrs['aria-describedby'], props.error ? `${props.id}-error` : null, props.hint ? `${props.id}-hint` : null].filter(Boolean).join(' ') || undefined;
}
defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'blur', event: FocusEvent): void;
  (e: 'focus', event: FocusEvent): void;
}>();
</script>

<style scoped>
.base-input { display: flex; flex-direction: column; gap: var(--spacing-xs); width: 100%; min-width: 0; }
.base-input__label { display: flex; align-items: center; gap: var(--spacing-xs); font: var(--type-label); color: var(--color-text-primary); }
.base-input__required, .base-input__error { color: var(--color-status-error-foreground); }
.base-input__field { box-sizing: border-box; width: 100%; min-width: 0; min-height: var(--field-height-lg); padding: var(--spacing-md); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); font: var(--type-compact); color: var(--color-text-primary); background: var(--color-surface-default); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.base-input__field::placeholder { color: var(--color-text-secondary); opacity: 1; }
.base-input__field:focus { outline: none; border-color: var(--color-border-focus); box-shadow: inset 0 0 0 1px var(--color-border-focus); }
.base-input--sm .base-input__field { min-height: var(--field-height-md); padding: var(--spacing-xs) var(--spacing-sm); }
.base-input__field:disabled { background: var(--color-interaction-disabled); cursor: not-allowed; opacity: .5; }
.base-input--error .base-input__field { border-color: var(--color-status-error-foreground); }
.base-input--error .base-input__field:focus { box-shadow: inset 0 0 0 1px var(--color-status-error-foreground); }
.base-input__error, .base-input__hint { font: var(--type-meta); }
.base-input__hint { color: var(--color-text-secondary); }
textarea.base-input__field { display: block; min-height: var(--textarea-height-default); resize: vertical; white-space: pre-wrap; overflow-wrap: anywhere; }
.base-input--textarea-lg textarea.base-input__field { min-height: var(--textarea-height-large); }
</style>
