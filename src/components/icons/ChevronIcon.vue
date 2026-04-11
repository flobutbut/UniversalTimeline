<template>
  <span class="chevron-icon" aria-hidden="true">
    <Icon
      icon="mdi:chevron-right"
      :width="width"
      :height="height"
      :color="color"
    />
  </span>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

defineProps<{
  width?: number;
  height?: number;
  color?: string;
}>();
</script>

<style scoped>
.chevron-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  vertical-align: middle;
}
</style>