<template>
  <CatalogueFilters v-model="visibility" v-model:categories="categories" v-model:time-range="timeRange" v-model:period="period" :category-options="categoryOptions" />
</template>
<script setup lang="ts">
import CatalogueFilters from '@/components/filters/CatalogueFilters.vue';
import type { PeriodFilter } from '@/components/filters/filterTypes';
import type { StoryTimeRange } from '@/lib/storyTimeFilter';
defineProps<{ categoryOptions?: { value: string; label: string }[] }>();
const visibility = defineModel<'all' | 'public' | 'private'>({ required: true });
const categories = defineModel<string[]>('categories', { default: () => [] });
const period = defineModel<PeriodFilter | null>('period', { default: null });
const timeRange = defineModel<StoryTimeRange | null>('timeRange', { default: null });
</script>
