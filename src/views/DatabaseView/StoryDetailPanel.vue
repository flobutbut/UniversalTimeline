<template>
  <div class="story-detail-panel">

    <div v-if="loading" class="story-detail-panel__loading">
      <div class="spinner"></div>
      <span>Chargement…</span>
    </div>

    <div v-else-if="!story" class="story-detail-panel__empty">
      Sélectionnez une story pour voir ses détails
    </div>

    <template v-else>
      <!-- En-tête méta -->
      <div class="story-detail-panel__meta">
        <div class="story-detail-panel__meta-text">
          <h2 class="story-detail-panel__title">{{ story.title.fr }}</h2>
          <p v-if="story.description?.fr" class="story-detail-panel__desc">{{ story.description.fr }}</p>
        </div>
        <span class="story-detail-panel__badge">{{ story.isPublic ? 'Publique' : 'Privée' }}</span>
      </div>

      <!-- Timeline -->
      <StoryTimeline
        :periods="story.periods"
        :events="story.events"
        :selected-period-id="selectedPeriodId"
        :selected-event-id="selectedEventId"
        @select-period="onTimelineSelectPeriod"
        @select-event="onTimelineSelectEvent"
        @deselect="selectedPeriodId = null; selectedEventId = null"
      />

      <!-- Tabs + bouton Ajouter -->
      <div class="story-detail-panel__tabs-bar">
        <Tabs
          v-model="activeTab"
          :tabs="storyContentTabs"
          variant="underline"
        />
        <Button
          variant="tertiary"
          size="sm"
          type="button"
          @click="activeTab === 'periods' ? (showPeriodPicker = true) : (showEventPicker = true)"
        >
          Ajouter
        </Button>
      </div>

      <!-- Contenu du tab actif -->
      <div class="story-detail-panel__tab-content">

        <!-- Périodes -->
        <template v-if="activeTab === 'periods'">
          <template v-if="story.periods?.length">
            <PeriodTreeView
              :periods="story.periods"
              :selected-id="selectedPeriodId"
              @select="onSelectPeriod"
              @remove="$emit('remove-period', $event)"
            />
          </template>
          <div v-else class="finder-empty-column">Aucune période associée</div>
        </template>

        <!-- Événements -->
        <template v-else>
          <template v-if="story.events?.length">
            <div
              v-for="event in story.events"
              :key="event.id"
              class="finder-item"
              :class="{ selected: selectedEventId === event.id }"
              tabindex="0"
              @click="selectedEventId = selectedEventId === event.id ? null : event.id; selectedPeriodId = null"
            >
              <div class="finder-item-content">
                <div class="finder-item-text">
                  <div class="finder-item-title">{{ event.label?.fr ?? event.label }}</div>
                  <div class="finder-item-dates">{{ formatStoryEventDateLabel(event) }}</div>
                </div>
              </div>
              <div class="finder-item-actions">
                <button
                  class="finder-item-remove"
                  type="button"
                  aria-label="Retirer"
                  @click.stop="$emit('remove-event', event.id)"
                >
                  <X :size="14" stroke-width="2" />
                </button>
              </div>
            </div>
          </template>
          <div v-else class="finder-empty-column">Aucun événement associé</div>
        </template>

      </div>
    </template>

    <!-- Modales de sélection -->
    <PeriodPickerModal
      v-if="showPeriodPicker"
      :already-in-story="storyPeriodIds"
      :initial-period-id="firstStoryRootPeriodId"
      @close="showPeriodPicker = false"
      @confirm="onAddPeriods"
    />
    <EventPickerModal
      v-if="showEventPicker"
      :already-in-story="storyEventIds"
      :story-periods="story?.periods ?? []"
      @close="showEventPicker = false"
      @confirm="onAddEvents"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { X } from 'lucide-vue-next';
import Button from '@/components/base/Button.vue';
import Tabs from '@/components/base/Tabs.vue';
import StoryTimeline from '@/components/StoryTimeline.vue';
import PeriodTreeView from '@/components/PeriodTreeView.vue';
import PeriodPickerModal from './PeriodPickerModal.vue';
import EventPickerModal from './EventPickerModal.vue';
import { formatStoryEventDateLabel } from '@/lib/formatTemporalBoundLabel';

const props = defineProps<{
  story?: any;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'remove-period', id: string): void;
  (e: 'remove-event', id: string): void;
  (e: 'add-periods', ids: string[]): void;
  (e: 'add-events', ids: string[]): void;
}>();

const showPeriodPicker = ref(false);
const showEventPicker = ref(false);
const selectedPeriodId = ref<string | null>(null);
const selectedEventId = ref<string | null>(null);
const activeTab = ref<'periods' | 'events'>('periods');

const storyContentTabs = computed(() => [
  { label: 'Périodes', value: 'periods' as const, count: props.story?.periods?.length ?? 0 },
  { label: 'Événements', value: 'events' as const, count: props.story?.events?.length ?? 0 },
]);

const storyPeriodIds = computed(() =>
  (props.story?.periods ?? []).map((p: any) => p.id)
);

const firstStoryRootPeriodId = computed<string | null>(() => {
  const periods: any[] = props.story?.periods ?? [];
  const ids = new Set(periods.map(p => p.id));
  const root = periods.find(p => !p.parentId || !ids.has(p.parentId));
  return root?.id ?? null;
});
const storyEventIds = computed(() =>
  (props.story?.events ?? []).map((e: any) => e.id)
);

function onSelectPeriod(id: string) {
  selectedPeriodId.value = selectedPeriodId.value === id ? null : id;
  selectedEventId.value = null;
}

function onTimelineSelectPeriod(id: string) {
  selectedPeriodId.value = selectedPeriodId.value === id ? null : id;
  selectedEventId.value = null;
  activeTab.value = 'periods';
}

function onTimelineSelectEvent(id: string) {
  selectedEventId.value = selectedEventId.value === id ? null : id;
  selectedPeriodId.value = null;
  activeTab.value = 'events';
}

const onAddPeriods = (ids: string[]) => {
  showPeriodPicker.value = false;
  if (ids.length) emit('add-periods', ids);
};

const onAddEvents = (ids: string[]) => {
  showEventPicker.value = false;
  if (ids.length) emit('add-events', ids);
};
</script>

<style scoped>
/* ─── Container ──────────────────────────────────────────────────────────────── */

.story-detail-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--color-background);
}

.story-detail-panel__loading,
.story-detail-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  height: 100%;
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  font-style: italic;
}

/* ─── Méta ───────────────────────────────────────────────────────────────────── */

.story-detail-panel__meta {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.story-detail-panel__meta-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.story-detail-panel__title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.story-detail-panel__desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin: 0;
  line-height: var(--line-height-normal);
}

.story-detail-panel__badge {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 2px var(--spacing-sm);
  white-space: nowrap;
}

/* ─── Tab bar ─────────────────────────────────────────────────────────────────── */

.story-detail-panel__tabs-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

/* ─── Contenu du tab ──────────────────────────────────────────────────────────── */

.story-detail-panel__tab-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* ─── Finder items (inline, sans le composant complet pour éviter DnD/Wikidata) ── */

.finder-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  color: var(--color-text);
  font-size: var(--font-size-base);
  background: var(--color-surface);
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: background var(--transition-fast);
}

.finder-item:not(:first-child) {
  border-top: 1px solid var(--color-border-light);
}

.finder-item:hover {
  background: var(--color-surface-hover);
}

.finder-item.selected {
  background: var(--color-primary);
  color: var(--color-text-white);
}

.finder-item-content {
  flex: 1;
  min-width: 0;
  margin-right: var(--spacing-sm);
}

.finder-item-text {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.finder-item-title {
  font-size: var(--font-size-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.finder-item-dates {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.finder-item.selected .finder-item-dates {
  color: color-mix(in srgb, var(--color-text-white) 80%, transparent);
}

.finder-item-actions {
  flex-shrink: 0;
}

.finder-item-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--spacing-xl);
  height: var(--spacing-xl);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-light);
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
}

.finder-item:hover .finder-item-remove {
  opacity: 1;
}

.finder-item-remove:hover {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.finder-item.selected .finder-item-remove {
  opacity: 1;
  color: color-mix(in srgb, var(--color-text-white) 70%, transparent);
}

.finder-item.selected .finder-item-remove:hover {
  color: var(--color-text-white);
  background: var(--color-on-primary-shade-strong);
}

.finder-empty-column {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  font-style: italic;
}

/* ─── Spinner ─────────────────────────────────────────────────────────────────── */

.spinner {
  width: calc(var(--spacing-xl) + var(--spacing-xs));
  height: calc(var(--spacing-xl) + var(--spacing-xs));
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
