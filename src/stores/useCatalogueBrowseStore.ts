import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useCatalogueFilterState } from '@/composables/useCatalogueFilterState';

/** Public browsing preferences live in memory, including when returning from Exploration. */
export const useCatalogueBrowseStore = defineStore('catalogue-browse', () => {
  const search = ref('');
  const scrollTop = ref(0);
  const filters = useCatalogueFilterState();
  function reset() { search.value = ''; filters.reset(); scrollTop.value = 0; }
  return { search, scrollTop, tagIds: filters.tagIds, timeRange: filters.timeRange, period: filters.period, reset };
});
