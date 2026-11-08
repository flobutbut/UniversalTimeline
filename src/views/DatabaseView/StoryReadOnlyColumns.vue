<template>
  <div class="story-readonly-columns" role="group" :aria-label="`Lecture seule : ${story?.title.fr || 'frise associée'}`" @drop.prevent.stop @dragover.prevent.stop @dragstart.prevent.stop>
    <div v-if="!story" class="finder-column">
      <div class="finder-column-header"><h2>Frise associée · Lecture seule</h2></div>
      <FeedbackState v-if="error" kind="error" :message="error" retryable @retry="load" />
      <FeedbackState v-else kind="loading" />
    </div>
    <div v-for="(periods, index) in columns" v-else :key="index" class="finder-column story-readonly-column">
      <div class="finder-column-header"><h2>{{ index ? label(path[index - 1]) : story.title.fr || story.title.en }}</h2><span class="story-readonly-column__label">Lecture seule</span></div>
      <div class="finder-column-content">
        <FinderItem v-for="period in periods" :key="period.id" :item-id="period.id" :label="storyPeriodLabelForFinder(period)" :start-date="period.startDate" :end-date="period.endDate"
          :tags="storyPeriodTags(period)" :selected="selected === period.id" :has-children="story.periods.some(child => getStoryPeriodParentId(child) === period.id)"
          :draggable="false" hide-row-action is-external-catalog :data-readonly-period-id="period.id" @click="select(period.id)" />
        <p v-if="!periods.length" class="finder-empty-column">Aucune sous-période</p>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import FinderItem from '@/views/GraphView/FinderItem.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import { useDataStore } from '@/stores/useDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { buildStoryFinderPathFromSelectedPeriodId, getStoryPeriodChildren, getStoryPeriodRoots, storyPeriodLabelForFinder, storyPeriodTags } from '@/lib/storyPeriodFinderColumns';
import { getStoryPeriodParentId } from '@/lib/storyPeriodParent';
import type { Story } from '@/types/database';
const props = defineProps<{ storyId: string }>();
const store = useDataStore(), auth = useAuthStore();
const story = ref<Story | null>(null), selected = ref<string | null>(null), error = ref<string | null>(null);
let revision = 0;
async function load() {
  const current = ++revision; story.value = null; selected.value = null; error.value = null;
  try { const result = await store.ensureStoryLoaded(props.storyId); if (current === revision) story.value = result; }
  catch (cause) { if (current === revision) error.value = cause instanceof Error ? cause.message : 'Impossible de charger la frise.'; }
}
const path = computed(() => buildStoryFinderPathFromSelectedPeriodId(story.value?.periods ?? [], selected.value));
const columns = computed(() => story.value ? [getStoryPeriodRoots(story.value.periods), ...path.value.map(id => getStoryPeriodChildren(story.value!.periods, id))] : []);
const label = (id?: string) => story.value?.periods.find(period => period.id === id)?.label.fr || 'Sous-périodes';
function select(id: string) { selected.value = id; }
watch([() => props.storyId, () => auth.identityVersion], load, { immediate: true });
onScopeDispose(() => { revision++; });
</script>
<style scoped>
.story-readonly-columns { display: flex; flex: 0 0 auto; height: auto; min-height: 0; align-items: stretch; }
.story-readonly-column__label { color: var(--color-text-secondary); font-size: var(--font-size-xs); white-space: nowrap; }
.story-readonly-column :deep(.finder-item-content) { color: var(--color-text-secondary); }
.story-readonly-column :deep(.finder-item.selected .finder-item-content) { color: var(--color-text-on-selected); }
</style>
