<template>
  <Icon
    icon="mdi:chevron-right"
    :width="width"
    :height="height"
    :color="color"
  />
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

defineProps<{
  width?: number;
  height?: number;
  color?: string;
}>();
</script> 