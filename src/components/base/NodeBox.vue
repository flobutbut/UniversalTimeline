<template>
  <div class="node-box" :title="label">
    <slot>{{ label }}</slot>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
}>();
</script>

<style scoped>
.node-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  min-height: 80px;
  height: 100%;
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-surface);
  color: var(--color-text);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
  font-size: var(--font-size-base);
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s, background 0.2s;
  user-select: none;
}
.node-box:hover, .node-box:focus {
  border-color: var(--color-primary-dark);
  box-shadow: var(--shadow-md);
  background: var(--color-primary-light);
  outline: none;
}
</style> 