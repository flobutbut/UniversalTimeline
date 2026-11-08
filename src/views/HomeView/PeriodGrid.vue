<template>
  <div class="period-grid" :class="{ 'period-grid--compact': compact }" :aria-busy="loading || undefined">
    <!-- Garder le niveau courant affiché pendant une navigation ou une recherche de stories. -->
    <FeedbackState v-if="loading && !currentPeriod && periods.length === 0 && events.length === 0" kind="loading" message="Chargement de la timeline…" />
    <FeedbackState v-else-if="error" kind="error" :message="error" />
    <FeedbackState v-else-if="!loading && !currentPeriod && !overviewNavigation && periods.length === 0 && events.length === 0" message="Aucune période à afficher" />
    <div v-else class="timeline-container">
      <div class="periods-container">
        <nav v-if="!loading && (viewEndLabel || (showsNeighbors && (previousPeriod || nextPeriod)))" class="period-grid__navigation" aria-label="Périodes de même niveau">
          <Button v-if="showsNeighbors && previousPeriod" variant="ghost" size="sm" data-period-direction="previous"
            :title="`Période précédente : ${previousPeriod.label.fr || previousPeriod.label.en}`"
            @click="navigatePeriod('previous')">
            <template #icon><Icon icon="mdi:arrow-left" aria-hidden="true" /></template>
            Période précédente<span> - {{ previousPeriod.label.fr || previousPeriod.label.en }}</span>
          </Button>
          <Button v-if="showsNeighbors && nextPeriod" class="period-grid__next-control" variant="ghost" size="sm" data-period-direction="next"
            :title="`Période suivante : ${nextPeriod.label.fr || nextPeriod.label.en}`"
            @click="navigatePeriod('next')">
            Période suivante<span> - {{ nextPeriod.label.fr || nextPeriod.label.en }}</span>
            <Icon icon="mdi:arrow-right" class="period-grid__next-icon" aria-hidden="true" />
          </Button>
          <!-- Sans période suivante, la vue s'arrête au présent ou à la fin de la frise : annoncer cette borne. -->
          <span v-else-if="viewEndLabel" class="period-grid__end-label">{{ viewEndLabel }}</span>
        </nav>
        <div ref="periodSurfaceRef" class="period-grid__surface">
          <slot v-if="!props.currentPeriod && (!overviewPeriod || overviewPeriodStyle)" name="overview-context" :style="overviewPeriodStyle" :continuation="overviewContinuation" />
          <FeedbackState v-if="!loading && !currentPeriod && overviewNavigation && periods.length === 0 && events.length === 0" message="Aucune période à afficher" />
          <PeriodCard
            v-if="props.currentPeriod"
            ref="parentBarRef"
            variant="parent"
            :compact="compact"
            :period="props.currentPeriod"
            :style="parentBarStyle"
            :continues-before="parentContinuation.before"
            :continues-after="parentContinuation.after"
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
                @retry="retryAssociations" @select="emit('story-select', $event, { type: 'period', id: props.currentPeriod.id })" />
            </template>
          </PeriodCard>
          <div ref="periodRowRef" class="period-row" :style="{ height: `${periodRowHeight}px` }">
            <PeriodCard
              v-for="(period, i) in sortedPeriods"
              :key="period.id"
              :ref="(el: any) => setPeriodRef(el, period.id)"
              :period="period"
              :parent-label="childParentLabels.get(period.id)"
              :compact="compact"
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
                  @open-change="value => setPeriodAssociationsOpen(period.id, value)"
                  @retry="retryAssociations" @select="emit('story-select', $event, { type: 'period', id: period.id })" />
              </template>
            </PeriodCard>
          </div>
        </div>
      </div>
      <div ref="timelineLineRef" class="timeline-line"></div>
      <div v-if="undatedPeriods.length" ref="undatedPeriodsRef" class="period-grid__undated">
        <span>Dates non déterminées</span>
        <span v-for="period in undatedPeriods" :key="`p:${period.id}`" class="period-grid__undated-item">
          <Button variant="tertiary" size="xs" type="button" :disabled="loading" @click="selectPeriod(period)">{{ period.label.fr }}</Button>
          <AssociatedStoriesBadge :story-id="currentStoryId" :period-id="period.id" :period-label="period.label.fr || period.label.en"
            :stories="associatedByPeriod.get(period.id) ?? []" :loading="associationsLoading" :error="associationsError" :disabled="loading"
            @retry="retryAssociations" @select="emit('story-select', $event, { type: 'period', id: period.id })" />
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
      </Teleport>
      <div ref="eventsSurfaceRef" class="events-container" @click="selectedEvent = null">
        <p v-if="currentPeriod && !loading && renderedPeriods.length === 0 && events.length === 0" class="period-grid__empty-detail">Aucune sous-période ni événement dans cette frise pour cette période.</p>
        <span v-if="undatedEvents.length" class="period-grid__undated-label">Événements sans date déterminée</span>
        <EventCard
          v-for="event in events"
          :key="event.id"
          :data-event-id="event.id"
          :event="event"
          :undated="listEventYearsBP(event) === null"
          :is-selected="selectedEvent?.id === event.id"
          :is-default-open="defaultOpenEventIds.has(event.id)"
          :is-category-active="isCategoryActive(event)"
          :card-style="getEventStyles(event)"
          :align="getEventAlign(event)"
          :other-story-count="otherStoryCount(event.id)"
          :story-suggestions="selectedEvent?.id === event.id ? eventStorySuggestions : []"
          :suggestions-loading="selectedEvent?.id === event.id && eventSuggestionsLoading"
          :suggestions-error="selectedEvent?.id === event.id ? eventSuggestionsError : null"
          @retry-suggestions="retryEventSuggestions"
          @click="selectEvent(event)"
          @active-change="(isActive: boolean) => setActiveEvent(event.id, isActive)"
          @story-select="(id: string) => emit('story-select', id, { type: 'event', id: event.id })"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import FeedbackState from '@/components/base/FeedbackState.vue';
import Button from '@/components/base/Button.vue';
import { Icon } from '@iconify/vue';
import { ref, computed, watch, onActivated, onDeactivated, onScopeDispose } from 'vue';

import type { ListPeriod, ListEvent, Story, StoryAnchor } from '@/types/database';
import { timelineHierarchy } from '@/lib/timelineHierarchy';
import { layoutSequentialLanes } from '@/lib/sequentialTimelineLanes';
import { getStoryPeriodParentId } from '@/lib/storyPeriodParent';
import { periodCoordinates, type ScalablePeriod } from '@/services/TimelineScalingService';
import { listEventYearsBP } from '@/lib/listEventTableHelpers';
import { useTimelineScaling } from '@/composables/useTimelineScaling';
import { usePeriodFlip } from '@/composables/usePeriodFlip';
import { useTimelinePeriodTooltip } from '@/composables/useTimelinePeriodTooltip';
import { useTimelinePeriodExpansion } from '@/composables/useTimelinePeriodExpansion';
import { formatPeriodDateRange, formatTemporalBoundLabel } from '@/lib/formatTemporalBoundLabel';
import { defaultOpenEvents, withoutCoveredTooltips } from '@/lib/timelineEventDensity';
import { compareEventPriority, eventPrioritySignals } from '@/lib/timelineEventPriority';
import {
  timelineEventCardAlign,
  timelineFocusTransform,
  unwrapTemplateRefToHTMLElement,
} from '@/lib/timelinePeriodGridHelpers';
import PeriodCard from './PeriodCard.vue';
import EventCard from './EventCard.vue';
import AssociatedStoriesBadge from './AssociatedStoriesBadge.vue';
import { useTimelineAssociatedStories } from '@/composables/useTimelineAssociatedStories';
import type { LinkedStoryPeriod } from '@/lib/linkedStoryPeriods';

const props = withDefaults(defineProps<{
  periods: ListPeriod[];
  childPeriods?: ListPeriod[];
  childLinkedPeriods?: LinkedStoryPeriod[];
  showChildren?: boolean;
  linkedPeriods?: LinkedStoryPeriod[];
  events: ListEvent[];
  loading: boolean;
  parentPeriod: ListPeriod | null;
  currentPeriod: ListPeriod | null;
  previousPeriod?: ListPeriod | null;
  nextPeriod?: ListPeriod | null;
  /** A reference period can carry temporal neighbors without being part of the narrative. */
  overviewNavigation?: boolean;
  /** Real reference dates, projected into the narrative window without framing it. */
  overviewPeriod?: ListPeriod | null;
  /** Bornes de la story courante : cadre fixe quand aucun currentPeriod n'est actif. */
  storyBounds?: ScalablePeriod | null;
  /** Échelle imposée par une autre frise : positions rapportées à ce cadre, sans l'élargir aux périodes affichées. */
  scaleFrame?: ScalablePeriod | null;
  /** Périodes sur une seule ligne et titres d'événements figés sur une ligne. */
  compact?: boolean;
  /** Masque la borne « Fin : … » : une frise qui suit l’échelle d’une autre n’a pas de fin de vue à annoncer. */
  hideEndBound?: boolean;
  /** Agrandissement survolé dans une autre frise sur la même échelle (voir `getFocus`). */
  externalFocus?: { start: number; end: number; minimum: number } | null;
  currentStoryId: string;
  /** Infobulle des périodes (titre, dates, courte description) ; désactivée par défaut. */
  periodTooltips?: boolean;
  /** Home shares its cached frise read with the cards. Standalone grids can load their own metadata. */
  loadStoryDetails?: (id: string, signal: AbortSignal) => Promise<Story>;
}>(), { compact: false, periodTooltips: false, linkedPeriods: () => [], childPeriods: () => [], childLinkedPeriods: () => [], showChildren: false });

const emit = defineEmits<{
  (e: 'period-click', period: ListPeriod): void;
  (e: 'event-click', event: ListEvent): void;
  (e: 'go-back'): void;
  (e: 'navigate-period', direction: 'previous' | 'next'): void;
  (e: 'story-select', storyId: string, anchor?: StoryAnchor): void;
}>();

const { updateFromPeriods, getPeriodLayoutStyle, getEventLayoutStyle, getPeriodContinuation, startYears, totalDuration } = useTimelineScaling();

const error = ref<string | null>(null);
const selectedEvent = ref<ListEvent | null>(null);
/** Suggestions de stories pour l'événement actuellement sélectionné. */
const active = ref(true);
const inlineChildren = computed(() => [...props.childPeriods, ...props.childLinkedPeriods]);
const renderedPeriods = computed(() => [...props.periods,...props.linkedPeriods,...(props.showChildren ? inlineChildren.value : [])]);
const { byPeriod: associatedByPeriod, byEvent: associatedByEvent, loading: associationsLoading, error: associationsError, retry: retryAssociations } = useTimelineAssociatedStories(
  () => props.currentStoryId, () => active.value && (!!props.currentPeriod || renderedPeriods.value.length > 0 || props.events.length > 0),
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
const periodSurfaceRef = ref<HTMLElement | null>(null);
const timelineLineRef = ref<HTMLElement | null>(null);
const undatedPeriodsRef = ref<HTMLElement | null>(null);
const eventsSurfaceRef = ref<HTMLElement | null>(null);
defineExpose({
  getSlideLayers: () => [periodSurfaceRef.value, timelineLineRef.value, undatedPeriodsRef.value, eventsSurfaceRef.value]
    .filter((element): element is HTMLElement => element !== null),
  /** Cadre réellement affiché, pour aligner une autre frise sur la même échelle. */
  getScaleFrame: () => totalDuration.value > 0 ? { startYearsBP: startYears.value, endYearsBP: startYears.value - totalDuration.value } : null,
  /** Agrandissement de la période survolée ici, à reporter sur une autre frise de même échelle. */
  getFocus: () => ownFocus.value,
});

function setPeriodRef(el: unknown, id: string) {
  const domEl = unwrapTemplateRefToHTMLElement(el);
  if (domEl) periodElMap.set(id, domEl);
  else periodElMap.delete(id);
}

// La barre parente a aussi son infobulle : elle est ancrée sur parentBarRef.
const periodDetails = useTimelinePeriodTooltip(
  () => props.currentPeriod ? [...renderedPeriods.value, props.currentPeriod] : renderedPeriods.value,
  id => id === props.currentPeriod?.id ? unwrapTemplateRefToHTMLElement(parentBarRef.value) : periodElMap.get(id) ?? null,
  () => props.periodTooltips && active.value && !props.loading,
);
const { period: tooltipPeriod, tooltipId, tooltipElement, tooltipStyle } = periodDetails;
const associationPeriodId = ref<string | null>(null);
function setPeriodAssociationsOpen(id: string, open: boolean) {
  if(open) { associationPeriodId.value=id; periodDetails.dismiss(); }
  else if(associationPeriodId.value===id)associationPeriodId.value=null;
}
const activePeriodId = computed(() => {
  const id=associationPeriodId.value??periodDetails.activeId.value;
  return active.value && !props.loading && renderedPeriods.value.some(p => p.id === id) ? id : null;
});
const { minimumPct, laneHeight, wrapContent } = useTimelinePeriodExpansion(
  () => activePeriodId.value,
  id => periodElMap.get(id) ?? null,
  periodRowRef,
  () => props.compact ? 34 : 56,
);
/** Les voisins n'existent que dans une période ouverte ou un retour vers une frise source. */
const showsNeighbors = computed(() => !!props.currentPeriod || !!props.overviewNavigation);
/** Borne de fin de la vue (période ouverte, sinon frise entière), à la place de « Période suivante » quand il n'y en a pas. */
const viewEndLabel = computed(() => {
  const frame = props.currentPeriod ?? props.storyBounds;
  if (props.hideEndBound || !frame?.endDate?.trim()) return null;
  const now = Date.now();
  const latest = [frame, ...props.periods].flatMap(candidate => {
    const end = periodCoordinates(candidate, now).end;
    return end !== null && candidate.endDate?.trim() ? [{ end, raw: candidate.endDate }] : [];
  }).sort((a, b) => a.end - b.end)[0];
  const end = latest?.raw ?? frame.endDate;
  const label = formatTemporalBoundLabel(end);
  return label === "aujourd'hui" ? "Aujourd'hui" : `Fin : ${label}`;
});
const tooltipDateRange = computed(() => tooltipPeriod.value ? formatPeriodDateRange(tooltipPeriod.value) : '');
const tooltipDescription = computed(() => (tooltipPeriod.value?.description?.fr || tooltipPeriod.value?.description?.en || '').trim());
const tooltipHint = computed(() => {
  if (!tooltipPeriod.value) return '';
  if (tooltipPeriod.value.id === props.currentPeriod?.id) return 'Cliquer pour remonter';
  return 'Cliquer pour explorer';
});

const periodFlip = usePeriodFlip(
  () => props.currentPeriod?.id,
  () => props.loading,
  () => unwrapTemplateRefToHTMLElement(parentBarRef.value),
);

// ─── Tri et lanes ─────────────────────────────────────────────────────────────

const periodRows = computed(() => {
  const now = Date.now();
  const rows = props.periods.map(p => ({ p, ...periodCoordinates(p, now) }));
  const frame = props.currentPeriod ?? props.storyBounds;
  const coordinates = [...rows.flatMap(row => [row.start,row.end]), ...(frame ? Object.values(periodCoordinates(frame,now)) : [])].filter((v): v is number => v !== null);
  const start = Math.max(...coordinates), end = Math.min(...coordinates);
  const links = props.linkedPeriods.flatMap(p => {
    const dates = periodCoordinates(p,now);
    if (dates.start === null || dates.end === null || !(start > end)) return [{ p,...dates }];
    const clippedStart = Math.min(start,dates.start), clippedEnd = Math.max(end,dates.end);
    return clippedStart > clippedEnd ? [{ p,start:clippedStart,end:clippedEnd }] : [];
  });
  return [...rows,...links];
});
const childParentLabels = computed(() => {
  const parents = new Map([...props.periods, ...props.childPeriods].map(p => [p.id, p.label.fr || p.label.en || 'Période sans nom']));
  return new Map(inlineChildren.value.map(p => [p.id, parents.get(getStoryPeriodParentId(p) ?? '')]));
});
const childRows = computed(() => {
  if (!props.showChildren) return [];
  const now = Date.now();
  const frame = props.currentPeriod ?? props.storyBounds;
  const coordinates = [...periodRows.value.flatMap(row => [row.start,row.end]), ...(frame ? Object.values(periodCoordinates(frame, now)) : [])]
    .filter((value): value is number => value !== null);
  const start = Math.max(...coordinates), end = Math.min(...coordinates);
  const visible = new Set(periodRows.value.map(row => row.p.id));
  return inlineChildren.value.flatMap(p => {
    if (visible.has(p.id) || !childParentLabels.value.get(p.id)) return [];
    const dates = periodCoordinates(p, now);
    if (dates.start === null || dates.end === null) return [{ p, ...dates }];
    if (!(start > end)) return [];
    const clippedStart = Math.min(start, dates.start), clippedEnd = Math.max(end, dates.end);
    return clippedStart > clippedEnd ? [{ p, start: clippedStart, end: clippedEnd }] : [];
  });
});
const datedPeriodRows = computed(() => periodRows.value.flatMap(({p,start,end}) => start !== null && end !== null ? [{p,start,end}] : []));
const undatedPeriods = computed(() => [...periodRows.value, ...childRows.value].filter(row => row.start === null || row.end === null).map(row => row.p));
const undatedEvents = computed(() => props.events.filter(e => listEventYearsBP(e) === null));
const sortedPeriodRows = computed(() => {
  if (!props.showChildren) return layoutSequentialLanes(datedPeriodRows.value);
  const hierarchy = timelineHierarchy([...props.periods, ...inlineChildren.value], getStoryPeriodParentId, props.periods.map(p => p.id));
  const depths = new Map(hierarchy.map(({ item, depth }) => [item.id, depth]));
  const children = childRows.value.flatMap(child => child.start !== null && child.end !== null && depths.has(child.p.id)
    ? [{ p: child.p, start: child.start, end: child.end, depth: depths.get(child.p.id)! }] : []);
  return layoutSequentialLanes([...datedPeriodRows.value.map(row => ({ ...row, depth: 0 })), ...children]);
});

const sortedPeriods = computed(() => sortedPeriodRows.value.map(row => row.p));

const laneMap = computed(() => new Map(sortedPeriodRows.value.map(({ p, lane }) => [p.id,lane])));

const numLanes = computed(() =>
  laneMap.value.size === 0 ? 1 : Math.max(...laneMap.value.values()) + 1
);

const periodRowHeight = computed(() => numLanes.value * laneHeight.value);

watch(
  [datedPeriodRows, () => props.currentPeriod, () => props.storyBounds, () => props.scaleFrame],
  () => {
    if (props.scaleFrame) { updateFromPeriods([], props.scaleFrame); return; }
    // Le cadre inclut la référence et les périodes affichées, même si un enfant déborde.
    const framingPeriod = props.currentPeriod ?? props.storyBounds ?? undefined;
    const nativeIds = new Set(props.periods.map(period => period.id));
    // Re-read native dates at the layout's clock; linked cards retain their clipped framing bounds.
    try { updateFromPeriods(datedPeriodRows.value.map(row => nativeIds.has(row.p.id) ? row.p : { startYearsBP: row.start, endYearsBP: row.end }), framingPeriod); }
    catch (e) { error.value = e instanceof Error ? e.message : 'Erreur de calcul'; }
  },
  { immediate: true }
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const rawLayouts = computed(() => {
  const map = new Map<string, { left: number; width: number; top: number }>();
  for (const { p: period } of sortedPeriodRows.value) {
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

/** Période trop étroite survolée ici : l'intervalle agrandi, en %, et sa largeur visée. */
const ownFocus = computed(() => {
  if (!activePeriodId.value) return null;
  const hov = rawLayouts.value.get(activePeriodId.value);
  return hov && hov.width < minimumPct.value ? { start: hov.left, end: hov.left + hov.width, minimum: minimumPct.value } : null;
});
/** Le survol local prime ; sinon une frise sur la même échelle peut imposer le sien. */
const focus = computed(() => ownFocus.value ?? props.externalFocus ?? null);
const projectPosition = (position: number): number =>
  focus.value ? timelineFocusTransform(position, focus.value.start, focus.value.end, focus.value.minimum) : position;

const getPeriodCssVars = (period: ListPeriod): Record<string, string> => {
  const raw = rawLayouts.value.get(period.id);
  if (!raw) return {};
  const left = projectPosition(raw.left);
  const right = projectPosition(raw.left + raw.width);
  return {
    '--period-left': `${left}%`,
    '--period-width': `${Math.max(0, right - left)}%`,
    '--period-top': `${raw.top}px`,
    '--period-z': String(period.id === activePeriodId.value ? 2 : 1),
  };
};

// The parent uses the same dates and hover projection as its children and events.
const overviewContinuation = computed(() => props.overviewPeriod ? getPeriodContinuation(props.overviewPeriod) : { before: false, after: false });
const parentContinuation = computed(() => props.currentPeriod ? getPeriodContinuation(props.currentPeriod) : { before: false, after: false });
const overviewPeriodStyle = computed(() => {
  if(!props.overviewPeriod)return null;
  const base=getPeriodLayoutStyle(props.overviewPeriod);
  if(parseFloat(base.width)<=0)return null;
  const left=projectPosition(parseFloat(base.left));
  const right=projectPosition(parseFloat(base.left)+parseFloat(base.width));
  return {width:`${Math.max(0,right-left)}%`,marginLeft:`${left}%`};
});
const parentBarStyle = computed(() => {
  if (!props.currentPeriod) return {};
  const { start, end } = periodCoordinates(props.currentPeriod);
  // Keep back navigation available when the parent's dates cannot be projected.
  if (start === null || end === null) return {};
  const base = getPeriodLayoutStyle(props.currentPeriod);
  const rawLeft = parseFloat(base.left);
  const left = projectPosition(rawLeft);
  const right = projectPosition(rawLeft + parseFloat(base.width));
  return { width: `${Math.max(0, right - left)}%`, marginLeft: `${left}%` };
});

const getEventRawLeft = (event: ListEvent): number => {
  const base = getEventLayoutStyle(event.date);
  return parseFloat(base.left as string);
};

// ─── Tooltips ouverts par défaut (prototype) ──────────────────────────────────

/** Les tooltips compacts qui tiennent côte à côte restent ouverts ; les autres au survol. */
const eventsWidth = ref(0);
let eventsObserver: ResizeObserver | undefined;
watch(eventsSurfaceRef, element => {
  eventsObserver?.disconnect();
  eventsWidth.value = element?.getBoundingClientRect().width ?? 0;
  if (element && typeof ResizeObserver !== 'undefined') {
    eventsObserver = new ResizeObserver(() => { eventsWidth.value = element.getBoundingClientRect().width; });
    eventsObserver.observe(element);
  }
}, { flush: 'post' });
onScopeDispose(() => eventsObserver?.disconnect());

/** Bords de la vue et des périodes affichées, en % : un événement qui y tombe structure la frise. */
const boundariesPct = computed(() => [0, 100, ...[...rawLayouts.value.values()].flatMap(({ left, width }) => [projectPosition(left), projectPosition(left + width)])]);
const eventSlots = computed(() => props.events.filter(event => listEventYearsBP(event) !== null).map(event => {
  // Même projection que les points et les périodes : une période agrandie au survol comprime aussi les étiquettes voisines.
  const leftPct = projectPosition(getEventRawLeft(event));
  // Liens inconnus pendant le chargement ou après une erreur : seuls les signaux de dates comptent.
  const links = associationsLoading.value || associationsError.value ? [] : associatedByEvent.value.get(event.id) ?? [];
  const hasDescription = !!(event.description?.fr || event.description?.en || '').trim();
  return { id: event.id, leftPct, align: timelineEventCardAlign(leftPct),
    signals: eventPrioritySignals(leftPct, boundariesPct.value, links, props.currentStoryId, hasDescription, event.importance) };
}));
const pinnedEventIds = computed(() => defaultOpenEvents(eventSlots.value, eventsWidth.value, (a, b) => compareEventPriority(a.signals, b.signals)));
/** Événement survolé ou focalisé : son tooltip complet masque les tooltips figés qu'il recouvre. */
const activeEventId = ref<string | null>(null);
/** Délai avant de rouvrir les tooltips figés : passer d'un point à l'autre ne les fait pas clignoter. */
const REOPEN_DELAY_MS = 200;
let reopenTimer: ReturnType<typeof setTimeout> | undefined;
function setActiveEvent(id: string, isActive: boolean) {
  clearTimeout(reopenTimer);
  if (isActive) { activeEventId.value = id; return; }
  if (activeEventId.value !== id) return;
  reopenTimer = setTimeout(() => { if (activeEventId.value === id) activeEventId.value = null; }, REOPEN_DELAY_MS);
}
function resetActiveEvent() { clearTimeout(reopenTimer); activeEventId.value = null; }
onScopeDispose(() => clearTimeout(reopenTimer));
const defaultOpenEventIds = computed(() => withoutCoveredTooltips(
  pinnedEventIds.value,
  eventSlots.value,
  new Set([activeEventId.value, selectedEvent.value?.id].filter((id): id is string => !!id)),
  eventsWidth.value,
));

const getEventAlign = (event: ListEvent): 'start' | 'center' | 'end' =>
  timelineEventCardAlign(projectPosition(getEventRawLeft(event)));

const getEventStyles = (event: ListEvent): { width: string; left: string } => {
  const base = getEventLayoutStyle(event.date);
  return { width: String(base.width), left: `${projectPosition(parseFloat(base.left))}%` };
};

// ─── Actions ──────────────────────────────────────────────────────────────────

const selectPeriod = (period: ListPeriod) => {
  if (props.loading) return;
  periodDetails.dismiss();
  const linked = [...props.linkedPeriods, ...(props.showChildren ? props.childLinkedPeriods : [])].find(link => link.id === period.id);
  if (linked) { emit('story-select',linked.linkedStoryId,linked.sourceAnchor); return; }
  const el = periodElMap.get(period.id);
  periodFlip.prepare(period, el ?? null);
  emit('period-click', period);
};

const selectEvent = (event: ListEvent) => {
  const isDeselecting = selectedEvent.value?.id === event.id;
  selectedEvent.value = isDeselecting ? null : event;
  if (!isDeselecting) {
    emit('event-click', event);
  }
};

watch([() => props.currentStoryId, () => props.currentPeriod?.id], () => { selectedEvent.value = null; resetActiveEvent(); }, { flush: 'sync' });
watch(() => props.events, events => {
  if (selectedEvent.value && !events.some(event => event.id === selectedEvent.value!.id)) selectedEvent.value = null;
});

onActivated(() => { active.value = true; });
onDeactivated(() => {
  active.value = false;
  selectedEvent.value = null;
  resetActiveEvent();
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

const navigatePeriod = (direction: 'previous' | 'next') => {
  if (props.loading || !(direction === 'previous' ? props.previousPeriod : props.nextPeriod)) return;
  periodDetails.reset();
  periodFlip.cancel();
  selectedEvent.value = null;
  emit('navigate-period', direction);
};
</script>

<style scoped>
.period-grid__navigation {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  flex-shrink: 0;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}
.period-grid__navigation :deep(.base-button) { max-width: 100%; height: auto; }
.period-grid__navigation :deep(.base-button__text) { min-width: 0; white-space: normal; overflow-wrap: anywhere; }
.period-grid__next-control { margin-left: auto; }
.period-grid__end-label {
  margin-left: auto;
  align-self: center;
  /* Recul optique : le texte collé au bord paraît dépasser de la frise. */
  padding: 1px 2px 1px 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.period-grid__next-icon { margin-left: var(--spacing-xs); vertical-align: middle; }
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
  overflow-x: hidden;
  overflow-y: auto;
  container-type: size;
  background-color: var(--color-background-default);
}

.timeline-container {
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
  min-height: 100%;
  width: 100%;
}

.periods-container {
  flex: 1 0 auto;
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: calc(var(--spacing-xs) / 2);
}

.period-grid__surface {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing-xs) / 2);
}

.period-grid__empty-detail { color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-top: var(--spacing-md); }

.period-row {
  position: relative;
  width: 100%;
  overflow: hidden;
  /* Rogner sans créer de zone défilable : le focus d'une carte agrandie au bord ne décale plus la rangée. */
  overflow: clip;
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
  /* Keep half the visible container below the axis, so scrolling can bring it to the centre. */
  flex: 0 0 auto;
  min-height: 50cqh;
  position: relative;
  /* Les infobulles figées restent sous les menus téléportés de l’application. */
  z-index: var(--z-index-timeline-item);
  width: 100%;
}

/* ─── Cartes de période : entrée en fondu décalé ──────────────────────────── */

.period-grid__period-position {
  position: absolute;
  /* Keep the minimum clickable width inside the frame, including tiny periods ending today. */
  left: min(var(--period-left), calc(100% - var(--spacing-xs)));
  width: var(--period-width);
  min-width: var(--spacing-xs);
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
