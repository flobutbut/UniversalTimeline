<template>
  <span class="item-summary">
    <span class="item-summary__title"><slot name="title">{{ title }}</slot></span>
    <span v-if="description || $slots.details" class="item-summary__details"><slot name="details">{{ description }}</slot></span>
    <span v-if="$slots.meta" class="item-summary__meta"><slot name="meta" /></span>
  </span>
</template>

<script setup lang="ts">
defineProps<{ title?: string; description?: string }>();
</script>

<style scoped>
.item-summary { display: flex; flex-direction: column; align-items: stretch; gap: 0; min-width: 0; line-height: var(--line-height-small); text-align: left; }
.item-summary__title { display: block; min-width: 0; font-size: var(--font-size-sm); color: inherit; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-summary__details { display: block; min-width: 0; font-size: var(--font-size-xs); color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-summary__meta { display: flex; align-items: center; min-width: 0; font-size: var(--font-size-xs); }
</style>
