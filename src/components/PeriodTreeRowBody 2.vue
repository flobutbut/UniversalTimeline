<template>
  <div class="period-tree-row__main">
    <div class="period-tree-row__stack">
      <div class="period-tree-row__label">{{ label }}</div>
      <div class="period-tree-row__dates">{{ datesLabel }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  datesLabel: string;
}>();
</script>

<style scoped>
.period-tree-row__main {
  flex: 1;
  min-width: 0;
  margin-right: var(--spacing-sm);
}

.period-tree-row__stack {
  display: flex;
  flex-direction: column;
  gap: 0;
  row-gap: 0;
  min-width: 0;
}

.period-tree-row__label {
  font-size: var(--font-size-base);
  line-height: var(--line-height-tight);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.period-tree-row__dates {
  font-size: var(--font-size-xs);
  line-height: var(--line-height-tight);
  margin-top: 0;
  padding-top: 0;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
