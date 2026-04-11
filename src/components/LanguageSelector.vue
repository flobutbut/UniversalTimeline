<template>
  <select 
    class="language-selector"
    :value="modelValue"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option value="fr">Français</option>
    <option value="en">English</option>
  </select>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
}>();

defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();
</script>

<style scoped>
.language-selector {
  padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background-color: white;
  font-size: 0.9em;
  cursor: pointer;
  transition: border-color 0.2s ease;
  color: var(--color-text);
}

.language-selector option {
  color: var(--color-text);
  background-color: white;
}

.language-selector:hover {
  border-color: var(--color-success);
}

.language-selector:focus {
  outline: none;
  border-color: var(--color-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-success) 20%, transparent);
}
</style> 