<template>
  <div v-if="hasItems" class="story-timeline" :class="{ 'story-timeline--compact': compact }" @click.self="emit('deselect')">
    <div v-if="bounds" class="story-timeline__track" ref="trackRef" :style="{ height: trackHeight + 'px' }" @click.self="emit('deselect')">
      <!-- Axe -->
      <div class="story-timeline__axis" />

      <!-- Barres de périodes -->
      <div
        v-for="p in positionedPeriods"
        :key="p.id"
        :data-period-id="p.id"
        class="story-timeline__period-bar"
        :class="{
          'story-timeline__period-bar--root': p.isRoot,
          'story-timeline__period-bar--selected': selectedPeriodId === p.id,
        }"
        :style="{
          '--story-period-left': p.left + '%',
          '--story-period-width': Math.max(p.width, 0.5) + '%',
          '--story-period-top': p.row * (compact ? 10 : ROW_STEP) + (compact ? 0 : ROW_OFFSET) + 'px',
        }"
        @click="emit('select-period', p.id)"
        @mouseenter="showTooltip($event, p.label, p.detail)"
        @mouseleave="hideTooltip"
      />

      <!-- Marqueurs d'événements -->
      <div
        v-for="e in positionedEvents"
        :key="e.id"
        class="story-timeline__event-marker"
        :class="{ 'story-timeline__event-marker--selected': selectedEventId === e.id }"
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
      <button v-for="p in undatedPeriods" :key="`p:${p.id}`" type="button" @click="emit('select-period', p.id)">{{ p.label?.fr || p.id }}</button>
      <button v-for="e in undatedEvents" :key="`e:${e.id}`" type="button" @click="emit('select-event', e.id)">{{ typeof e.label === 'string' ? e.label : e.label?.fr || e.id }}</button>
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
import { computed, ref } from 'vue';
import { getStoryPeriodParentId } from '@/lib/storyPeriodParent';
import { resolveYearsBeforePresent, compareYearsOldestFirst } from '@temporal';
import {
  formatStoryTimelineBoundLabel,
  formatStoryTimelinePeriodDetail,
} from '@/lib/storyTimelineLabels';

interface InPeriod {
  id: string;
  label?: { fr: string; en: string };
  startDate?: string;
  endDate?: string;
  startYearsBP?: number;
  endYearsBP?: number;
  parentId?: string | null;
  storyParentId?: string | null;
}

interface InEvent {
  id: string;
  label?: { fr: string; en: string } | string;
  date?: string;
  dateYearsBP?: number;
}

const props = defineProps<{
  compact?: boolean;
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
const ROW_OFFSET = 12;

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

const coordinates = computed(() => {
  const now = Date.now();
  return {
    periods: (props.periods ?? []).map(p => ({ p, start: resolveYearsBeforePresent(p.startDate, p.startYearsBP, now), end: resolveYearsBeforePresent(p.endDate, p.endYearsBP, now) })),
    events: (props.events ?? []).map(e => ({ e, date: resolveYearsBeforePresent(e.date, e.dateYearsBP, now) })),
  };
});
const datedPeriods = computed(() => coordinates.value.periods.flatMap(({p, start, end}) => start !== null && end !== null ? [{...p, startYbp:start, endYbp:end}] : []));
const datedEvents = computed(() => coordinates.value.events.flatMap(({e, date}) => date !== null ? [{...e, dateYbp:date}] : []));
const undatedPeriods = computed(() => coordinates.value.periods.filter(row => row.start === null || row.end === null).map(row => row.p));
const undatedEvents = computed(() => coordinates.value.events.filter(row => row.date === null).map(row => row.e));
const bounds = computed(() => {
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

interface PosPeriod { id: string; label: string; detail: string; left: number; width: number; startYbp: number; row: number; isRoot: boolean }

const positionedPeriods = computed<PosPeriod[]>(() => {
  const b = bounds.value;
  if (!b) return [];

  const periods = datedPeriods.value;
  const periodIds = new Set(periods.map(p => p.id));

  type DatedPeriod = typeof periods[number];
  function toPos(p: DatedPeriod, isRoot: boolean): PosPeriod {
    const sYbp = p.startYbp;
    const eYbp = p.endYbp;
    const ancientYbp = Math.max(sYbp, eYbp);
    const recentYbp  = Math.min(sYbp, eYbp);
    return {
      id: p.id,
      label: p.label?.fr ?? '',
      detail: formatStoryTimelinePeriodDetail(p),
      left: toLeft(ancientYbp),
      width: toLeft(recentYbp) - toLeft(ancientYbp),
      startYbp: sYbp,
      row: 0,
      isRoot,
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

  function traverse(p: DatedPeriod, isRoot: boolean) {
    if (isRoot && !firstGroup) rowCursor += GROUP_GAP;
    if (isRoot) firstGroup = false;
    const pos = toPos(p, isRoot);
    pos.row = rowCursor;
    rowCursor += 1;
    ordered.push(pos);
    const children = (childrenMap.get(p.id) ?? [])
      .slice()
      .sort((a, b_) => {
        const aYbp = a.startYbp;
        const bYbp = b_.startYbp;
        return bYbp - aYbp;
      });
    for (const child of children) traverse(child, false);
  }

  roots
    .slice()
    .sort((a, b_) => {
      const aYbp = a.startYbp;
      const bYbp = b_.startYbp;
      return bYbp - aYbp;
    })
    .forEach(r => traverse(r, true));

  if (props.compact) {
    const laneEnds = [-1, -1];
    for (const period of [...ordered].sort((a, b) => a.left - b.left)) {
      if (period.isRoot) { period.row = 0; continue; }
      const free = laneEnds.findIndex(end => end <= period.left);
      const lane = free >= 0 ? free : laneEnds[0] <= laneEnds[1] ? 0 : 1;
      period.row = lane + 1;
      laneEnds[lane] = period.left + period.width;
    }
  }
  return ordered;
});

// ─── Événements positionnés ───────────────────────────────────────────────────

interface PosEvent { id: string; label: string; detail: string; left: number }

const positionedEvents = computed<PosEvent[]>(() => {
  const b = bounds.value;
  if (!b) return [];
  return datedEvents.value.map(e => {
    const ybp = e.dateYbp;
    const label = typeof e.label === 'string' ? e.label : (e.label?.fr ?? '');
    const detail = e.date ? formatStoryTimelineBoundLabel(e.date) : '';
    return { id: e.id, label, detail, left: toLeft(ybp) };
  });
});

// ─── Hauteur du track ────────────────────────────────────────────────────────

const trackHeight = computed(() => {
  const pp = positionedPeriods.value;
  const maxRow = pp.length === 0 ? 0 : Math.max(...pp.map(p => p.row));
  return props.compact ? 42 : Math.max(68, ROW_OFFSET + (maxRow + 1) * ROW_STEP + 8);
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
.story-timeline__undated button { color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--border-radius-sm); padding: var(--spacing-xs) var(--spacing-sm); cursor: pointer; }

.story-timeline {
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-surface);
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
  background: var(--color-border);
}

.story-timeline__period-bar {
  position: absolute;
  left: var(--story-period-left);
  width: var(--story-period-width);
  top: var(--story-period-top);
  height: var(--spacing-sm);
  border-radius: calc(var(--radius-md) / 2);
  background: var(--color-period);
  opacity: 0.8;
  cursor: pointer;
  transition: opacity var(--transition-fast), box-shadow var(--transition-fast);
}

.story-timeline__period-bar:hover {
  opacity: 1;
}

.story-timeline__period-bar--root {
  background: var(--color-period-root);
  opacity: 0.8;
  height: calc(var(--spacing-sm) + var(--spacing-xs) / 2);
}

.story-timeline__period-bar--root:hover {
  opacity: 1;
}

.story-timeline__period-bar--selected {
  opacity: 1;
  box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 calc(var(--radius-md) * 7 / 12) var(--color-period);
}

.story-timeline__period-bar--root.story-timeline__period-bar--selected {
  box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 calc(var(--radius-md) * 7 / 12) var(--color-period-root);
}

.story-timeline__event-marker {
  position: absolute;
  bottom: -4px;
  width: var(--spacing-sm);
  height: var(--spacing-sm);
  transform: translateX(-50%) rotate(45deg);
  background: var(--color-event);
  border-radius: calc(var(--radius-sm) / 4);
  cursor: pointer;
  transition: opacity var(--transition-fast), box-shadow var(--transition-fast);
}

.story-timeline__event-marker:hover {
  opacity: 0.85;
}

.story-timeline__event-marker--selected {
  opacity: 1;
  box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 calc(var(--radius-md) * 7 / 12) var(--color-event);
}

.story-timeline__foot {
  display: flex;
  justify-content: space-between;
  margin-top: var(--spacing-xs);
}

.story-timeline__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}
</style>

<style>
/* Non scoped : le tooltip est téléporté dans <body> */
.story-timeline-tooltip {
  position: fixed;
  z-index: var(--z-index-tooltip, 9999);
  transform: translate(-50%, -100%);
  background: var(--color-neutral-800);
  color: var(--color-neutral-0);
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
  font-weight: 500;
  line-height: 1.4;
}

.story-timeline-tooltip__detail {
  font-size: var(--font-size-xs);
  opacity: 0.75;
  line-height: 1.3;
}
</style>

<style scoped>
.story-timeline { padding-top: 16px; background: var(--color-background); }
.story-timeline__label { line-height: 16px; }
.story-timeline--compact { margin-top: auto; padding: 0; width: 100%; height: 48px; border: 0; overflow: hidden; background: transparent; pointer-events: none; }
.story-timeline--compact .story-timeline__track { max-height: 40px; }
.story-timeline--compact .story-timeline__axis { display: none; }
.story-timeline--compact .story-timeline__period-bar { height: 8px; border-radius: 2px; }
.story-timeline--compact .story-timeline__period-bar--root { height: 10px; }
.story-timeline--compact .story-timeline__event-marker { width: 5px; height: 5px; bottom: -3px; }
.story-timeline--compact .story-timeline__undated { display: none; }
</style>
