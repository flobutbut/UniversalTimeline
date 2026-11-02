<template><div class="popover-surface" :class="{ 'popover-surface--padded': padded }"><slot /></div></template>
<script setup lang="ts">
defineProps<{ padded?: boolean }>();
</script>
<style scoped>
.popover-surface { border: 1px solid var(--color-border-default); border-radius: var(--radius-md); background: var(--color-surface-raised); color: var(--color-text-primary); box-shadow: var(--shadow-lg); }
.popover-surface--padded { padding: var(--spacing-sm); }
</style>
