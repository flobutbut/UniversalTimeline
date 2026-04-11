<template>
  <div v-if="hasItems" class="story-timeline" @click.self="emit('deselect')">
    <div class="story-timeline__track" ref="trackRef" :style="{ height: trackHeight + 'px' }" @click.self="emit('deselect')">
      <!-- Axe -->
      <div class="story-timeline__axis" />

      <!-- Barres de périodes -->
      <div
        v-for="p in positionedPeriods"
        :key="p.id"
        class="story-timeline__period-bar"
        :class="{
          'story-timeline__period-bar--root': p.isRoot,
          'story-timeline__period-bar--selected': selectedPeriodId === p.id,
        }"
        :style="{
          '--story-period-left': p.left + '%',
          '--story-period-width': Math.max(p.width, 0.5) + '%',
          '--story-period-top': p.row * ROW_STEP + ROW_OFFSET + 'px',
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
    <div class="story-timeline__foot">
      <span class="story-timeline__label">{{ startLabel }}</span>
      <span class="story-timeline__label">{{ endLabel }}</span>
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
import { DateService } from '@/services/DateService';
import {
  formatStoryTimelineBoundLabel,
  formatStoryTimelinePeriodDetail,
} from '@/lib/storyTimelineLabels';

interface InPeriod {
  id: string;
  label?: { fr: string; en: string };
  startDate?: string;
  endDate?: string;
  parentId?: string | null;
}

interface InEvent {
  id: string;
  label?: { fr: string; en: string } | string;
  date?: string;
}

const props = defineProps<{
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

const bounds = computed(() => {
  const ybps: number[] = [];
  for (const p of props.periods ?? []) {
    if (p.startDate) ybps.push(DateService.toYearsBP(p.startDate));
    if (p.endDate)   ybps.push(DateService.toYearsBP(p.endDate));
  }
  for (const e of props.events ?? []) {
    if (e.date) ybps.push(DateService.toYearsBP(e.date));
  }
  if (ybps.length === 0) return null;
  const min = Math.min(...ybps);
  const max = Math.max(...ybps);
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
  const { min, max } = b;

  const periods = props.periods ?? [];
  const periodIds = new Set(periods.map(p => p.id));

  function toPos(p: InPeriod, isRoot: boolean): PosPeriod {
    const sYbp = p.startDate ? DateService.toYearsBP(p.startDate) : max;
    const eYbp = p.endDate   ? DateService.toYearsBP(p.endDate)   : min;
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
  const childrenMap = new Map<string, InPeriod[]>();
  const roots: InPeriod[] = [];
  for (const p of periods) {
    if (!p.parentId || !periodIds.has(p.parentId)) {
      roots.push(p);
    } else {
      const arr = childrenMap.get(p.parentId) ?? [];
      arr.push(p);
      childrenMap.set(p.parentId, arr);
    }
  }

  // Parcours en profondeur : racine → enfants (du plus vieux au plus récent)
  // row est un flottant : on ajoute GROUP_GAP avant chaque nouveau groupe (sauf le premier)
  const GROUP_GAP = 0.6;
  const ordered: PosPeriod[] = [];
  let rowCursor = 0;
  let firstGroup = true;

  function traverse(p: InPeriod, isRoot: boolean) {
    if (isRoot && !firstGroup) rowCursor += GROUP_GAP;
    if (isRoot) firstGroup = false;
    const pos = toPos(p, isRoot);
    pos.row = rowCursor;
    rowCursor += 1;
    ordered.push(pos);
    const children = (childrenMap.get(p.id) ?? [])
      .slice()
      .sort((a, b_) => {
        const aYbp = a.startDate ? DateService.toYearsBP(a.startDate) : 0;
        const bYbp = b_.startDate ? DateService.toYearsBP(b_.startDate) : 0;
        return bYbp - aYbp;
      });
    for (const child of children) traverse(child, false);
  }

  roots
    .slice()
    .sort((a, b_) => {
      const aYbp = a.startDate ? DateService.toYearsBP(a.startDate) : 0;
      const bYbp = b_.startDate ? DateService.toYearsBP(b_.startDate) : 0;
      return bYbp - aYbp;
    })
    .forEach(r => traverse(r, true));

  return ordered;
});

// ─── Événements positionnés ───────────────────────────────────────────────────

interface PosEvent { id: string; label: string; detail: string; left: number }

const positionedEvents = computed<PosEvent[]>(() => {
  const b = bounds.value;
  if (!b) return [];
  return (props.events ?? []).map(e => {
    const ybp = e.date ? DateService.toYearsBP(e.date) : b.min;
    const label = typeof e.label === 'string' ? e.label : (e.label?.fr ?? '');
    const detail = e.date ? formatStoryTimelineBoundLabel(e.date) : '';
    return { id: e.id, label, detail, left: toLeft(ybp) };
  });
});

// ─── Hauteur du track ────────────────────────────────────────────────────────

const trackHeight = computed(() => {
  const pp = positionedPeriods.value;
  const maxRow = pp.length === 0 ? 0 : Math.max(...pp.map(p => p.row));
  return ROW_OFFSET + (maxRow + 1) * ROW_STEP + 8;
});

// ─── Labels bornes ────────────────────────────────────────────────────────────

const startLabel = computed(() => {
  const b = bounds.value;
  if (!b) return '';
  const all: string[] = [
    ...(props.periods ?? []).flatMap(p => [p.startDate, p.endDate].filter(Boolean) as string[]),
    ...(props.events ?? []).map(e => e.date).filter(Boolean) as string[],
  ];
  const oldest = all.sort((a, z) => DateService.toYearsBP(z) - DateService.toYearsBP(a))[0];
  return oldest ? formatStoryTimelineBoundLabel(oldest) : '';
});

const endLabel = computed(() => {
  const b = bounds.value;
  if (!b) return '';
  const all: string[] = [
    ...(props.periods ?? []).flatMap(p => [p.startDate, p.endDate].filter(Boolean) as string[]),
    ...(props.events ?? []).map(e => e.date).filter(Boolean) as string[],
  ];
  const newest = all.sort((a, z) => DateService.toYearsBP(a) - DateService.toYearsBP(z))[0];
  return newest ? formatStoryTimelineBoundLabel(newest) : '';
});

const trackRef = ref<HTMLElement | null>(null);
</script>

<style scoped>
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
