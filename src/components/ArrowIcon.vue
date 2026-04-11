<template>
  <div class="arrow-icon">
    <ChevronRight class="icon" />
  </div>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
</script>

<style scoped>
.arrow-icon {
  color: var(--color-primary);
  font-size: 1.2em;
  margin-left: var(--spacing-sm);
  opacity: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--line-height-normal);
  height: var(--line-height-normal);
  background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 50%;
  padding: 0;
  line-height: 0;
  margin-top: 0;
}

.icon {
  width: var(--line-height-normal);
  height: var(--line-height-normal);
  color: var(--color-primary);
  display: block;
  line-height: 0;
  margin: 0;
}
</style> 