import { computed, ref } from 'vue';
import type { PeriodFilter } from '@/components/filters/filterTypes';
import type { CatalogueFilterState } from '@/lib/catalogueFilters';
import type { StoryTimeRange } from '@/lib/storyTimeFilter';

/** État partagé des filtres des vues Périodes et Événements. */
export function useCatalogueFilterState() {
  const tagIds = ref<string[]>([]);
  const storyIds = ref<string[]>([]);
  const timeRange = ref<StoryTimeRange | null>(null);
  const period = ref<PeriodFilter | null>(null);
  const state = computed<CatalogueFilterState>(() => ({ tagIds: tagIds.value, storyIds: storyIds.value, timeRange: timeRange.value, period: period.value }));
  function reset() { tagIds.value = []; storyIds.value = []; timeRange.value = null; period.value = null; }
  return { tagIds, storyIds, timeRange, period, state, reset };
}
