<template>
  <div v-if="hasItems" class="story-timeline" :class="{ 'story-timeline--compact': compact, 'story-timeline--collapsible': collapsible, 'story-timeline--proportional':proportional }" :style="{ '--story-bar-height': barSizes.barHeight + 'px', '--story-root-height': barSizes.rootHeight + 'px' }" @click.self="emit('deselect')">
    <div v-if="bounds" class="story-timeline__track" ref="trackRef" :style="{ height: trackHeight + 'px' }" @click.self="emit('deselect')">
      <!-- Axe -->
      <div v-if="!compact || positionedEvents.length" class="story-timeline__axis" />

      <!-- Barres de périodes -->
      <div
        v-for="p in positionedPeriods"
        :key="p.id"
        :data-period-id="p.id"
        class="story-timeline__period"
        :class="{ 'story-timeline__period--root': p.isRoot }"
        :style="{
          '--story-period-left': p.left + '%',
          '--story-period-width': (proportional?p.width:Math.max(p.width, 0.5)) + '%',
          '--story-period-top': p.top + 'px',
        }"
      >
        <component
          :is="compact && !collapsible ? 'div' : 'button'"
          :type="compact && !collapsible ? undefined : 'button'"
          :aria-label="`${p.label} · ${p.detail}`"
          :aria-pressed="compact && !collapsible ? undefined : selectedPeriodId === p.id"
          class="story-timeline__period-bar"
          :class="{ 'story-timeline__period-bar--root': p.isRoot, 'story-timeline__period-bar--selected': selectedPeriodId === p.id, 'story-timeline__period-bar--has-children': collapsible && parentIds.has(p.id) }"
          @click="emit('select-period', p.id)"
          @mouseenter="showTooltip($event, p.label, p.detail)"
          @mouseleave="hideTooltip"
        >
          <span v-if="collapsible" class="story-timeline__period-content" aria-hidden="true">
            <span class="story-timeline__period-name">{{ p.label }}</span>
            <span class="story-timeline__period-dates">{{ p.detail }}</span>
          </span>
        </component>
        <button v-if="collapsible && parentIds.has(p.id)" type="button" class="story-timeline__period-toggle"
          :aria-label="toggleLabel(p.id, p.label)" :title="toggleLabel(p.id, p.label)" :aria-expanded="!collapsedIds.has(p.id)"
          @click.stop="togglePeriod(p.id)" @mouseenter="hideTooltip">
          <Icon :icon="collapsedIds.has(p.id) ? 'mdi:chevron-right' : 'mdi:chevron-down'" aria-hidden="true" />
        </button>
      </div>

      <!-- Marqueurs d'événements -->
      <component
        :is="compact && !collapsible ? 'div' : 'button'"
        :type="compact && !collapsible ? undefined : 'button'"
        v-for="e in positionedEvents"
        :key="e.id"
        :data-event-id="e.id"
        class="story-timeline__event-marker"
        :aria-label="`${e.label}${e.detail ? ' · ' + e.detail : ''}`"
        :aria-pressed="compact && !collapsible ? undefined : selectedEventId === e.id"
        :class="{
          'story-timeline__event-marker--selected': selectedEventId === e.id,
          'story-timeline__event-marker--major': e.importance === 'major',
          'story-timeline__event-marker--minor': e.importance === 'minor',
        }"
        :style="{ left: e.left + '%' }"
        @click="emit('select-event', e.id)"
        @mouseenter="showTooltip($event, e.label, e.detail)"
        @mouseleave="hideTooltip"
      />
    </div>

    <!-- Labels bornes -->
    <div v-if="bounds && !compact" class="story-timeline__foot">
      <span class="story-timeline__label">{{ startLabel }}</span>
      <span class="story-timeline__label">{{ endLabel }}</span>
    </div>

    <div v-if="undatedPeriods.length || undatedEvents.length" class="story-timeline__undated">
      <span>Dates non déterminées</span>
      <span v-for="p in undatedPeriods" :key="`p:${p.id}`" class="story-timeline__undated-group">
        <Button variant="tertiary" size="xs" type="button" @click="emit('select-period', p.id)">{{ p.label?.fr || p.id }}</Button>
        <button v-if="collapsible && parentIds.has(p.id)" type="button" class="story-timeline__period-toggle story-timeline__period-toggle--undated"
          :aria-label="toggleLabel(p.id, p.label?.fr || p.id)" :title="toggleLabel(p.id, p.label?.fr || p.id)" :aria-expanded="!collapsedIds.has(p.id)" @click.stop="togglePeriod(p.id)">
          <Icon :icon="collapsedIds.has(p.id) ? 'mdi:chevron-right' : 'mdi:chevron-down'" aria-hidden="true" />
        </button>
      </span>
      <Button variant="tertiary" size="xs" v-for="e in undatedEvents" :key="`e:${e.id}`" type="button" @click="emit('select-event', e.id)">{{ typeof e.label === 'string' ? e.label : e.label?.fr || e.id }}</Button>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div
        v-if="tooltip"
        class="story-timeline-tooltip"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
      >
        <span class="story-timeline-tooltip__name">{{ tooltip.label }}</span>
        <span v-if="tooltip.detail" class="story-timeline-tooltip__detail">{{ tooltip.detail }}</span>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/base/Button.vue';
import { Icon } from '@iconify/vue';
import { computed, ref, watch } from 'vue';
import { getStoryPeriodParentId } from '@/lib/storyPeriodParent';
import { EVENT_IMPORTANCE_LABELS } from '@/lib/eventImportance';
import type { StoryTimelinePeriod as InPeriod, StoryTimelineEvent as InEvent } from '@/types/storyTimeline';
import type { EventImportance } from '@/types/database';
import { COMPACT_BAR_HEIGHT, COMPACT_LANE_GAP, COMPACT_ROOT_HEIGHT, INTERACTIVE_BAR_SIZES, layoutCompactLanes } from '@/lib/compactStoryTimeline';
import { comparableYearsBeforePresent, compareYearsOldestFirst } from '@temporal';
import {
  formatStoryTimelineBoundLabel,
  formatStoryTimelinePeriodDetail,
} from '@/lib/storyTimelineLabels';

const props = defineProps<{
  compact?: boolean;
  collapsible?: boolean;
  proportional?: boolean;
  timeBounds?: {start:number;end:number};
  referenceTime?: number;
  periods?: InPeriod[];
  events?: InEvent[];
  selectedPeriodId?: string | null;
  selectedEventId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'select-period', id: string): void;
  (e: 'select-event', id: string): void;
  (e: 'deselect'): void;
}>();

// ─── Constantes layout ───────────────────────────────────────────────────────

const ROW_STEP = 12;
const ROW_OFFSET = 16;
const barSizes = computed(() => props.collapsible ? INTERACTIVE_BAR_SIZES : { rootHeight: COMPACT_ROOT_HEIGHT, barHeight: COMPACT_BAR_HEIGHT, gap: COMPACT_LANE_GAP });
const rowStep = computed(() => props.collapsible ? barSizes.value.rootHeight + barSizes.value.gap : ROW_STEP);

// Folding affects the preview only; bounds and selected catalogue items stay intact.
const collapsedIds = ref(new Set<string>());
const periodsById = computed(() => new Map((props.periods ?? []).map(period => [period.id, period])));
const parentIds = computed(() => new Set((props.periods ?? []).flatMap(period => {
  const parent = getStoryPeriodParentId(period);
  return parent && parent !== period.id && periodsById.value.has(parent) ? [parent] : [];
})));
const visiblePeriodIds = computed(() => new Set((props.periods ?? []).filter(period => {
  if (!props.collapsible) return true;
  const visited = new Set([period.id]);
  let parent = getStoryPeriodParentId(period);
  while (parent && !visited.has(parent) && periodsById.value.has(parent)) {
    if (collapsedIds.value.has(parent)) return false;
    visited.add(parent);
    parent = getStoryPeriodParentId(periodsById.value.get(parent)!);
  }
  return true;
}).map(period => period.id)));

watch(parentIds, parents => {
  const retained = new Set([...collapsedIds.value].filter(id => parents.has(id)));
  if (retained.size !== collapsedIds.value.size) collapsedIds.value = retained;
});

function togglePeriod(id: string) {
  if (!props.collapsible || !parentIds.value.has(id)) return;
  const next = new Set(collapsedIds.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  collapsedIds.value = next;
  hideTooltip();
}

const toggleLabel = (id: string, label: string) => `${collapsedIds.value.has(id) ? 'Déplier' : 'Replier'} les sous-périodes de ${label}`;

// ─── Tooltip ─────────────────────────────────────────────────────────────────

const TOOLTIP_OFFSET = 12; // px au-dessus du curseur
const tooltip = ref<{ label: string; detail: string; x: number; y: number } | null>(null);

function showTooltip(e: MouseEvent, label: string, detail: string) {
  tooltip.value = {
    label,
    detail,
    x: e.clientX,
    y: e.clientY - TOOLTIP_OFFSET,
  };
}

function hideTooltip() {
  tooltip.value = null;
}

// ─── Bornes globales ──────────────────────────────────────────────────────────

// The dates are re-read at one instant: stored coordinates were computed at different times and
// would make a same-day sub-period overflow its parent. A stored number is used only without text.
const coordinates = computed(() => {
  const now = props.referenceTime ?? Date.now();
  return {
    periods: (props.periods ?? []).map(p => ({ p, start: comparableYearsBeforePresent(p.startDate, p.startYearsBP, now), end: comparableYearsBeforePresent(p.endDate, p.endYearsBP, now) })),
    events: (props.events ?? []).map(e => ({ e, date: comparableYearsBeforePresent(e.date, e.dateYearsBP, now) })),
  };
});
const datedPeriods = computed(() => coordinates.value.periods.flatMap(({p, start, end}) => start !== null && end !== null ? [{...p, startYbp:start, endYbp:end}] : []));
const datedEvents = computed(() => coordinates.value.events.flatMap(({e, date}) => date !== null ? [{...e, dateYbp:date}] : []));
const undatedPeriods = computed(() => coordinates.value.periods.filter(row => visiblePeriodIds.value.has(row.p.id) && (row.start === null || row.end === null)).map(row => row.p));
const undatedEvents = computed(() => coordinates.value.events.filter(row => row.date === null).map(row => row.e));
const bounds = computed(() => {
  if (props.timeBounds) {
    const min=Math.min(props.timeBounds.start,props.timeBounds.end),max=Math.max(props.timeBounds.start,props.timeBounds.end);
    return {min,max,range:max-min};
  }
  const ybps = [...datedPeriods.value.flatMap(p => [p.startYbp, p.endYbp]), ...datedEvents.value.map(e => e.dateYbp)];
  if (!ybps.length) return null;
  const min = Math.min(...ybps), max = Math.max(...ybps);
  return { min, max, range: max - min };
});

const hasItems = computed(() =>
  (props.periods?.length ?? 0) + (props.events?.length ?? 0) > 0
);

// ─── Projection linéaire ──────────────────────────────────────────────────────
// left = 0% → passé lointain (max ybp)   left = 100% → présent (min ybp)

function toLeft(ybp: number): number {
  const b = bounds.value;
  if (!b || b.range === 0) return 50;
  return ((b.max - ybp) / b.range) * 100;
}

// ─── Périodes positionnées + stagger vertical ─────────────────────────────────

interface PosPeriod { id: string; label: string; detail: string; left: number; width: number; startYbp: number; row: number; top: number; depth: number; isRoot: boolean }

const positionedPeriods = computed<PosPeriod[]>(() => {
  const b = bounds.value;
  if (!b) return [];

  const periods = datedPeriods.value.filter(period => visiblePeriodIds.value.has(period.id)
    && (!props.proportional || Math.max(period.startYbp,period.endYbp)>=b.min && Math.min(period.startYbp,period.endYbp)<=b.max));
  const periodIds = new Set(periods.map(p => p.id));

  type DatedPeriod = typeof periods[number];
  function toPos(p: DatedPeriod, depth: number): PosPeriod {
    const sYbp = p.startYbp;
    const eYbp = p.endYbp;
    const ancientYbp = Math.max(sYbp, eYbp);
    const recentYbp  = Math.min(sYbp, eYbp);
    const left=toLeft(ancientYbp),right=toLeft(recentYbp);
    const bounded=(value:number)=>Math.max(0,Math.min(100,value));
    return {
      id: p.id,
      label: p.label?.fr || p.label?.en || p.id,
      detail: formatStoryTimelinePeriodDetail(p),
      left: props.proportional?bounded(left):left,
      width: props.proportional?bounded(right)-bounded(left):right-left,
      startYbp: sYbp,
      row: 0,
      top: 0,
      depth,
      isRoot: depth === 0,
    };
  }

  // Construction de l'arbre dans le contexte de la story
  const childrenMap = new Map<string, DatedPeriod[]>();
  const roots: DatedPeriod[] = [];
  for (const p of periods) {
    const parentId = getStoryPeriodParentId(p);
    if (!parentId || !periodIds.has(parentId)) {
      roots.push(p);
    } else {
      const arr = childrenMap.get(parentId) ?? [];
      arr.push(p);
      childrenMap.set(parentId, arr);
    }
  }

  // Parcours en profondeur : racine → enfants (du plus vieux au plus récent)
  // row est un flottant : on ajoute GROUP_GAP avant chaque nouveau groupe (sauf le premier)
  const GROUP_GAP = 0.6;
  const ordered: PosPeriod[] = [];
  let rowCursor = 0;
  let firstGroup = true;
  const visited = new Set<string>();

  function traverse(p: DatedPeriod, depth: number) {
    if (visited.has(p.id)) return;
    visited.add(p.id);
    const isRoot = depth === 0;
    if (isRoot && !firstGroup) rowCursor += GROUP_GAP;
    if (isRoot) firstGroup = false;
    const pos = toPos(p, depth);
    pos.row = rowCursor;
    pos.top = rowCursor * rowStep.value + ROW_OFFSET;
    rowCursor += 1;
    ordered.push(pos);
    const children = (childrenMap.get(p.id) ?? [])
      .slice()
      .sort((a, b_) => {
        const aYbp = a.startYbp;
        const bYbp = b_.startYbp;
        return bYbp - aYbp;
      });
    for (const child of children) traverse(child, depth + 1);
  }

  roots
    .slice()
    .sort((a, b_) => {
      const aYbp = a.startYbp;
      const bYbp = b_.startYbp;
      return bYbp - aYbp;
    })
    .forEach(r => traverse(r, 0));

  // Legacy cycles remain bounded and visible instead of recursing indefinitely.
  periods.filter(period => !visited.has(period.id)).forEach(period => traverse(period, 0));

  // Passive cards stay bounded. Interactive previews expose every expanded level.
  if (props.compact) {
    const bars = props.collapsible ? ordered : ordered.filter(period => period.depth <= 1);
    return layoutCompactLanes(bars, props.collapsible ? bars.length : undefined, barSizes.value).placed.map(period => ({ ...period, row: period.lane }));
  }
  return ordered;
});
const compactPeriodsHeight = computed(() => props.compact ? Math.max(0, ...positionedPeriods.value.map(p => p.top + (p.isRoot ? barSizes.value.rootHeight : barSizes.value.barHeight))) : 0);

// ─── Événements positionnés ───────────────────────────────────────────────────

interface PosEvent { id: string; label: string; detail: string; left: number; importance: EventImportance }

const positionedEvents = computed<PosEvent[]>(() => {
  const b = bounds.value;
  if (!b) return [];
  return datedEvents.value.filter(e=>!props.proportional || e.dateYbp>=b.min&&e.dateYbp<=b.max).map(e => {
    const ybp = e.dateYbp;
    const label = typeof e.label === 'string' ? e.label : (e.label?.fr ?? '');
    const importance = e.importance ?? 'normal';
    const date = e.date ? formatStoryTimelineBoundLabel(e.date) : '';
    // Le niveau par défaut n'est pas annoncé : seuls les écarts sont utiles.
    const detail = [date, importance === 'normal' ? '' : EVENT_IMPORTANCE_LABELS[importance]].filter(Boolean).join(' · ');
    return { id: e.id, label, detail, left: toLeft(ybp), importance };
  });
});

// ─── Hauteur du track ────────────────────────────────────────────────────────

const trackHeight = computed(() => {
  const pp = positionedPeriods.value;
  const maxRow = pp.length === 0 ? 0 : Math.max(...pp.map(p => p.row));
  // Compact : les événements occupent une ligne de 16 px sous les périodes, avec le même écart.
  if (props.compact) return compactPeriodsHeight.value + (positionedEvents.value.length ? (compactPeriodsHeight.value ? barSizes.value.gap : 0) + 16 : 0);
  return Math.max(68, ROW_OFFSET + (maxRow + 1) * rowStep.value + 8);
});

// ─── Labels bornes ────────────────────────────────────────────────────────────

const boundLabels = computed(() => {
  const rows = [
    ...datedPeriods.value.flatMap(p => [{raw:p.startDate!, value:p.startYbp}, {raw:p.endDate!, value:p.endYbp}]),
    ...datedEvents.value.map(e => ({raw:e.date!, value:e.dateYbp})),
  ].sort((a,b) => compareYearsOldestFirst(a.value,b.value));
  return { start: rows[0]?.raw, end: rows[rows.length - 1]?.raw };
});
const startLabel = computed(() => boundLabels.value.start ? formatStoryTimelineBoundLabel(boundLabels.value.start) : '');
const endLabel = computed(() => boundLabels.value.end ? formatStoryTimelineBoundLabel(boundLabels.value.end) : '');

const trackRef = ref<HTMLElement | null>(null);
</script>

<style scoped>
.story-timeline__undated { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm); margin-top: var(--spacing-sm); }


.story-timeline {
  padding: var(--spacing-lg) var(--spacing-md);
  border-bottom: 1px solid var(--color-border-default);
  flex-shrink: 0;
  background: transparent;
}

.story-timeline__track {
  position: relative;
  width: 100%;
}

.story-timeline__axis {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--color-border-default);
}

.story-timeline__period {
  container-type: inline-size;
  position: absolute;
  left: var(--story-period-left);
  width: var(--story-period-width);
  top: var(--story-period-top);
  height: var(--story-bar-height);
}
.story-timeline__period--root { height: var(--story-root-height); }

.story-timeline__period-bar {
  border: 0;
  padding: 0;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: calc(var(--radius-md) / 2);
  background: var(--color-data-period);
  opacity: 0.8;
  cursor: pointer;
  transition: opacity var(--transition-fast), box-shadow var(--transition-fast);
}

.story-timeline__period-bar:hover {
  opacity: 1;
}

.story-timeline__period-bar--root {
  background: var(--color-data-period-root);
  opacity: 0.8;
}

.story-timeline__period-bar--root:hover {
  opacity: 1;
}

.story-timeline--collapsible .story-timeline__period-bar { opacity: 1; color: var(--color-text-on-period); }
.story-timeline__period-content { display: flex; align-items: center; gap: var(--spacing-sm); width: 100%; height: 100%; min-width: 0; box-sizing: border-box; padding-inline: var(--spacing-xs); overflow: hidden; text-align: left; font: var(--type-micro); }
.story-timeline__period-bar--has-children .story-timeline__period-content { padding-right: calc(var(--spacing-lg) + var(--spacing-xs)); }
.story-timeline__period-name { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.story-timeline__period-dates { flex: 0 1 auto; min-width: 0; max-width: 65%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: inherit; opacity: .7; font-variant-numeric: tabular-nums; }
@container (max-width: 240px) {
  .story-timeline__period-dates { display: none; }
}

.story-timeline__period-bar--selected {
  opacity: 1;
  box-shadow: 0 0 0 2px var(--color-surface-default), 0 0 0 calc(var(--radius-md) * 7 / 12) var(--color-data-period);
}

.story-timeline__period-bar--root.story-timeline__period-bar--selected {
  box-shadow: 0 0 0 2px var(--color-surface-default), 0 0 0 calc(var(--radius-md) * 7 / 12) var(--color-data-period-root);
}

.story-timeline__event-marker {
  padding: 0;
  /* Taille selon l'importance dans la frise ; le losange, bordure comprise, reste centré sur l'axe. */
  --marker-size: var(--spacing-sm);
  position: absolute;
  bottom: calc((var(--marker-size) + 2px) / -2);
  box-sizing: content-box;
  width: var(--marker-size);
  height: var(--marker-size);
  /* Bordure couleur du fond : sépare les losanges qui se touchent ou chevauchent l'axe. */
  border: 1px solid var(--story-timeline-background, var(--color-background-default));
  transform: translateX(-50%) rotate(45deg);
  background: var(--color-data-event);
  border-radius: calc(var(--radius-sm) / 4);
  cursor: pointer;
  transition: opacity var(--transition-fast), box-shadow var(--transition-fast);
}

.story-timeline__event-marker--major { --marker-size: var(--spacing-md); z-index: 1; }
.story-timeline__event-marker--minor { --marker-size: 6px; opacity: 0.55; }

.story-timeline__event-marker:hover {
  opacity: 0.85;
}

.story-timeline__event-marker--selected {
  opacity: 1;
  box-shadow: 0 0 0 2px var(--color-surface-default), 0 0 0 calc(var(--radius-md) * 7 / 12) var(--color-data-event);
}

.story-timeline__foot {
  display: flex;
  justify-content: space-between;
  margin-top: var(--spacing-sm);
}

/* A rotated marker extends half its bordered diagonal below the axis.
   Reserve that overflow so the 8px margin remains clear beneath the diamonds. */
.story-timeline__track:has(.story-timeline__event-marker) + .story-timeline__foot {
  padding-top: calc((var(--spacing-sm) + 2px) * .707107);
}
.story-timeline__track:has(.story-timeline__event-marker--major) + .story-timeline__foot {
  padding-top: calc((var(--spacing-md) + 2px) * .707107);
}

.story-timeline__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  line-height: var(--line-height-small);
}

.story-timeline--compact { padding: 0; width: 100%; border: 0; overflow: hidden; pointer-events: none; }
.story-timeline--collapsible { pointer-events: auto; overflow: visible; }
.story-timeline__period-bar:focus-visible, .story-timeline__event-marker:focus-visible, .story-timeline__period-toggle:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }
.story-timeline__period-toggle { position: absolute; inset: 0 0 0 auto; display: flex; align-items: center; justify-content: center; width: var(--spacing-lg); padding: 0; border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); background: var(--color-surface-raised); color: var(--color-text-primary); cursor: pointer; }
.story-timeline__period-toggle:hover { background: var(--color-surface-subtle); }
.story-timeline__period-toggle svg { width: 14px; height: 14px; }
.story-timeline__undated-group { display: inline-flex; align-items: center; gap: var(--spacing-xs); }
.story-timeline__period-toggle--undated { position: static; width: var(--field-height-sm); height: var(--field-height-sm); }
/* Bars of one line keep a 2px gap between them, like the gap between lines. */
.story-timeline--compact .story-timeline__period { width: max(2px, calc(var(--story-period-width) - 2px)); }
.story-timeline--compact.story-timeline--proportional .story-timeline__period {width:var(--story-period-width);}
.story-timeline--compact .story-timeline__period-bar { border-radius: 3px; }
.story-timeline--compact .story-timeline__axis { bottom: 8px; }
.story-timeline--compact .story-timeline__event-marker { --marker-size: 6px; bottom: calc(8px - (var(--marker-size) + 2px) / 2); }
.story-timeline--compact .story-timeline__event-marker--major { --marker-size: 9px; }
.story-timeline--compact .story-timeline__event-marker--minor { --marker-size: 4px; }
.story-timeline--compact .story-timeline__undated { display: none; }
</style>

<style>
/* Non scoped : le tooltip est téléporté dans <body> */
.story-timeline-tooltip {
  position: fixed;
  z-index: var(--z-index-tooltip, 9999);
  transform: translate(-50%, -100%);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-xs) calc(var(--spacing-sm) + var(--spacing-xs) / 2);
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing-xs) / 4);
  white-space: nowrap;
  box-shadow: var(--shadow-md);
}

.story-timeline-tooltip__name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: 1.4;
}

.story-timeline-tooltip__detail {
  font-size: var(--font-size-xs);
  opacity: 0.75;
  line-height: 1.3;
}
</style>
