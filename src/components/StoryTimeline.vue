<template>
  <div v-if="hasItems" class="story-timeline" :class="{ 'story-timeline--compact': compact }" @click.self="emit('deselect')">
    <div v-if="bounds" class="story-timeline__track" ref="trackRef" :style="{ height: trackHeight + 'px' }" @click.self="emit('deselect')">
      <!-- Axe -->
      <div v-if="!compact || positionedEvents.length" class="story-timeline__axis" />

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
          '--story-period-top': p.top + 'px',
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
      <Button variant="tertiary" size="xs" v-for="p in undatedPeriods" :key="`p:${p.id}`" type="button" @click="emit('select-period', p.id)">{{ p.label?.fr || p.id }}</Button>
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
import { computed, ref } from 'vue';
import { getStoryPeriodParentId } from '@/lib/storyPeriodParent';
import { EVENT_IMPORTANCE_LABELS } from '@/lib/eventImportance';
import type { StoryTimelinePeriod as InPeriod, StoryTimelineEvent as InEvent } from '@/types/storyTimeline';
import type { EventImportance } from '@/types/database';
import { COMPACT_BAR_HEIGHT, COMPACT_LANE_GAP, COMPACT_ROOT_HEIGHT, layoutCompactLanes } from '@/lib/compactStoryTimeline';
import { resolveYearsBeforePresent, compareYearsOldestFirst } from '@temporal';
import {
  formatStoryTimelineBoundLabel,
  formatStoryTimelinePeriodDetail,
} from '@/lib/storyTimelineLabels';

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

interface PosPeriod { id: string; label: string; detail: string; left: number; width: number; startYbp: number; row: number; top: number; depth: number; isRoot: boolean }

const positionedPeriods = computed<PosPeriod[]>(() => {
  const b = bounds.value;
  if (!b) return [];

  const periods = datedPeriods.value;
  const periodIds = new Set(periods.map(p => p.id));

  type DatedPeriod = typeof periods[number];
  function toPos(p: DatedPeriod, depth: number): PosPeriod {
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

  function traverse(p: DatedPeriod, depth: number) {
    const isRoot = depth === 0;
    if (isRoot && !firstGroup) rowCursor += GROUP_GAP;
    if (isRoot) firstGroup = false;
    const pos = toPos(p, depth);
    pos.row = rowCursor;
    pos.top = rowCursor * ROW_STEP + ROW_OFFSET;
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

  // Miniature : racines et enfants directs seulement, sur un nombre de lignes borné.
  if (props.compact) return layoutCompactLanes(ordered.filter(period => period.depth <= 1)).placed.map(period => ({ ...period, row: period.lane }));
  return ordered;
});
const compactPeriodsHeight = computed(() => props.compact ? Math.max(0, ...positionedPeriods.value.map(p => p.top + (p.isRoot ? COMPACT_ROOT_HEIGHT : COMPACT_BAR_HEIGHT))) : 0);

// ─── Événements positionnés ───────────────────────────────────────────────────

interface PosEvent { id: string; label: string; detail: string; left: number; importance: EventImportance }

const positionedEvents = computed<PosEvent[]>(() => {
  const b = bounds.value;
  if (!b) return [];
  return datedEvents.value.map(e => {
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
  if (props.compact) return compactPeriodsHeight.value + (positionedEvents.value.length ? (compactPeriodsHeight.value ? COMPACT_LANE_GAP : 0) + 16 : 0);
  return Math.max(68, ROW_OFFSET + (maxRow + 1) * ROW_STEP + 8);
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
  padding: var(--spacing-lg) var(--spacing-md) var(--spacing-sm);
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

.story-timeline__period-bar {
  position: absolute;
  left: var(--story-period-left);
  width: var(--story-period-width);
  top: var(--story-period-top);
  height: var(--spacing-sm);
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
  height: calc(var(--spacing-sm) + var(--spacing-xs) / 2);
}

.story-timeline__period-bar--root:hover {
  opacity: 1;
}

.story-timeline__period-bar--selected {
  opacity: 1;
  box-shadow: 0 0 0 2px var(--color-surface-default), 0 0 0 calc(var(--radius-md) * 7 / 12) var(--color-data-period);
}

.story-timeline__period-bar--root.story-timeline__period-bar--selected {
  box-shadow: 0 0 0 2px var(--color-surface-default), 0 0 0 calc(var(--radius-md) * 7 / 12) var(--color-data-period-root);
}

.story-timeline__event-marker {
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
  margin-top: var(--spacing-xs);
}

.story-timeline__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  line-height: var(--line-height-small);
}

.story-timeline--compact { padding: 0; width: 100%; border: 0; overflow: hidden; pointer-events: none; }
/* Bars of one line keep a 2px gap between them, like the gap between lines. */
.story-timeline--compact .story-timeline__period-bar { width: max(2px, calc(var(--story-period-width) - 2px)); height: 8px; border-radius: 3px; }
.story-timeline--compact .story-timeline__period-bar--root { height: 10px; }
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
