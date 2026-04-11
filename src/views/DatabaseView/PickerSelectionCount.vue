<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    count: number;
    /** Comportement période : texte vide lorsque la sélection est vide. */
    hideWhenZero?: boolean;
  }>(),
  { hideWhenZero: false }
);

const label = computed(() => {
  if (props.hideWhenZero && props.count === 0) return '';
  return `${props.count} sélectionné(s)`;
});
</script>

<template>
  <span class="picker-selection-count">{{ label }}</span>
</template>

<style scoped>
.picker-selection-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  min-height: 1em;
}
</style>
