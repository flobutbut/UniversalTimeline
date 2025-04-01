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
  color: #2196f3;
  font-size: 1.2em;
  margin-left: 8px;
  opacity: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--base-font-size) * var(--line-height-normal));
  height: calc(var(--base-font-size) * var(--line-height-normal));
  background-color: rgba(33, 150, 243, 0.1);
  border-radius: 50%;
  padding: 0;
  line-height: 0;
  margin-top: 0;
}

.icon {
  width: calc(var(--base-font-size) * var(--line-height-normal));
  height: calc(var(--base-font-size) * var(--line-height-normal));
  color: #2196f3;
  display: block;
  line-height: 0;
  margin: 0;
}
</style> 