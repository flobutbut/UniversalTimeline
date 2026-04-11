<template>
  <ModalShell title="Sélectionner des événements" @close="$emit('close')">
    <!-- Barre de recherche + hint filtre -->
    <div class="search-bar">
      <SearchInput v-model="search" placeholder="Rechercher un événement…" autofocus />
      <span v-if="dateRange" class="date-range-hint">
        Filtrés : {{ rangeLabel }}
      </span>
    </div>

    <!-- Liste des événements -->
    <div class="event-list">
      <div v-if="loading" class="empty">Chargement…</div>
      <template v-else>
        <div
          v-for="event in filteredEvents"
          :key="event.id"
          class="event-item"
          :class="{
            'is-checked': checkedIds.has(event.id),
            'is-already': alreadyInStory.includes(event.id),
          }"
          @click="toggle(event.id)"
        >
          <input
            type="checkbox"
            :checked="checkedIds.has(event.id)"
            :disabled="alreadyInStory.includes(event.id)"
            @change.stop="toggle(event.id)"
            @click.stop
          />
          <span class="item-label">{{ event.label.fr }}</span>
          <span class="item-date">{{ formatEventPickerListDate((event as any).date) }}</span>
        </div>
        <div v-if="filteredEvents.length === 0" class="empty">
          {{ search ? 'Aucun résultat' : 'Aucun événement disponible' }}
        </div>
      </template>
    </div>

    <!-- Footer -->
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
import { useDataStore } from '@/stores/useDataStore';
import { DateService } from '@/services/DateService';
import { formatEventPickerListDate, listEventYearsBPFallbackToDate } from '@/lib/listEventTableHelpers';
import { getStoryPeriodBoundaryYearsBP } from '@/lib/storyPeriodBoundaryYbp';
import ModalShell from '@/components/base/ModalShell.vue';
import SearchInput from '@/components/base/SearchInput.vue';
import PickerSelectionCount from './PickerSelectionCount.vue';
import PickerModalAddButton from './PickerModalAddButton.vue';

const props = defineProps<{
  alreadyInStory: string[];
  storyPeriods: any[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', ids: string[]): void;
}>();

const dataStore = useDataStore();
const search = ref('');
const loading = ref(false);
const checkedIds = ref(new Set<string>());

// ── Fenêtre temporelle ────────────────────────────────────────────────────────

const dateRange = computed(() => {
  if (!props.storyPeriods.length) return null;
  const oldest = Math.max(
    ...props.storyPeriods.map((p) => getStoryPeriodBoundaryYearsBP(p as Record<string, unknown>, 'start'))
  );
  const newest = Math.min(
    ...props.storyPeriods.map((p) => getStoryPeriodBoundaryYearsBP(p as Record<string, unknown>, 'end'))
  );
  if (oldest === 0) return null;
  return { oldest, newest };
});

const rangeLabel = computed(() => {
  if (!dateRange.value) return '';
  const start = DateService.formatGeological(dateRange.value.oldest);
  const end = dateRange.value.newest <= 80 ? "Aujourd'hui" : DateService.formatGeological(dateRange.value.newest);
  return `${start} → ${end}`;
});

// ── Liste filtrée ─────────────────────────────────────────────────────────────

const filteredEvents = computed(() => {
  const q = search.value.toLowerCase();
  return dataStore.events.filter((e: any) => {
    if (q && !e.label.fr.toLowerCase().includes(q)) return false;
    if (dateRange.value) {
      const ybp = listEventYearsBPFallbackToDate(e);
      if (ybp > dateRange.value.oldest || ybp < dateRange.value.newest) return false;
    }
    return true;
  });
});

// ── Interactions ──────────────────────────────────────────────────────────────

const toggle = (id: string) => {
  if (props.alreadyInStory.includes(id)) return;
  const next = new Set(checkedIds.value);
  next.has(id) ? next.delete(id) : next.add(id);
  checkedIds.value = next;
};

const confirm = () => emit('confirm', [...checkedIds.value]);

onMounted(async () => {
  if (dataStore.events.length === 0) {
    loading.value = true;
    await dataStore.ensureEventsLoaded();
    loading.value = false;
  }
});
</script>

<style scoped>
.search-bar {
  margin-bottom: var(--spacing-md);
  flex-shrink: 0;
}


.date-range-hint {
  display: block;
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.event-list {
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

.event-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  cursor: pointer;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-fast);
}

.event-item:last-child {
  border-bottom: none;
}

.event-item:hover:not(.is-already) {
  background: var(--color-surface-hover);
}

.event-item.is-already {
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

.item-date {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  white-space: nowrap;
  flex-shrink: 0;
}

</style>
