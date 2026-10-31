<template>
  <div
    ref="rootRef"
    class="base-select"
    @focusout="handleFocusOut"
    :class="{
      'base-select--error': error,
      'base-select--open': open,
      'base-select--sm': size === 'sm' || compact,
      'base-select--trigger-open-ring': highlightOpenTrigger,
    }"
  >
    <label v-if="label" :id="id ? `${id}-label` : undefined" :for="id" class="base-select__label">
      {{ label }}
      <span v-if="required" class="base-select__required">*</span>
    </label>

    <div class="base-select__wrapper">
      <slot name="trigger" />

      <Transition name="select-dropdown">
        <div
          v-if="open"
          ref="dropdownRef"
          class="base-select__dropdown"
          :class="[dropdownClass, { 'base-select__dropdown--unbounded': unboundedDropdown }]"
          :id="dropdownId"
          :role="dropdownRole ?? undefined"
          :aria-label="dropdownLabel"
          :aria-multiselectable="dropdownRole === 'listbox' ? dropdownMultiple : undefined"
        >
          <slot name="dropdown" />
        </div>
      </Transition>
    </div>

    <span v-if="error" :id="id ? `${id}-error` : undefined" class="base-select__error">{{ error }}</span>
    <span v-if="hint" :id="id ? `${id}-hint` : undefined" class="base-select__hint">{{ hint }}</span>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { shouldDismissOpenSelectOnKeydown } from '@/lib/modalOverlayDismiss';

withDefaults(
  defineProps<{
    label?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    size?: 'md' | 'sm';
    compact?: boolean;
    id?: string;
    /** Classes supplémentaires sur le panneau (ex. panneau période plus large). */
    dropdownClass?: string | string[] | Record<string, boolean>;
    /** Pas de max-height sur le conteneur (p.ex. panneau multi-colonnes). */
    unboundedDropdown?: boolean;
    /** Rôle ARIA du panneau ; laisser vide si non pertinent (p.ex. navigation colonnes). */
    dropdownRole?: string | null;
    dropdownId?: string;
    dropdownLabel?: string;
    dropdownMultiple?: boolean;
    /** Anneau primaire sur le trigger quand le panneau est ouvert. */
    highlightOpenTrigger?: boolean;
  }>(),
  {
    dropdownRole: undefined,
    unboundedDropdown: false,
    highlightOpenTrigger: false,
  }
);

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  (e: 'escape'): void;
}>();

const rootRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
function handleFocusOut(event: FocusEvent) {
  if (event.relatedTarget instanceof Node && !rootRef.value?.contains(event.relatedTarget)) open.value = false;
}

const handleClickOutside = (event: Event) => {
  const target = event.target as Node;
  if (rootRef.value && !rootRef.value.contains(target)) {
    open.value = false;
  }
};

const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (shouldDismissOpenSelectOnKeydown(open.value, event)) {
    if (!rootRef.value?.contains(document.activeElement) && !(event.target instanceof Node && rootRef.value?.contains(event.target))) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open.value = false;
    emit('escape');
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true);
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
  document.removeEventListener('keydown', handleGlobalKeydown);
});

defineExpose({
  rootRef,
  dropdownRef,
});
</script>

<style scoped>
.base-select {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  width: 100%;
  position: relative;
}

.base-select__label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.base-select__required {
  color: var(--color-error);
}

.base-select__wrapper {
  position: relative;
}

.base-select__dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: var(--z-index-dropdown);
  margin-top: var(--spacing-xs);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-height: calc(var(--spacing-xs) * 75);
  overflow: hidden;
}

.base-select__dropdown--unbounded {
  max-height: none;
  overflow: visible;
  right: auto;
  min-width: calc(var(--spacing-xs) * 60);
  width: max-content;
  max-width: min(560px, 92vw);
}

.base-select__dropdown--tall {
  max-height: min(70vh, 520px);
}

.select-dropdown-enter-active,
.select-dropdown-leave-active {
  transition: all var(--transition-fast);
}

.select-dropdown-enter-from,
.select-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.base-select__error {
  font-size: var(--font-size-sm);
  color: var(--color-error);
}

.base-select__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}
</style>

<style src="./select-field-shared.css"></style>
<style src="./select-options-shared.css"></style>
