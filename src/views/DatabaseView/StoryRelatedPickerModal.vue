<template>
  <ModalShell title="Ajouter des frises liées" @close="$emit('close')">
    <div class="search-bar">
      <SearchInput v-model="search" placeholder="Rechercher une frise…" autofocus />
    </div>

    <div class="story-list">
      <div v-if="loading" class="empty">Chargement…</div>
      <template v-else>
        <div
          v-for="s in filteredStories"
          :key="s.id"
          class="story-item"
          :class="{
            'is-checked': checkedIds.has(s.id),
            'is-excluded': excludedIds.has(s.id),
          }"
          @click="toggle(s.id)"
        >
          <input
            type="checkbox"
            :checked="checkedIds.has(s.id)"
            :disabled="excludedIds.has(s.id)"
            @change.stop="toggle(s.id)"
            @click.stop
          />
          <span class="item-label">{{ s.title.fr }}</span>
        </div>
        <div v-if="filteredStories.length === 0" class="empty">
          {{ search ? 'Aucun résultat' : 'Aucune frise disponible' }}
        </div>
      </template>
    </div>

    <template #footer-left>
      <PickerSelectionCount :count="checkedIds.size" />
    </template>
    <template #footer-right>
      <PickerModalAddButton :disabled="checkedIds.size === 0" @click="confirm" />
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '@/stores/useDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import ModalShell from '@/components/base/ModalShell.vue';
import SearchInput from '@/components/base/SearchInput.vue';
import PickerSelectionCount from './PickerSelectionCount.vue';
import PickerModalAddButton from './PickerModalAddButton.vue';
import type { ListStory } from '@/types/database';

const props = defineProps<{
  /** Story courante + déjà liées : non sélectionnables. */
  excludeStoryIds: string[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', ids: string[]): void;
}>();

const dataStore = useDataStore();
const auth = useAuthStore();
const { stories } = storeToRefs(dataStore);
const search = ref('');
const loading = ref(false);
const checkedIds = ref(new Set<string>());

const excludedIds = computed(() => new Set(props.excludeStoryIds));

const filteredStories = computed(() => {
  const q = search.value.trim().toLowerCase();
  return stories.value.filter((s: ListStory) => {
    if (!auth.ownsStory(s)) return false;
    if (excludedIds.value.has(s.id)) return false;
    if (q && !s.title.fr.toLowerCase().includes(q)) return false;
    return true;
  });
});

function toggle(id: string) {
  if (excludedIds.value.has(id)) return;
  const next = new Set(checkedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  checkedIds.value = next;
}

function confirm() {
  emit('confirm', [...checkedIds.value]);
}

onMounted(async () => {
  if (stories.value.length === 0) {
    loading.value = true;
    await dataStore.ensureStoriesLoaded();
    loading.value = false;
  }
});
</script>

<style scoped>
.search-bar {
  margin-bottom: var(--spacing-md);
  flex-shrink: 0;
}

.story-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.empty {
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--color-text-light);
  font-style: italic;
  font-size: var(--font-size-sm);
}

.story-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  cursor: pointer;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-fast);
}

.story-item:last-child {
  border-bottom: none;
}

.story-item:hover:not(.is-excluded) {
  background: var(--color-surface-hover);
}

.story-item.is-excluded {
  opacity: 0.4;
  cursor: default;
}

.item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text);
}
</style>
