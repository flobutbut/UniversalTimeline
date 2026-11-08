<template>
  <CatalogueFilters v-model="visibility" v-model:tags="tags" v-model:time-range="timeRange" v-model:period="period" :tag-options="tagOptions" />
</template>
<script setup lang="ts">
import CatalogueFilters from '@/components/filters/CatalogueFilters.vue';
import type { PeriodFilter } from '@/components/filters/filterTypes';
import type { StoryTimeRange } from '@/lib/storyTimeFilter';
defineProps<{ tagOptions?: { value: string; label: string; group?: string }[] }>();
const visibility = defineModel<'all' | 'public' | 'private'>({ required: true });
const tags = defineModel<string[]>('tags', { default: () => [] });
const period = defineModel<PeriodFilter | null>('period', { default: null });
const timeRange = defineModel<StoryTimeRange | null>('timeRange', { default: null });
</script>
