<template>
  <div class="story-detail-panel" :aria-busy="loading || panelBusy || undefined">

    <div v-if="loading" class="story-detail-panel__loading">
      <div class="spinner"></div>
      <span>Chargement…</span>
    </div>

    <div v-else-if="error && !story" role="alert">
      {{ error }} <button type="button" @click="$emit('retry')">Réessayer</button>
    </div>

    <div v-else-if="!story" class="story-detail-panel__empty"> Sélectionnez une frise pour voir ses détails </div>

    <template v-else>
      <div v-if="panelBusy" class="sr-only" role="status">Opération en cours…</div>
      <div v-if="error" class="story-finder-feedback" role="alert">
        {{ error }} <button type="button" :disabled="panelBusy" @click="$emit('retry')">Réessayer</button>
      </div>
      <!-- En-tête méta -->
      <div class="story-detail-panel__meta">
        <div class="story-detail-panel__meta-text">
          <h2 class="story-detail-panel__title">{{ story.title.fr }}</h2>
          <p v-if="story.description?.fr" class="story-detail-panel__desc">{{ story.description.fr }}</p>
        </div>
        <div class="story-detail-panel__meta-actions">
          <Button variant="secondary" size="sm" :pressed="story.isPublic" :disabled="panelBusy" @click="emit('toggle-public')">{{ story.isPublic ? 'Public' : 'Privé' }}</Button>
          <Button variant="tertiary" size="sm" :disabled="panelBusy" @click="openEventCreator">Ajouter un événement</Button>
        </div>
      </div>

      <!-- Onglets -->
      <div class="story-detail-panel__tabs-bar">
        <Tabs
          v-model="activeTab"
          class="story-detail-panel__tabs"
          :tabs="storyContentTabs"
          variant="underline"
        />
      </div>

      <div class="story-detail-panel__scroll-area">
      <!-- Timeline -->
      <StoryTimeline
        :periods="story.periods"
        :events="story.events"
        :selected-period-id="selectedPeriodId"
        :selected-event-id="selectedEventId"
        @select-period="onTimelineSelectPeriod"
        @select-event="onTimelineSelectEvent"
        @deselect="clearPeriodSelection(); selectedEventId = null"
      />

      <!-- Contenu du tab actif -->
      <div
        class="story-detail-panel__tab-content"
        :class="{
          'story-detail-panel__tab-content--finder-periods':
            activeTab === 'periods' && ((story.periods?.length ?? 0) > 0 || showExternalInFinder),
          'story-detail-panel__tab-content--finder-events':
            activeTab === 'events' && (story.events?.length ?? 0) > 0,
        }"
      >

        <!-- Périodes -->
        <template v-if="activeTab === 'periods'">
          <div class="story-detail-panel__tab-panel">
            <FilterBar
              hide-title
              hide-add
              v-model:search="periodHeaderSearch"
              v-model:category-id="periodFilterCategoryId"
              :category-options="storyPeriodCategoryFilterOptions"
              :suggestions="periodSearchSuggestions"
              :search-loading="periodSearchLoading"
              :search-error="periodSearchError"
              @retry-search="retryPeriodSearch"
              :allow-wikidata-create="false"
              @add="openPeriodCreator(0)"
              @pick-period="handleStoryPeriodSearchPick"
            >
              <template #actions>
                <span class="story-finder-activity">
                  <span class="sr-only" role="status">{{ finderLoading ? 'Recherche des sous-périodes…' : '' }}</span>
                  <button v-if="finderLoading" type="button" class="story-finder-activity__cancel" aria-label="Annuler la recherche des sous-périodes" @click="cancelFinder">
                    <span class="story-finder-activity__spinner" aria-hidden="true"></span>
                    <span class="sr-only">Annuler</span>
                  </button>
                </span>
                <Switch
                  variant="sm"
                  label-first
                  :model-value="showExternalInFinder"
                  label="Périodes additionnelles"
                  @update:model-value="onShowExternalChange"
                />
              </template>
            </FilterBar>
          <div v-if="finderError" class="story-finder-feedback" role="alert">
            {{ finderError }}
            <button type="button" @click="retryFinder">Réessayer</button>
            <button type="button" @click="cancelFinder">Annuler</button>
          </div>
          <div v-if="periodImportError && !periodImportDraft" class="story-finder-feedback" role="alert">
            {{ periodImportError }} <button type="button" :disabled="periodImportBusy" @click="retryPeriodImport">Réessayer</button>
          </div>
          <template v-if="story.periods?.length || showExternalInFinder">
            <div class="story-detail-panel__finder-columns-wrap">
              <div class="finder-columns">
                <div
                  v-for="(col, colIdx) in finderDisplayColumnsFiltered"
                  :key="colIdx"
                  class="finder-column"
                >
                  <div class="finder-column-header story-column-header">
                    <div class="story-column-header__title">
                      <h2>{{ finderColumnHeader(colIdx) }}</h2>
                      <Button v-if="colIdx === 0" class="story-column-header__root-action" variant="tertiary" size="xs" :disabled="panelBusy" @click="showRootPicker = true">Changer la racine</Button>
                    </div>
                    <div class="story-column-header__actions">
                      <Button variant="tertiary" size="xs" :disabled="panelBusy || (colIdx > 0 && !storyPeriodIds.includes(finderSelectedPath[colIdx - 1] ?? ''))" :title="colIdx > 0 && !storyPeriodIds.includes(finderSelectedPath[colIdx - 1] ?? '') ? 'Ajoutez d’abord cette période à la frise.' : undefined" @click="openChildStoryPicker(colIdx)">Ajouter une frise</Button>
                      <Button variant="tertiary" size="xs" :disabled="panelBusy || (colIdx > 0 && finderSelectedPath[colIdx - 1]?.startsWith('wikidata:'))" :title="colIdx > 0 && finderSelectedPath[colIdx - 1]?.startsWith('wikidata:') ? 'Importez d’abord la période parente.' : undefined" @click="openPeriodCreator(colIdx)">Ajouter une période</Button>
                    </div>
                  </div>
                  <div class="finder-column-content">
                    <template v-if="col.length > 0 || childStoriesForColumn(colIdx).length > 0">
                      <FinderItem
                        v-for="row in col"
                        :key="row.item.id"
                        :label="storyPeriodLabelForFinder(row.item)"
                        :start-date="storyPeriodDateFields(row.item).startDate"
                        :end-date="storyPeriodDateFields(row.item).endDate"
                        :categories="storyPeriodCategories(row.item)"
                        :selected="selectedPeriodId === row.item.id"
                        :has-children="finderRowHasChildren(row.item, row.inStory)"
                        :item-id="row.item.id"
                        :draggable="false"
                        :is-external-catalog="!row.inStory"
                        :wikidata-only="row.item.id.startsWith('wikidata:')"
                        hide-row-action
                        @click="onFinderPeriodSelect(row.item, colIdx)"
                      >
                        <template #actions>
                          <StoryItemActionsMenu v-if="row.inStory" :label="storyPeriodLabelForFinder(row.item).fr" :disabled="panelBusy"
                            @edit="emit('edit-period', row.item.id)" @remove="emit('remove-period', row.item.id)" />
                          <button
                            v-else
                            type="button"
                            class="finder-item-add"
                            :aria-label="row.item.id.startsWith('wikidata:') ? 'Importer depuis Wikidata' : 'Ajouter à la frise'"
                            :title="requiresParentImport(row.item) ? 'Ajoutez d’abord la période parente à la frise.' : undefined"
                            :disabled="panelBusy || requiresParentImport(row.item)"
                            @click.stop="onPeriodAction(row)"
                          >
                            <Icon icon="mdi:plus" width="14" height="14" aria-hidden="true" />
                          </button>
                        </template>
                      </FinderItem>
                      <AnchoredStoryRow v-for="cs in childStoriesForColumn(colIdx)" :key="cs.id" :story="cs" :summary="childStorySummary(cs.id)" :disabled="panelBusy" @remove="emit('remove-child-story', cs.id)" />

                    </template>
                    <div v-else class="finder-empty-column">
                      <template v-if="colIdx === 0">Aucune racine</template>
                      <template v-else>Aucune sous-période</template>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <div v-else-if="!finderLoading && !finderError" class="finder-empty-column">Aucune période associée <Button variant="tertiary" size="xs" :disabled="panelBusy" @click="showRootPicker = true">Choisir la racine</Button></div>
          </div>
        </template>

        <!-- Événements -->
        <template v-else-if="activeTab === 'events'">
          <div class="story-detail-panel__tab-panel">
            <FilterBar
              mode="events"
              hide-title
              hide-add
              v-model:search="eventHeaderSearch"
              v-model:category-id="eventFilterCategoryId"
              :category-options="storyEventCategoryFilterOptions"
              :event-suggestions="eventSearchSuggestions"
              :search-loading="eventSearchLoading"
              :search-error="eventSearchError"
              @retry-search="retryEventSearch"
              @add="openEventCreator"
              @pick-event="handleStoryEventSearchPick"
            >
              <template #actions>
                <Switch variant="sm" label-first :model-value="showExternalInFinder" label="Périodes additionnelles" @update:model-value="onShowExternalChange" />
              </template>
            </FilterBar>
          <template v-if="story.events?.length">
            <div class="events-finder-layout">
              <!-- Colonne gauche : liste des événements -->
              <div class="events-finder-list">
                <FinderItem
                  v-for="event in eventsFilteredForList"
                  :key="event.id"
                  :label="event.label"
                  :selected="selectedEventId === event.id"
                  :has-children="false"
                  :item-id="event.id"
                  :start-date="event.date"
                  :date-subtitle-override="formatStoryEventDateLabel(event)"
                  :draggable="false"
                  hide-row-action
                  hide-chevron
                  @click="onStoryEventFinderRowClick(event.id)"
                >
                  <template #actions>
                    <StoryItemActionsMenu :label="event.label.fr" :disabled="panelBusy"
                      @edit="emit('edit-event', event.id)" @remove="emit('remove-event', event.id)" />
                  </template>
                </FinderItem>
              </div>

              <!-- Colonne droite : détail de l'événement sélectionné -->
              <div class="events-finder-detail">
                <template v-if="selectedEventId">
                  <template v-for="event in story.events.filter(e => e.id === selectedEventId)" :key="event.id">
                    <div class="event-detail-header">
                      <div class="event-detail-label">{{ event.label?.fr ?? event.label }}</div>
                      <div class="event-detail-date">{{ formatStoryEventDateLabel(event) }}</div>
                    </div>

                    <div class="event-detail-section">
                      <div class="event-detail-section-title">Frises associées</div>
                      <p class="event-detail-section-description">Elles servent à la redirection</p>
                      <AnchoredStoryRow v-for="cs in childStoriesAnchoredToEvent(event.id)" :key="cs.id" :story="cs" :summary="childStorySummary(cs.id)" :disabled="panelBusy" @remove="emit('remove-event-anchor', cs.id, event.id)" />

                      <div
                        v-if="childStoriesAnchoredToEvent(event.id).length === 0"
                        class="event-detail-empty"
                      > Aucune frise ancrée </div>

                      <Button variant="tertiary" size="xs" :disabled="panelBusy" @click="openChildStoryPicker(undefined, event.id)">Associer une frise</Button>
                      <!-- Sélecteur inline pour ajouter une ancre -->
                      <div v-if="childStoriesNotAnchoredToEvent(event.id).length > 0" class="event-anchor-add">
                        <button
                          v-if="!showAnchorPickerForEvent"
                          type="button"
                          class="finder-child-story-add"
                          @click="showAnchorPickerForEvent = event.id"
                        >
                          <Icon icon="mdi:plus" width="12" height="12" aria-hidden="true" /> Associer une frise liée </button>
                        <template v-else-if="showAnchorPickerForEvent === event.id">
                          <div class="event-anchor-picker">
                            <button type="button"
                              v-for="cs in childStoriesNotAnchoredToEvent(event.id)"
                              :key="cs.id"
                              class="event-anchor-picker-item"
                              @click="emit('add-event-anchor', cs.id, event.id); showAnchorPickerForEvent = null"
                            >
                              {{ cs.title.fr }}
                            </button>
                          </div>
                          <button type="button" class="event-anchor-cancel" @click="showAnchorPickerForEvent = null">
                            Annuler
                          </button>
                        </template>
                      </div>
                    </div>
                  </template>
                </template>
                <div v-else class="event-detail-placeholder">
                  Sélectionnez un événement
                </div>
              </div>
            </div>
          </template>
          <div v-else class="finder-empty-column">Aucun événement associé</div>
          </div>
        </template>

        <div v-else-if="activeTab === 'tags'" class="story-settings-panel">
          <h3>Tags de la frise</h3>
          <div class="story-tags"><span v-for="tag in story.categories" :key="tag.id" class="story-tag">{{ tag.label.fr }}</span></div>
          <p v-if="!story.categories.length">Aucun tag associé à cette frise.</p>
          <Button variant="tertiary" size="sm" @click="emit('edit-story')">Modifier les tags</Button>
        </div>
        <div v-else-if="activeTab === 'settings'" class="story-settings-panel">
          <h3>Paramètres de la frise</h3>
          <dl><dt>Titre</dt><dd>{{ story.title.fr }}</dd><dt>Auteur</dt><dd>{{ story.author }}</dd><dt>Visibilité</dt><dd>{{ story.isPublic ? 'Publique' : 'Privée' }}</dd></dl>
          <Button variant="tertiary" size="sm" @click="emit('edit-story')">Modifier la frise</Button>
        </div>

      </div>
      </div>
    </template>

    <EditModal v-if="periodImportDraft" :is-open="true" type="period" mode="create" :data="periodImportDraft"
      :loading="periodImportBusy" :error="periodImportError" allow-existing-periods :search-bounds="storySearchBounds" :excluded-period-ids="periodCreationExcludedIds"
      @close="closePeriodImport" @submit="submitPeriodImport" @select-period="selectExistingStoryPeriod" />
    <!-- Modales de sélection -->
    <RootPeriodModal v-if="showRootPicker" :current-root-id="firstStoryRootPeriodId" :current-root-label="story?.periods.find(p => p.id === firstStoryRootPeriodId)?.label.fr" :busy="panelBusy" :error="error" @close="showRootPicker = false" @confirm="onChangeRoot" />
    <EditModal v-if="eventCreationDraft" :is-open="true" type="event" mode="create" :data="eventCreationDraft"
      :loading="eventCreationBusy" :error="eventCreationError" allow-existing-events :search-bounds="storySearchBounds" :excluded-event-ids="storyEventIds"
      @close="closeEventCreator" @submit="submitEventCreation" @select-event="selectExistingStoryEvent" />
    <StoryRelatedPickerModal
      v-if="showChildStoryPicker && story"
      :exclude-story-ids="childStoryPickerExcludeIds"
      @close="showChildStoryPicker = false"
      @confirm="onAddChildStories"
    />
  </div>
</template>

<script setup lang="ts">
import { resolveYearsBeforePresent } from '@temporal';
import { ref, computed, watch } from 'vue';
import { getStoryPeriodParentId } from '@/lib/storyPeriodParent';
import { storeToRefs } from 'pinia';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import RootPeriodModal from './RootPeriodModal.vue';
import StoryItemActionsMenu from './StoryItemActionsMenu.vue';
import EditModal from './EditModal.vue';
import { useStoryWikidataPeriodImport } from '@/composables/useStoryWikidataPeriodImport';
import AnchoredStoryRow from './AnchoredStoryRow.vue';
import Tabs from '@/components/base/Tabs.vue';
import Switch from '@/components/base/Switch.vue';
import StoryTimeline from '@/components/StoryTimeline.vue';
import FinderItem from '@/views/GraphView/FinderItem.vue';
import FilterBar from "@/components/FilterBar.vue";
import { useDataStore } from '@/stores/useDataStore';
import { useStoryEventCreation } from '@/composables/useStoryEventCreation';
import StoryRelatedPickerModal from './StoryRelatedPickerModal.vue';
import { formatStoryEventDateLabel } from '@/lib/formatTemporalBoundLabel';
import { useToast } from '@/composables/useToast';
import { useDebouncedSearch } from '@/composables/useDebouncedSearch';
import { useStoryPeriodFinder } from '@/composables/useStoryPeriodFinder';
import { localSearchHitToPeriod, localSearchHitToEvent } from '@/lib/searchHitEntities';
import { SearchApiService } from '@/services/SearchApiService';
import {
  compareStoryPeriodsByStartOldestFirst,
  getGlobalChildrenNotInStory,
  getStoryPeriodRoots,
  buildStoryFinderPathFromSelectedPeriodId,
  getStoryPeriodChildren,
  listPeriodToStoryPeriodInput,
  storyPeriodLabelForFinder,
  storyPeriodDateFields,
  storyPeriodCategories,
  storyPeriodHasChildrenInStory,
} from '@/lib/storyPeriodFinderColumns';
import type { Story, StoryAnchor, ChildStorySummary, ListEvent, ListPeriod } from '@/types/database';
import type { StoryPeriodInput } from '@/types/periodTree';

const toast = useToast();

const props = defineProps<{
  story?: Story | null;
  loading?: boolean;
  updating?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: 'retry'): void;
  (e: 'period-imported'): void;
  (e: 'remove-period', id: string): void;
  (e: 'edit-period', id: string): void;
  (e: 'edit-event', id: string): void;
  (e: 'remove-event', id: string): void;
  (e: 'add-periods', ids: string[], parentPeriodId?: string | null): void;
  (e: 'event-added'): void;
  (e: 'add-child-stories', ids: string[], anchor?: StoryAnchor): void;
  (e: 'change-root', id: string): void;
  (e: 'edit-story'): void;
  (e: 'toggle-public'): void;
  (e: 'remove-child-story', id: string): void;
  (e: 'add-event-anchor', childStoryId: string, eventId: string): void;
  (e: 'remove-event-anchor', childStoryId: string, eventId: string): void;
}>();

const {
  draft: periodImportDraft, busy: periodImportBusy, error: periodImportError,
  open: importWikidataPeriod, openCreate: createStoryPeriod, selectExisting: selectExistingStoryPeriod, close: closePeriodImport, submit: submitPeriodImport, retry: retryPeriodImport,
} = useStoryWikidataPeriodImport(() => props.story, () => emit('period-imported'));
const {
  draft: eventCreationDraft, busy: eventCreationBusy, error: eventCreationError,
  open: openEventCreator, close: closeEventCreator, submit: submitEventCreation, selectExisting: selectExistingStoryEvent,
} = useStoryEventCreation(() => props.story, () => emit('event-added'));
const panelBusy = computed(() => props.updating || periodImportBusy.value || eventCreationBusy.value);
const showRootPicker = ref(false);
const periodCreationParentId = ref<string | null>(null);
const childStoryAnchor = ref<StoryAnchor>();
function openPeriodCreator(colIdx: number) { periodCreationParentId.value = finderSelectedPath.value[colIdx - 1] ?? null; createStoryPeriod(periodCreationParentId.value); }
function onChangeRoot(id: string) { requestedRootId.value = id; emit('change-root', id); }
const requestedRootId = ref<string | null>(null);
function childStorySummary(id: string) { return dataStore.stories.find(s => s.id === id); }
/** ID d'event pour lequel le sélecteur d'ancrage est ouvert (null = fermé). */
const showAnchorPickerForEvent = ref<string | null>(null);
const {
  additionalPeriods: wikidataPeriods, selectedId: selectedPeriodId, path: finderSelectedPath, showExternal: showExternalInFinder,
  loading: finderLoading, error: finderError, retry: retryFinder, cancel: cancelFinder,
  clear: clearPeriodSelection, pick: pickPeriod, selectRow: selectPeriodRow, toggleExternal: onShowExternalChange,
} = useStoryPeriodFinder(() => props.story);
const selectedEventId = ref<string | null>(null);
const activeTab = ref<'periods' | 'events' | 'tags' | 'settings'>('periods');

const periodHeaderSearch = ref('');
const periodFilterCategoryId = ref('');

const eventHeaderSearch = ref('');
const eventFilterCategoryId = ref('');

const dataStore = useDataStore();
const { periods: storePeriods } = storeToRefs(dataStore);
const finderPeriods = computed(() => [...storePeriods.value.filter(p => !p.id.startsWith('wikidata:')), ...wikidataPeriods.value]);
function requiresParentImport(item: StoryPeriodInput) {
  return item.id.startsWith('wikidata:') && (!item.parentId || item.parentId.startsWith('wikidata:'));
}
function onPeriodAction(row: FinderColumnRow) {
  if (panelBusy.value) return;
  if (row.item.id.startsWith('wikidata:')) {
    const period = wikidataPeriods.value.find(p => p.id === row.item.id && p.parentId === row.item.parentId);
    if (period) { periodCreationParentId.value = period.parentId ?? null; void importWikidataPeriod(period); }
  } else emit('add-periods', [row.item.id], getStoryPeriodParentId(row.item));
}

const storyContentTabs = computed(() => [
  { label: 'Périodes', value: 'periods' as const },
  { label: 'Événements', value: 'events' as const },
  { label: 'Tags', value: 'tags' as const },
  { label: 'Settings', value: 'settings' as const },
]);

const storySearchBounds = computed(() => {
  const values = (props.story?.periods ?? []).flatMap(period => [resolveYearsBeforePresent(period.startDate, period.startYearsBP), resolveYearsBeforePresent(period.endDate, period.endYearsBP)]).filter((value): value is number => value !== null);
  return values.length ? { start: Math.max(...values), end: Math.min(...values) } : null;
});

const storyPeriodIds = computed(() => (props.story?.periods ?? []).map((p) => p.id));

const periodCreationExcludedIds = computed(() => {
  const periods = props.story?.periods ?? [];
  const parentId = periodCreationParentId.value;
  const existing = parentId ? getStoryPeriodChildren(periods, parentId) : getStoryPeriodRoots(periods);
  return [...new Set([...existing.map(period => period.id), ...buildStoryFinderPathFromSelectedPeriodId(periods, parentId)])];
});

const firstStoryRootPeriodId = computed<string | null>(() => {
  const periods = (props.story?.periods ?? []) as StoryPeriodInput[];
  const ids = new Set(periods.map((p) => p.id));
  const root = periods.find((p) => {
    const pid = getStoryPeriodParentId(p);
    return !pid || !ids.has(String(pid));
  });
  return root?.id ?? null;
});
watch(firstStoryRootPeriodId, id => { if (id && id === requestedRootId.value) { showRootPicker.value = false; clearPeriodSelection(); requestedRootId.value = null; } });
const storyEventIds = computed(() => (props.story?.events ?? []).map((e) => e.id));

type FinderColumnRow = { item: StoryPeriodInput; inStory: boolean };

const finderDisplayColumns = computed<FinderColumnRow[][]>(() => {
  const story = (props.story?.periods ?? []) as StoryPeriodInput[];
  const path = finderSelectedPath.value;
  const storyIdSet = new Set(story.map((p) => p.id));
  const all = finderPeriods.value;
  const n = path.length + 1;
  const cols: FinderColumnRow[][] = [];

  for (let c = 0; c < n; c++) {
    let storySlice =
      c === 0 ? getStoryPeriodRoots(story) : getStoryPeriodChildren(story, path[c - 1]!);
    // An associated descendant reached through an additional period stays in that column.
    if (showExternalInFinder.value && c === 0) {
      storySlice = storySlice.filter(period => !path.includes(period.id) || path[0] === period.id);
    }
    let rows: FinderColumnRow[] = storySlice.map((item) => ({ item, inStory: true }));

    if (showExternalInFinder.value && c > 0) {
      const extraList = getGlobalChildrenNotInStory(all, path[c - 1]!, storyIdSet);
      const seen = new Set(rows.map((r) => r.item.id));
      for (const lp of extraList) {
        const item = listPeriodToStoryPeriodInput(lp);
        if (!seen.has(item.id) && !path.slice(0, c).includes(item.id)) {
          rows.push({ item, inStory: false });
          seen.add(item.id);
        }
      }
      rows = rows.slice().sort((a, b) => compareStoryPeriodsByStartOldestFirst(a.item, b.item));
    }
    cols.push(rows);
  }
  return cols;
});

const storyPeriodCategoryFilterOptions = computed(() => {
  const map = new Map<string, { id: string; label: { fr: string; en: string } }>();
  for (const p of props.story?.periods ?? []) {
    for (const cat of p.categories ?? []) {
      if (!map.has(cat.id)) map.set(cat.id, cat as { id: string; label: { fr: string; en: string } });
    }
  }
  const rest = [...map.values()]
    .sort((a, b) => a.label.fr.localeCompare(b.label.fr, 'fr', { sensitivity: 'base' }))
    .map((c) => ({ value: c.id, label: c.label.fr }));
  return [{ value: '', label: 'Toutes les catégories' }, ...rest];
});

const storyEventCategoryFilterOptions = computed(() => {
  const map = new Map<string, { id: string; label: { fr: string; en: string } }>();
  for (const ev of props.story?.events ?? []) {
    for (const cat of ev.categories ?? []) {
      if (!map.has(cat.id)) map.set(cat.id, cat as { id: string; label: { fr: string; en: string } });
    }
  }
  const rest = [...map.values()]
    .sort((a, b) => a.label.fr.localeCompare(b.label.fr, 'fr', { sensitivity: 'base' }))
    .map((c) => ({ value: c.id, label: c.label.fr }));
  return [{ value: '', label: 'Toutes les catégories' }, ...rest];
});

function periodRowMatchesCategory(row: FinderColumnRow, categoryId: string): boolean {
  if (!categoryId) return true;
  const cats = storyPeriodCategories(row.item);
  return cats?.some((c) => c.id === categoryId) ?? false;
}

const finderDisplayColumnsFiltered = computed(() => {
  const catId = periodFilterCategoryId.value;
  const cols = finderDisplayColumns.value;
  if (!catId) return cols;
  return cols.map((col) => col.filter((row) => periodRowMatchesCategory(row, catId)));
});

const eventsFilteredForList = computed(() => {
  const catId = eventFilterCategoryId.value;
  const evs = props.story?.events ?? [];
  if (!catId) return evs;
  return evs.filter((e) => e.categories?.some((c) => c.id === catId) ?? false);
});

const { results: periodSearchSuggestions, loading: periodSearchLoading, error: periodSearchError, retry: retryPeriodSearch } = useDebouncedSearch(
  () => periodHeaderSearch.value,
  async (query, signal) => {
    const hits = await SearchApiService.getInstance().searchLocal(query, { onlyPeriods: true, categoryId: periodFilterCategoryId.value || undefined, signal });
    return hits.filter(hit => hit.type === 'period').map(localSearchHitToPeriod);
  },
  { minLength: 1, delayMs: 250, criteria: () => [props.story?.id, periodFilterCategoryId.value], enabled: () => !!props.story && !props.loading && !props.error && activeTab.value === 'periods' },
);
const { results: eventSearchSuggestions, loading: eventSearchLoading, error: eventSearchError, retry: retryEventSearch } = useDebouncedSearch(
  () => eventHeaderSearch.value,
  async (query, signal) => {
    const hits = await SearchApiService.getInstance().searchLocal(query, { onlyEvents: true, categoryId: eventFilterCategoryId.value || undefined, signal });
    return hits.filter(hit => hit.type === 'event').map(localSearchHitToEvent);
  },
  { minLength: 1, delayMs: 250, criteria: () => [props.story?.id, eventFilterCategoryId.value], enabled: () => !!props.story && !props.loading && !props.error && activeTab.value === 'events' },
);

watch([periodHeaderSearch, periodFilterCategoryId, activeTab, () => props.loading, () => props.error], cancelFinder, { flush: 'sync' });

watch(
  () => [eventFilterCategoryId.value, props.story?.events?.length ?? 0] as const,
  () => {
    const sid = selectedEventId.value;
    if (!sid) return;
    if (!eventsFilteredForList.value.some((e) => e.id === sid)) {
      selectedEventId.value = null;
    }
  },
);

async function handleStoryPeriodSearchPick(period: ListPeriod) {
  periodHeaderSearch.value = '';
  selectedEventId.value = null;
  activeTab.value = 'periods';
  await pickPeriod(period);
}

function handleStoryEventSearchPick(ev: ListEvent) {
  eventHeaderSearch.value = '';
  activeTab.value = 'events';
  clearPeriodSelection();

  const inStory = (props.story?.events ?? []).some((e) => e.id === ev.id);
  if (inStory) {
    selectedEventId.value = ev.id;
    return;
  }
  toast.show(
    "Cet événement n'est pas associé à cette frise. Utilisez « Ajouter un événement » pour l'ajouter.",
    'info',
  );
}

function finderColumnHeader(colIdx: number): string {
  if (colIdx === 0) return 'Périodes racines';
  const parentId = finderSelectedPath.value[colIdx - 1];
  const fromStory = (props.story?.periods ?? []).find((x) => x.id === parentId);
  if (fromStory) return storyPeriodLabelForFinder(fromStory).fr || 'Sous-périodes';
  const fromStore = finderPeriods.value.find((p) => p.id === parentId);
  return fromStore?.label?.fr || 'Sous-périodes';
}

function finderRowHasChildren(item: StoryPeriodInput, inStory: boolean): boolean {
  if (inStory && !showExternalInFinder.value) {
    return storyPeriodHasChildrenInStory((props.story?.periods ?? []) as StoryPeriodInput[], item.id);
  }
  const p = finderPeriods.value.find(p => p.id === item.id) ?? props.story?.periods.find(period => period.id === item.id);
  if (p?.hasChildren) return true;
  return finderPeriods.value.some((x) => x.parentId === item.id);
}

watch(() => props.story?.id, () => {
  periodHeaderSearch.value = ''; periodFilterCategoryId.value = '';
  eventHeaderSearch.value = ''; eventFilterCategoryId.value = '';
  selectedEventId.value = null;
  showRootPicker.value = false;
  showAnchorPickerForEvent.value = null; showChildStoryPicker.value = false;
}, { flush: 'sync' });

function onFinderPeriodSelect(period: StoryPeriodInput, colIdx: number) {
  selectedEventId.value = null;
  void selectPeriodRow(period.id, colIdx);
}

function onTimelineSelectPeriod(id: string) {
  if (selectedPeriodId.value === id) clearPeriodSelection();
  else {
    const period = props.story?.periods.find(p => p.id === id);
    if (period) { activeTab.value = 'periods'; void pickPeriod(period); }
  }
  selectedEventId.value = null;
}

function onTimelineSelectEvent(id: string) {
  selectedEventId.value = selectedEventId.value === id ? null : id;
  clearPeriodSelection();
  activeTab.value = 'events';
  showAnchorPickerForEvent.value = null;
}

function onStoryEventFinderRowClick(eventId: string) {
  selectedEventId.value = selectedEventId.value === eventId ? null : eventId;
  clearPeriodSelection();
}

const showChildStoryPicker = ref(false);


const childStoryPickerExcludeIds = computed(() => {
  const s = props.story;
  if (!s) return [];
  return [s.id, ...(s.childStories ?? []).map((cs) => cs.id)];
});

function openChildStoryPicker(colIdx?: number, eventId?: string) {
  const periodId = colIdx === undefined ? undefined : finderSelectedPath.value[colIdx - 1];
  childStoryAnchor.value = eventId ? { type: 'event', id: eventId } : periodId ? { type: 'period', id: periodId } : undefined;
  showChildStoryPicker.value = true;
}

function onAddChildStories(ids: string[]) {
  showChildStoryPicker.value = false;
  if (ids.length) emit('add-child-stories', ids, childStoryAnchor.value);
}

/**
 * Retourne les stories enfants à afficher dans la colonne `colIdx`.
 * Colonne 0 (racine) : stories sans ancre de type period.
 * Colonne N : stories qui ont une ancre period = finderSelectedPath[N-1].
 */
/** Stories enfants déjà ancrées à un événement donné. */
function childStoriesAnchoredToEvent(eventId: string): ChildStorySummary[] {
  return (props.story?.childStories ?? []).filter(cs =>
    cs.anchors.some(a => a.type === 'event' && a.id === eventId)
  );
}

/** Stories enfants NON encore ancrées à un événement donné. */
function childStoriesNotAnchoredToEvent(eventId: string): ChildStorySummary[] {
  return (props.story?.childStories ?? []).filter(cs =>
    !cs.anchors.some(a => a.type === 'event' && a.id === eventId)
  );
}

function childStoriesForColumn(colIdx: number): ChildStorySummary[] {
  const children = props.story?.childStories ?? [];
  if (colIdx === 0) {
    return children.filter(cs => !cs.anchors.some(a => a.type === 'period'));
  }
  const periodId = finderSelectedPath.value[colIdx - 1] ?? null;
  if (!periodId) return [];
  return children.filter(cs => cs.anchors.some(a => a.type === 'period' && a.id === periodId));
}

</script>

<style scoped>
.story-finder-feedback { padding: var(--spacing-sm) var(--spacing-md); color: var(--color-text); }
.story-finder-feedback button { margin-left: var(--spacing-sm); }
.story-finder-activity { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex: 0 0 20px; }
.story-finder-activity__cancel { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; padding: 2px; border: 0; border-radius: var(--radius-sm); background: transparent; cursor: pointer; }
.story-finder-activity__cancel:focus-visible { outline: 2px solid var(--color-border-focus); }
.story-finder-activity__spinner { width: 14px; height: 14px; border: 2px solid var(--color-border); border-top-color: var(--color-primary); border-radius: 50%; animation: story-finder-spin 1s linear infinite; }
@keyframes story-finder-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .story-finder-activity__spinner { animation: none; } }

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

/* ─── Tab bar ─────────────────────────────────────────────────────────────────── */

.story-detail-panel__tabs-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding-right: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.story-detail-panel__tabs {
  flex: 1;
  min-width: 0;
}

.story-detail-panel__scroll-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  padding-bottom: 128px;
}

.story-detail-panel__tab-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.story-detail-panel__tab-panel .story-detail-panel__finder-columns-wrap,
.story-detail-panel__tab-panel .events-finder-layout {
  flex: 1;
  min-height: 0;
}

.story-detail-panel__finder-columns-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.story-detail-panel__finder-columns-wrap .finder-columns {
  flex: 1;
  min-height: 0;
}

/* ─── Contenu du tab ──────────────────────────────────────────────────────────── */

.story-detail-panel__tab-content {
  flex: 1 0 auto;
  min-height: 0;
}

.story-detail-panel__tab-content--finder-periods,
.story-detail-panel__tab-content--finder-events {
  flex: 1 0 clamp(320px, 60dvh, 560px);
  min-height: clamp(320px, 60dvh, 560px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.finder-empty-column {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  font-style: italic;
}

/* ─── Layout deux colonnes onglet événements ──────────────────────────────── */

.events-finder-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.events-finder-list {
  overflow-y: auto;
  min-height: 0;
  border-right: 1px solid var(--color-border);
  padding: 0;
  background: var(--color-surface);
}

.events-finder-detail {
  overflow-y: auto;
  min-height: 0;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  background: var(--color-surface);
}

.event-detail-header {
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
}

.event-detail-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
}

.event-detail-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  margin-top: 2px;
}

.event-detail-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.event-detail-section-title {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-light);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: var(--spacing-xs);
}

.event-detail-empty {
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  font-style: normal;
}

.event-detail-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  font-style: italic;
}

.event-anchor-add {
  margin-top: var(--spacing-xs);
}

.event-anchor-picker {
  display: flex;
  flex-direction: column;
  gap: 2px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: var(--spacing-xs);
}

.event-anchor-picker-item {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.event-anchor-picker-item:hover {
  background-color: var(--color-neutral-100);
  color: var(--color-primary);
}

.event-anchor-cancel {
  background: none;
  border: none;
  padding: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  cursor: pointer;
  text-decoration: underline;
}

.event-anchor-cancel:hover {
  color: var(--color-text);
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

.story-detail-panel { min-width: 0; }
.story-detail-panel__meta { border-bottom: 0; min-height: 64px; background: var(--color-surface); align-items: flex-start; }
.story-detail-panel__meta-actions { display: flex; gap: var(--spacing-sm); align-items: center; flex-shrink: 0; }
.story-detail-panel__title { font-size: var(--font-size-lg); line-height: var(--line-height-heading); }
.story-detail-panel__desc { line-height: var(--line-height-small); }
.story-detail-panel__tabs-bar { background: var(--color-surface); }
.story-detail-panel__tabs :deep(.tab-button) { padding: 12px 16px; }
.story-column-header { flex-direction: column; align-items: stretch; gap: var(--spacing-sm); height: 80px; flex-shrink: 0; }
.story-column-header__title { display: flex; align-items: center; gap: var(--spacing-sm); min-width: 0; min-height: 20px; }
.story-column-header__title h2 { flex: 1; }
.story-column-header__root-action { height: 20px; min-height: 20px; padding: 0 4px; font-size: var(--font-size-xs); flex-shrink: 0; }
.story-column-header__actions { display: flex; gap: var(--spacing-sm); }
.story-column-header__actions .base-button { flex: 1; min-width: 0; }
.story-column-header__actions :deep(.base-button__text) { padding-inline: 3px; }
.story-detail-panel__tab-panel :deep(.filter-bar) { padding: 12px; background: var(--color-surface); min-height: 54px; }
.story-detail-panel__tab-panel :deep(.filter-bar__search-wrap) { width: 256px; flex: 0 1 256px; }
.story-detail-panel__tab-panel :deep(.filter-bar__select) { width: 240px; flex: 0 1 240px; }
.story-detail-panel__tab-panel :deep(.filter-bar__slot-actions) { margin-left: auto; }
.story-detail-panel :deep(.finder-empty-column) { font-style: normal; opacity: 1; }
.event-detail-label { font-size: var(--font-size-lg); line-height: var(--line-height-heading); }
.event-detail-date { line-height: var(--line-height-micro); }
.event-detail-section-title { font-size: var(--font-size-base); font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--color-text); margin-bottom: 0; }
.event-detail-section-description { font-size: var(--font-size-sm); line-height: var(--line-height-small); color: var(--color-text-secondary); margin: 0 0 12px; }
.event-detail-section { align-items: stretch; gap: 4px; }
.event-detail-section > .base-button { align-self: flex-start; margin-top: 12px; }
.story-settings-panel { padding: 24px; background: var(--color-surface); min-height: 100%; }
.story-settings-panel h3 { font-size: var(--font-size-lg); }
.story-settings-panel dl { display: grid; grid-template-columns: 100px minmax(0,1fr); gap: 8px 16px; margin-bottom: 24px; }
.story-settings-panel dt { color: var(--color-text-secondary); }
.story-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.story-tag { padding: 4px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
@media (max-width: 1000px) { .story-detail-panel__meta { flex-wrap: wrap; } .story-detail-panel__meta-actions { flex-wrap: wrap; } }
@media (max-width: 600px) { .story-detail-panel__meta-actions { width: 100%; } .events-finder-layout { grid-template-columns: 160px minmax(0,1fr); } .story-detail-panel__tab-panel :deep(.filter-bar__search-wrap), .story-detail-panel__tab-panel :deep(.filter-bar__select) { width: 100%; } }

.story-detail-panel__tab-panel :deep(.filter-bar__filters) { flex: 0 1 504px; }
@media (max-width: 640px) { .story-detail-panel__tab-panel :deep(.filter-bar__filters) { flex: 1 1 100%; } }
.story-detail-panel :deep(.finder-item.selected) { background: var(--color-interaction-selected); color: var(--color-text-on-selected); border-left-color: var(--color-border-focus); }
.story-detail-panel :deep(.finder-item.selected .finder-item-content), .story-detail-panel :deep(.finder-item.selected .finder-item-title), .story-detail-panel :deep(.finder-item.selected .finder-item-dates) { color: var(--color-text-on-selected); }
.story-detail-panel :deep(.finder-item.selected .finder-item-remove), .story-detail-panel :deep(.finder-item.selected .finder-item-add) { background: transparent; color: var(--color-text-on-selected); }

</style>
