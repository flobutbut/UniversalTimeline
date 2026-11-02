<template>
  <div class="period-grid" :aria-busy="loading || undefined">
    <!-- Garder le niveau courant affiché pendant une navigation ou une recherche de stories. -->
    <FeedbackState v-if="loading && !currentPeriod && periods.length === 0 && events.length === 0" kind="loading" message="Chargement de la timeline…" />
    <FeedbackState v-else-if="error" kind="error" :message="error" />
    <FeedbackState v-else-if="!loading && !currentPeriod && periods.length === 0 && events.length === 0" message="Aucune période à afficher" />
    <div v-else class="timeline-container">
      <div class="periods-container">
        <PeriodCard
          v-if="props.currentPeriod"
          ref="parentBarRef"
          variant="parent"
          :period="props.currentPeriod"
          :is-selected="false"
          :aria-describedby="tooltipPeriod?.id === props.currentPeriod.id ? tooltipId : undefined"
          @back="goBack"
          @mouseenter="periodDetails.enter(props.currentPeriod.id)"
          @mousemove="periodDetails.move(props.currentPeriod.id)"
          @mouseleave="periodDetails.leave(props.currentPeriod.id)"
          @focusin="periodDetails.focus(props.currentPeriod.id)"
          @focusout="periodDetails.blur(props.currentPeriod.id)"
          @keydown.esc.stop="periodDetails.reset()"
        >
          <template #title-actions>
            <AssociatedStoriesBadge v-if="props.currentPeriod" :story-id="currentStoryId" :period-id="props.currentPeriod.id" :period-label="props.currentPeriod.label.fr || props.currentPeriod.label.en"
              :stories="associatedByPeriod.get(props.currentPeriod.id) ?? []" :loading="associationsLoading" :error="associationsError" :disabled="loading"
              @retry="retryAssociations" @select="emit('story-select', $event)" />
          </template>
        </PeriodCard>
        <div ref="periodRowRef" class="period-row" :style="{ height: `${periodRowHeight}px` }">
          <PeriodCard
            v-for="(period, i) in sortedPeriods"
            :key="period.id"
            :ref="(el: any) => setPeriodRef(el, period.id)"
            :period="period"
            :is-selected="false"
            class="timeline-card period-grid__period-position"
            :expanded="activePeriodId === period.id"
            :wrap-content="activePeriodId === period.id && wrapContent"
            :style="{ ...getPeriodCssVars(period), '--enter-delay': `${i * 25}ms` }"
            @select="selectPeriod"
            :aria-describedby="tooltipPeriod?.id === period.id ? tooltipId : undefined"
            @mouseenter="periodDetails.enter(period.id)"
            @mousemove="periodDetails.move(period.id)"
            @mouseleave="periodDetails.leave(period.id)"
            @focusin="periodDetails.focus(period.id)"
            @focusout="periodDetails.blur(period.id)"
            @keydown.esc.stop="periodDetails.reset()"
          >
            <template #title-actions>
              <AssociatedStoriesBadge :story-id="currentStoryId" :period-id="period.id" :period-label="period.label.fr || period.label.en"
                :stories="associatedByPeriod.get(period.id) ?? []" :loading="associationsLoading" :error="associationsError" :disabled="loading"
                @retry="retryAssociations" @select="emit('story-select', $event)" />
            </template>
          </PeriodCard>
        </div>
      </div>
      <div class="timeline-line"></div>
      <div v-if="undatedPeriods.length" class="period-grid__undated">
        <span>Dates non déterminées</span>
        <span v-for="period in undatedPeriods" :key="`p:${period.id}`" class="period-grid__undated-item">
          <Button variant="tertiary" size="xs" type="button" @click="selectPeriod(period)">{{ period.label.fr }}</Button>
          <AssociatedStoriesBadge :story-id="currentStoryId" :period-id="period.id" :period-label="period.label.fr || period.label.en"
            :stories="associatedByPeriod.get(period.id) ?? []" :loading="associationsLoading" :error="associationsError" :disabled="loading"
            @retry="retryAssociations" @select="emit('story-select', $event)" />
        </span>
      </div>
      <Teleport to="body">
        <div
          v-if="tooltipPeriod"
          :id="tooltipId"
          ref="tooltipElement"
          role="tooltip"
          class="period-grid__tooltip"
          :style="tooltipStyle"
        >
          <strong>{{ tooltipPeriod.label.fr || tooltipPeriod.label.en }}</strong>
          <span v-if="tooltipDateRange">{{ tooltipDateRange }}</span>
          <p v-if="tooltipDescription" class="period-grid__tooltip-description">{{ tooltipDescription }}</p>
          <small v-if="tooltipHint" class="period-grid__tooltip-hint">{{ tooltipHint }}</small>
        </div>
        <template v-if="props.storySuggestions.length > 0 && dropdownRect">
          <div class="story-dropdown-backdrop" @click="goBack" />
          <PopoverSurface padded class="story-dropdown" :style="dropdownStyle">
            <p class="story-dropdown__label">Explorer en détail</p>
            <button
              v-for="s in props.storySuggestions"
              :key="s.id"
              class="story-dropdown__item"
              @click="emit('story-select', s.id)"
            >
              <span class="story-dropdown__item-title">{{ s.title.fr }}</span>
              <span v-if="s.description" class="story-dropdown__item-desc">{{ s.description.fr }}</span>
              <span class="story-dropdown__item-arrow" aria-hidden="true">→</span>
            </button>
          </PopoverSurface>
        </template>
      </Teleport>
      <div class="events-container" @click="selectedEvent = null">
        <span v-if="undatedEvents.length" class="period-grid__undated-label">Événements sans date déterminée</span>
        <EventCard
          v-for="event in events"
          :key="event.id"
          :event="event"
          :undated="listEventYearsBP(event) === null"
          :is-selected="selectedEvent?.id === event.id"
          :is-category-active="isCategoryActive(event)"
          :card-style="getEventStyles(event)"
          :align="getEventAlign(event)"
          :other-story-count="otherStoryCount(event.id)"
          :story-suggestions="selectedEvent?.id === event.id ? eventStorySuggestions : []"
          :suggestions-loading="selectedEvent?.id === event.id && eventSuggestionsLoading"
          :suggestions-error="selectedEvent?.id === event.id ? eventSuggestionsError : null"
          @retry-suggestions="retryEventSuggestions"
          @click="(ev: MouseEvent) => selectEvent(event, ev)"
          @story-select="(id: string) => emit('story-select', id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import FeedbackState from '@/components/base/FeedbackState.vue';
import PopoverSurface from '@/components/base/PopoverSurface.vue';
import Button from '@/components/base/Button.vue';
import { ref, computed, watch, onActivated, onDeactivated } from 'vue';

import type { ListPeriod, ListEvent, StorySuggestion, Story } from '@/types/database';
import { compareYearsOldestFirst } from '@temporal';
import { periodCoordinates } from '@/services/TimelineScalingService';
import { listEventYearsBP } from '@/lib/listEventTableHelpers';
import { useTimelineScaling } from '@/composables/useTimelineScaling';
import { usePeriodFlip } from '@/composables/usePeriodFlip';
import { useTimelinePeriodTooltip } from '@/composables/useTimelinePeriodTooltip';
import { useTimelinePeriodExpansion } from '@/composables/useTimelinePeriodExpansion';
import { formatPeriodDateRange } from '@/lib/formatTemporalBoundLabel';
import {
  timelineEventCardAlign,
  timelineFocusTransform,
  unwrapTemplateRefToHTMLElement,
} from '@/lib/timelinePeriodGridHelpers';
import PeriodCard from './PeriodCard.vue';
import EventCard from './EventCard.vue';
import AssociatedStoriesBadge from './AssociatedStoriesBadge.vue';
import { useTimelineAssociatedStories } from '@/composables/useTimelineAssociatedStories';

const props = withDefaults(defineProps<{
  periods: ListPeriod[];
  events: ListEvent[];
  loading: boolean;
  parentPeriod: ListPeriod | null;
  currentPeriod: ListPeriod | null;
  /** Bornes de la story courante : cadre fixe quand aucun currentPeriod n'est actif. */
  storyBounds?: { startYearsBP?: number; endYearsBP?: number } | null;
  storySuggestions: StorySuggestion[];
  currentStoryId: string;
  /** Infobulle des périodes (titre, dates, courte description) ; désactivée par défaut. */
  periodTooltips?: boolean;
  /** Home shares its cached frise read with the cards. Standalone grids can load their own metadata. */
  loadStoryDetails?: (id: string, signal: AbortSignal) => Promise<Story>;
}>(), { periodTooltips: false });

const emit = defineEmits<{
  (e: 'period-click', period: ListPeriod): void;
  (e: 'event-click', event: ListEvent): void;
  (e: 'go-back'): void;
  (e: 'story-select', storyId: string): void;
}>();

const { updateFromPeriods, getPeriodLayoutStyle, getEventLayoutStyle } = useTimelineScaling();

const error = ref<string | null>(null);
const selectedEvent = ref<ListEvent | null>(null);
/** Suggestions de stories pour l'événement actuellement sélectionné. */
const active = ref(true);
const { byPeriod: associatedByPeriod, byEvent: associatedByEvent, loading: associationsLoading, error: associationsError, retry: retryAssociations } = useTimelineAssociatedStories(
  () => props.currentStoryId, () => active.value && (!!props.currentPeriod || props.periods.length > 0 || props.events.length > 0),
  props.loadStoryDetails,
);
const eventStorySuggestions = computed(() => selectedEvent.value ? associatedByEvent.value.get(selectedEvent.value.id) ?? [] : []);
const eventSuggestionsLoading = associationsLoading;
const eventSuggestionsError = associationsError;
const retryEventSuggestions = retryAssociations;
/** null tant que le nombre est inconnu : une lecture en cours ou échouée n'est pas « aucune frise ». */
const otherStoryCount = (id: string) => associationsLoading.value || associationsError.value
  ? null
  : (associatedByEvent.value.get(id) ?? []).length;
// ─── FLIP animation ────────────────────────────────────────────────────────────

/** Ref vers la barre parent (PeriodCard variant="parent"). */
const parentBarRef = ref<any>(null);
/** Map id → élément DOM des cartes de période. */
const periodElMap = new Map<string, HTMLElement>();
const periodRowRef = ref<HTMLElement | null>(null);

function setPeriodRef(el: unknown, id: string) {
  const domEl = unwrapTemplateRefToHTMLElement(el);
  if (domEl) periodElMap.set(id, domEl);
  else periodElMap.delete(id);
}

// La barre parente a aussi son infobulle : elle est ancrée sur parentBarRef.
const periodDetails = useTimelinePeriodTooltip(
  () => props.currentPeriod ? [...props.periods, props.currentPeriod] : props.periods,
  id => id === props.currentPeriod?.id ? unwrapTemplateRefToHTMLElement(parentBarRef.value) : periodElMap.get(id) ?? null,
  () => props.periodTooltips && active.value && !props.loading,
);
const { period: tooltipPeriod, tooltipId, tooltipElement, tooltipStyle } = periodDetails;
const activePeriodId = computed(() => active.value && !props.loading && props.periods.some(p => p.id === periodDetails.activeId.value)
  ? periodDetails.activeId.value : null);
const { minimumPct, laneHeight, wrapContent } = useTimelinePeriodExpansion(
  () => activePeriodId.value,
  id => periodElMap.get(id) ?? null,
  periodRowRef,
);
const tooltipDateRange = computed(() => tooltipPeriod.value ? formatPeriodDateRange(tooltipPeriod.value) : '');
const tooltipDescription = computed(() => (tooltipPeriod.value?.description?.fr || tooltipPeriod.value?.description?.en || '').trim());
/** Le clic sur la barre parente remonte ; sur une carte, il n'explore que s'il y a des sous-périodes. */
const tooltipHint = computed(() => {
  if (!tooltipPeriod.value) return '';
  if (tooltipPeriod.value.id === props.currentPeriod?.id) return 'Cliquer pour remonter';
  return tooltipPeriod.value.hasChildren ? 'Cliquer pour explorer' : '';
});

const periodFlip = usePeriodFlip(
  () => props.currentPeriod?.id,
  () => props.loading,
  () => unwrapTemplateRefToHTMLElement(parentBarRef.value),
);

// ─── Tri et lanes ─────────────────────────────────────────────────────────────

const periodRows = computed(() => props.periods.map(p => ({ p, ...periodCoordinates(p) })));
const datedPeriodRows = computed(() => periodRows.value.flatMap(({p,start,end}) => start !== null && end !== null ? [{p,start,end}] : []));
const undatedPeriods = computed(() => periodRows.value.filter(row => row.start === null || row.end === null).map(row => row.p));
const undatedEvents = computed(() => props.events.filter(e => listEventYearsBP(e) === null));
const sortedPeriods = computed(() => [...datedPeriodRows.value].sort((a,b) => compareYearsOldestFirst(a.start,b.start)).map(row => row.p));

const laneMap = computed((): Map<string, number> => {
  const result = new Map<string, number>();
  const laneMinEnds: number[] = [];

  const allBP = datedPeriodRows.value.flatMap(row => [row.start, row.end]);
  const span = allBP.length ? Math.max(...allBP) - Math.min(...allBP) : 0;
  const tolerance = span * 0.001;

  for (const period of sortedPeriods.value) {
    const { start: startBP, end: endBP } = periodCoordinates(period);
    if (startBP === null || endBP === null) continue;

    let assigned = -1;
    for (let lane = 0; lane < laneMinEnds.length; lane++) {
      if (laneMinEnds[lane] >= startBP - tolerance) {
        assigned = lane;
        break;
      }
    }

    if (assigned === -1) {
      assigned = laneMinEnds.length;
      laneMinEnds.push(endBP);
    } else {
      laneMinEnds[assigned] = Math.min(laneMinEnds[assigned], endBP);
    }

    result.set(period.id, assigned);
  }

  return result;
});

const numLanes = computed(() =>
  laneMap.value.size === 0 ? 1 : Math.max(...laneMap.value.values()) + 1
);

const periodRowHeight = computed(() => numLanes.value * laneHeight.value);

watch(
  [sortedPeriods, () => props.currentPeriod, () => props.storyBounds],
  ([p]) => {
    // currentPeriod définit la fenêtre quand on navigue dans une période ;
    // sinon on utilise les bornes de la story pour cadrer toute la frise.
    const framingPeriod = props.currentPeriod ?? props.storyBounds ?? undefined;
    try { updateFromPeriods(p, framingPeriod); }
    catch (e) { error.value = e instanceof Error ? e.message : 'Erreur de calcul'; }
  },
  { immediate: true }
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const rawLayouts = computed(() => {
  const map = new Map<string, { left: number; width: number; top: number }>();
  for (const period of sortedPeriods.value) {
    const s = getPeriodLayoutStyle(period, {
      row: laneMap.value.get(period.id) ?? 0,
      rowHeight: laneHeight.value,
    });
    map.set(period.id, {
      left:  parseFloat(s.left as string),
      width: parseFloat(s.width as string),
      top:   parseFloat(s.top  as string),
    });
  }
  return map;
});

const getPeriodCssVars = (period: ListPeriod): Record<string, string> => {
  const raw = rawLayouts.value.get(period.id);
  if (!raw) return {};
  const { left, width, top } = raw;

  if (activePeriodId.value) {
    const hov = rawLayouts.value.get(activePeriodId.value);
    if (hov && hov.width < minimumPct.value) {
      const t1 = hov.left;
      const t2 = hov.left + hov.width;
      const newLeft  = timelineFocusTransform(left, t1, t2, minimumPct.value);
      const newRight = timelineFocusTransform(left + width, t1, t2, minimumPct.value);
      return {
        '--period-left': `${newLeft}%`,
        '--period-width': `${Math.max(0, newRight - newLeft)}%`,
        '--period-top': `${top}px`,
        '--period-z': String(period.id === activePeriodId.value ? 2 : 1),
      };
    }
  }

  return {
    '--period-left': `${left}%`,
    '--period-width': `${width}%`,
    '--period-top': `${top}px`,
  };
};

const getEventRawLeft = (event: ListEvent): number => {
  const base = getEventLayoutStyle(event.date);
  return parseFloat(base.left as string);
};

const getEventAlign = (event: ListEvent): 'start' | 'center' | 'end' =>
  timelineEventCardAlign(getEventRawLeft(event));

const getEventStyles = (event: ListEvent): { width: string; left: string } => {
  const base = getEventLayoutStyle(event.date);
  const rawLeft = parseFloat(String(base.left));

  if (activePeriodId.value) {
    const hov = rawLayouts.value.get(activePeriodId.value);
    if (hov && hov.width < minimumPct.value) {
      const t1 = hov.left;
      const t2 = hov.left + hov.width;
      return {
        width: String(base.width),
        left: `${timelineFocusTransform(rawLeft, t1, t2, minimumPct.value)}%`,
      };
    }
  }

  return { width: String(base.width), left: String(base.left) };
};

// ─── Dropdown suggestions ─────────────────────────────────────────────────────

/** Rect de la carte qui a ouvert le dropdown (pour le positionner). */
const dropdownRect = ref<DOMRect | null>(null);

const dropdownStyle = computed(() => {
  if (!dropdownRect.value) return {};
  const rect = dropdownRect.value;
  const center = rect.left + rect.width / 2;
  return {
    top: `${rect.bottom + 8}px`,
    left: `${center}px`,
    transform: 'translateX(-50%)',
  };
});

watch(() => props.storySuggestions, (val) => {
  if (val.length === 0) dropdownRect.value = null;
});

// ─── Actions ──────────────────────────────────────────────────────────────────

const selectPeriod = (period: ListPeriod) => {
  periodDetails.dismiss();
  const el = periodElMap.get(period.id);
  const rect = el ? el.getBoundingClientRect() : null;
  periodFlip.prepare(period, el ?? null);
  dropdownRect.value = rect;
  emit('period-click', period);
};

const selectEvent = (event: ListEvent, nativeEvt?: MouseEvent) => {
  const isDeselecting = selectedEvent.value?.id === event.id;
  selectedEvent.value = isDeselecting ? null : event;
  if (!isDeselecting) {
    if (nativeEvt) {
      const target = (nativeEvt.currentTarget ?? nativeEvt.target) as HTMLElement | null;
      if (target) dropdownRect.value = target.getBoundingClientRect();
    }
    emit('event-click', event);
  }
};

watch([() => props.currentStoryId, () => props.currentPeriod?.id], () => { selectedEvent.value = null; }, { flush: 'sync' });
watch(() => props.events, events => {
  if (selectedEvent.value && !events.some(event => event.id === selectedEvent.value!.id)) selectedEvent.value = null;
});

onActivated(() => { active.value = true; });
onDeactivated(() => {
  active.value = false;
  dropdownRect.value = null;
  selectedEvent.value = null;
  periodDetails.reset();
  periodFlip.cancel();
});

const isCategoryActive = (event: ListEvent): boolean => {
  if (!selectedEvent.value || selectedEvent.value.id === event.id) return false;
  const selectedIds = new Set(selectedEvent.value.categories.map(c => c.id));
  return event.categories.some(c => selectedIds.has(c.id));
};

const goBack = () => {
  periodDetails.reset();
  periodFlip.cancel();
  emit('go-back');
};
</script>

<style scoped>
.period-grid__undated-item { display: inline-flex; align-items: center; gap: var(--spacing-xs); }
.period-grid__tooltip {
  position: fixed;
  z-index: var(--z-index-tooltip);
  display: flex;
  flex-direction: column;
  gap: 0;
  width: max-content;
  max-width: min(360px, calc(100vw - 24px));
  max-height: calc(100vh - 24px);
  overflow: auto;
  white-space: normal;
  overflow-wrap: anywhere;
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--color-text-primary);
  background: var(--color-surface-default);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-small);
  /* Purement informative : elle ne retient pas le survol et ne masque pas les clics. */
  pointer-events: none;
}
.period-grid__tooltip-hint {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
/* Courte description : limitée à quelques lignes, le texte complet reste dans le détail. */
.period-grid__tooltip-description {
  margin: var(--spacing-xs) 0 0;
  color: var(--color-text-secondary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  overflow: hidden;
}

.period-grid__undated { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm); margin: var(--spacing-md) 0; }


.period-grid {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  overflow: hidden;
  background-color: var(--color-background-default);
}

.timeline-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.periods-container {
  flex: 1 1 0;
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: calc(var(--spacing-xs) / 2);
}

.period-row {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.timeline-line {
  height: calc(var(--spacing-xs) / 2);
  width: 100%;
  background: var(--color-border-dark);
  position: relative;
  z-index: var(--z-index-period-row-band);
  margin: calc(var(--spacing-xs) / 2) 0;
}

.events-container {
  flex: 1 1 0;
  position: relative;
  width: 100%;
}

/* ─── Cartes de période : entrée en fondu décalé ──────────────────────────── */

.period-grid__period-position {
  position: absolute;
  left: var(--period-left);
  width: var(--period-width);
  top: var(--period-top);
  z-index: var(--period-z, auto);
}

.timeline-card {
  transition: left 0.18s ease, width 0.18s ease;
  animation: card-enter 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
  animation-delay: var(--enter-delay, 0ms);
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

<style>
/* Styles globaux pour le dropdown (en dehors du scoped car rendu dans body via Teleport) */

.story-dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-index-dropdown);
}

.story-dropdown {
  position: fixed;
  z-index: calc(var(--z-index-dropdown) + 1);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  min-width: 200px;
  max-width: 320px;

  animation: dropdown-enter 0.18s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.story-dropdown__label {
  font-size: var(--font-size-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-xs) var(--spacing-xs);
}

.story-dropdown__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--spacing-sm) var(--spacing-2xl) var(--spacing-sm) 10px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
  position: relative;
  transition: background 0.12s;
}

.story-dropdown__item:hover {
  background: var(--color-interaction-hover);
}

.story-dropdown__item-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.story-dropdown__item-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.story-dropdown__item-arrow {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  color: var(--color-text-link);
  font-size: var(--font-size-base);
  opacity: 0;
  transition: opacity 0.12s, transform 0.12s;
}

.story-dropdown__item:hover .story-dropdown__item-arrow {
  opacity: 1;
  transform: translateY(-50%) translateX(3px);
}

@keyframes dropdown-enter {
  from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
