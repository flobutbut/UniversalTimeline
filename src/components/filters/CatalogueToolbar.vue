<template>
  <div class="catalogue-toolbar">
    <div class="catalogue-toolbar__filters">
      <div class="catalogue-toolbar__search"><SearchInput v-model="search" :placeholder="placeholder" /></div>
      <slot name="filters" />
    </div>
    <div class="catalogue-toolbar__actions"><slot name="actions" /></div>
  </div>
</template>
<script setup lang="ts">
import SearchInput from '@/components/base/SearchInput.vue';
defineProps<{ placeholder: string }>();
const search = defineModel<string>('search', { required: true });
</script>
<style scoped>
.catalogue-toolbar { display: flex; align-items: center; gap: var(--spacing-sm); flex-shrink: 0; min-width: 0; }
.catalogue-toolbar__filters { display: flex; align-items: center; flex: 1 1 auto; min-width: 0; gap: var(--spacing-sm); overflow-x: auto; scrollbar-width: thin; }
.catalogue-toolbar__search { width: 240px; min-width: 150px; flex: 0 1 240px; }
.catalogue-toolbar__actions { display: flex; flex: 0 0 auto; align-items: center; gap: var(--spacing-sm); }

@media (max-width: 640px) {
  .catalogue-toolbar { flex-direction: column; align-items: stretch; }
  .catalogue-toolbar__filters { flex: 0 0 auto; flex-wrap: wrap; overflow: visible; width: 100%; }
  .catalogue-toolbar__search { flex: 1 1 180px; min-width: 0; width: auto; }
  .catalogue-toolbar__actions { justify-content: flex-end; flex-wrap: wrap; }
}
</style>
