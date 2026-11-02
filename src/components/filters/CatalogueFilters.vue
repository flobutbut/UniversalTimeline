<template>
  <FilterBuilder :types="types" :active-filters="activeFilters" @remove="remove" @add="type => { if (type === 'time') timeAdded = true; }">
    <template #chip-time="{ open, expanded }">
      <span class="date-filter__icon"><Icon icon="mdi:calendar-range-outline" width="15" /></span>
      <button type="button" class="date-filter__bound" data-filter-type="time" aria-label="Modifier la date de début" aria-haspopup="dialog" :aria-expanded="expanded"
        @click="open($event, '[aria-label=&quot;Début de la plage&quot;]')">{{ timeRange ? formatYearsBP(timeRange.oldBP) : 'Début' }}<Icon icon="mdi:chevron-down" width="13" /></button>
      <span class="date-filter__separator" aria-hidden="true">→</span>
      <button type="button" class="date-filter__bound" data-filter-type="time" aria-label="Modifier la date de fin" aria-haspopup="dialog" :aria-expanded="expanded"
        @click="open($event, '[aria-label=&quot;Fin de la plage&quot;]')">{{ timeRange ? formatYearsBP(timeRange.recentBP) : 'Fin' }}<Icon icon="mdi:chevron-down" width="13" /></button>
    </template>
    <template #default="{ type, close }">
      <FilterValueList v-if="type === 'visibility'" :model-value="[visibility]" :options="visibilityOptions" label="Visibilité"
        @update:model-value="values => visibility = values[0] as 'all' | 'public' | 'private'" @done="close" />
      <FilterValueList v-else-if="type === 'categories'" v-model="categories" :options="categoryOptions" :label="context === 'stories' ? 'Tags' : 'Catégories'"
        multiple search-placeholder="Rechercher une catégorie…" />
      <FilterValueList v-else-if="type === 'stories'" v-model="storyIds" :options="storyOptions" label="Frises" multiple
        search-placeholder="Rechercher une frise…" :loading="storiesLoading" :error="storiesError" @retry="$emit('retryStories')" />
      <PeriodFilterPicker v-else-if="type === 'period' && context !== 'periods'" :model-value="period?.id ?? null" :pending="periodPending" :selection-error="periodError"
        @update:model-value="choosePeriod" @retry="choosePeriod(requestedPeriodId)" />
      <TemporalRangeFilter v-else-if="type === 'time'" v-model="timeRange" />
    </template>
  </FilterBuilder>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import PeriodFilterPicker from './PeriodFilterPicker.vue';
import { useDataStore } from '@/stores/useDataStore';
import { PeriodApiService } from '@/services/PeriodApiService';
import { useLatestRequest } from '@/composables/useLatestRequest';
import FilterValueList from './FilterValueList.vue';
import FilterBuilder from './FilterBuilder.vue';
import TemporalRangeFilter from './TemporalRangeFilter.vue';
import { formatYearsBP, rangeFromPeriod, type StoryTimeRange } from '@/lib/storyTimeFilter';
import type { ActiveFilter, FilterType, PeriodFilter } from './filterTypes';
const props = withDefaults(defineProps<{
  context?: 'stories' | 'periods' | 'events';
  categoryOptions?: { value: string; label: string }[];
  storyOptions?: { value: string; label: string }[];
  storiesLoading?: boolean;
  storiesError?: string | null;
}>(), { context: 'stories', categoryOptions: () => [], storyOptions: () => [] });
defineEmits<{ retryStories: [] }>();
const visibility = defineModel<'all' | 'public' | 'private'>({ default: 'all' });
const categories = defineModel<string[]>('categories', { default: () => [] });
const storyIds = defineModel<string[]>('storyIds', { default: () => [] });
const timeRange = defineModel<StoryTimeRange | null>('timeRange', { default: null });
const period = defineModel<PeriodFilter | null>('period', { default: null });
const periodPending = ref(false);
const periodError = ref<string | null>(null);
const periodRequests = useLatestRequest();
const store = useDataStore();
let requestedPeriodId = '';
const timeAdded = ref(false);
const visibilityOptions = [{ value: 'all', label: 'Toutes les frises' }, { value: 'public', label: 'Frises publiques' }, { value: 'private', label: 'Frises privées' }];
const types = computed<FilterType[]>(() => [
  props.context === 'stories' ? { key: 'visibility', label: 'Visibilité', icon: 'mdi:eye-outline' } : { key: 'stories', label: 'Frise', icon: 'mdi:chart-timeline-variant' },
  { key: 'categories', label: props.context === 'stories' ? 'Tags' : 'Catégorie', icon: 'mdi:tag-outline' },
  { key: 'time', label: 'Dates', icon: 'mdi:calendar-range-outline', trigger: true },
  { key: 'period', label: 'Période', icon: 'mdi:timeline-clock-outline', disabled: props.context === 'periods' },
]);
async function choosePeriod(id: string) {
  if (props.context === 'periods') return;
  requestedPeriodId = id;
  const isCurrent = periodRequests.begin();
  periodError.value = null;
  periodPending.value = !!id;
  if (!id) { period.value = null; return; }
  try {
    const selected = store.periodById(id) ?? await PeriodApiService.getInstance().getPeriod(id);
    if (!isCurrent()) return;
    const range = rangeFromPeriod(selected);
    if (!range) { periodError.value = 'Les dates de cette période ne sont pas connues.'; return; }
    period.value = { id, label: selected.label.fr || selected.label.en, range };
  } catch (cause) {
    if (isCurrent()) periodError.value = cause instanceof Error ? cause.message : 'Impossible de charger cette période.';
  } finally { if (isCurrent()) periodPending.value = false; }
}
const activeFilters = computed<ActiveFilter[]>(() => [
  ...(props.context === 'stories' && visibility.value !== 'all' ? [{ key: 'visibility', type: 'visibility', label: visibility.value === 'public' ? 'Frises publiques' : 'Frises privées' }] : []),
  ...categories.value.map(id => ({ key: `category:${id}`, type: 'categories', label: props.categoryOptions.find(option => option.value === id)?.label ?? id })),
  ...storyIds.value.map(id => ({ key: `story:${id}`, type: 'stories', label: `Frise : ${props.storyOptions.find(option => option.value === id)?.label ?? id}` })),
  ...(period.value && props.context !== 'periods' ? [{ key: 'period', type: 'period', label: `Période : ${period.value.label}` }] : []),
  ...(timeAdded.value || timeRange.value ? [{ key: 'time', type: 'time', label: 'Dates' }] : []),
]);
function remove(key: string) {
  if (key === 'visibility') visibility.value = 'all';
  else if (key === 'period') { periodRequests.cancel(); periodPending.value = false; periodError.value = null; period.value = null; }
  else if (key === 'time') { timeAdded.value = false; timeRange.value = null; }
  else if (key.startsWith('category:')) categories.value = categories.value.filter(id => id !== key.slice(9));
  else if (key.startsWith('story:')) storyIds.value = storyIds.value.filter(id => id !== key.slice(6));
}
</script>
<style scoped>
.date-filter__icon { display: inline-flex; padding-left: var(--spacing-sm); }
.date-filter__bound { display: inline-flex; align-items: center; gap: var(--spacing-xs); padding: 7px var(--spacing-sm); border: 0; background: transparent; color: inherit; font: inherit; white-space: nowrap; cursor: pointer; }
.date-filter__bound:hover { background: var(--color-interaction-hover); }
.date-filter__bound:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
.date-filter__separator { color: var(--color-text-secondary); }
</style>
