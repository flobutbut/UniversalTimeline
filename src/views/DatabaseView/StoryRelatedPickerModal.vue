<template>
  <ModalShell :title="uiText('Associer des frises')" height="auto" @close="$emit('close')">
    <div class="story-picker">
      <p class="story-picker__description">{{ uiText("Choisissez une ou plusieurs frises à associer.") }}</p>
      <BaseSelect v-if="periods" v-model="periodId" :label="uiText('Période de rattachement')" :placeholder="uiText('Choisir une période…')"
        :options="periods.map(period => ({ value: period.id, label: localizedText(period.label) }))" searchable />
      <FeedbackState v-if="loadError" kind="error" :message="uiText(loadError)" retryable @retry="loadStories" />
      <BaseSelect v-else v-model="selectedIds" :label="uiText('Frises')" :placeholder="uiText('Rechercher des frises…')" multiple searchable
        :options="options" :loading="loading" :disabled="loading"
        no-results-text="Aucune frise disponible" />
    </div>
    <template #footer-left>
      <span class="story-picker__count" role="status">{{ validIds.length }} {{ uiText(validIds.length === 1 ? 'frise sélectionnée' : 'frises sélectionnées') }}</span>
    </template>
    <template #footer-right>
      <Button :disabled="loading || !!loadError || validIds.length === 0 || (!!periods && !periodId)" @click="confirm">{{ uiText("Associer") }}</Button>
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
import { localizedText, uiText } from '@/i18n';
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '@/stores/useDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import ModalShell from '@/components/base/ModalShell.vue';
import BaseSelect from '@/components/base/Select.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import Button from '@/components/base/Button.vue';
import type { Period } from '@/types/database';
import type { SelectValue } from '@/lib/selectOptions';

const props = defineProps<{
  /** Current frise and existing anchors cannot be selected. */
  excludeStoryIds: string[];
  periods?: Period[];
}>();
const emit = defineEmits<{
  close: [];
  confirm: [ids: string[], periodId?: string];
}>();
const dataStore = useDataStore();
const auth = useAuthStore();
const { stories } = storeToRefs(dataStore);
const periodId = ref<string | null>(null);
const selectedIds = ref<SelectValue>([]);
const loading = ref(false);
const loadError = ref<string | null>(null);
const options = computed(() => {
  const excluded = new Set(props.excludeStoryIds);
  return stories.value.filter(story => auth.canEditStory(story) && !excluded.has(story.id))
    .map(story => ({ value: story.id, label: localizedText(story.title) }));
});
const validIds = computed(() => {
  const allowed = new Set(options.value.map(option => option.value));
  return Array.isArray(selectedIds.value) ? [...new Set(selectedIds.value.filter((id): id is string => typeof id === 'string' && allowed.has(id)))] : [];
});
function confirm() {
  if (loading.value || loadError.value || !validIds.value.length) return;
  if (props.periods && !props.periods.some(period => period.id === periodId.value)) return;
  emit('confirm', validIds.value, periodId.value ?? undefined);
}
async function loadStories() {
  loading.value = true;
  loadError.value = null;
  try { await dataStore.ensureStoriesLoaded(); }
  catch { loadError.value = 'Impossible de charger les frises.'; }
  finally { loading.value = false; }
}
onMounted(() => { if (!stories.value.length) void loadStories(); });
</script>

<style scoped>
.story-picker { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.story-picker__description { margin: 0; color: var(--color-text-secondary); font: var(--type-body); }
.story-picker__count { font: var(--type-meta); color: var(--color-text-secondary); }
</style>
