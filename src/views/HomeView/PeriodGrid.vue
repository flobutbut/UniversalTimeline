<template>
  <div class="period-grid">
    <!-- On masque le spinner quand une animation FLIP est en cours :
         les anciennes périodes sont encore valides, on les garde visibles. -->
    <div v-if="loading && !flipFrom" class="loading-container">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Chargement de la timeline...</span>
    </div>
    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-else-if="!loading && periods.length === 0" class="empty-message">
      Aucune période à afficher
    </div>
    <div v-else class="timeline-container">
      <div class="periods-container">
        <PeriodCard
          v-if="props.currentPeriod"
          ref="parentBarRef"
          variant="parent"
          :period="props.currentPeriod"
          :is-selected="false"
          @back="goBack"
        />
        <div class="period-row" :style="{ height: `${periodRowHeight}px` }">
          <PeriodCard
            v-for="(period, i) in sortedPeriods"
            :key="period.id"
            :ref="(el: any) => setPeriodRef(el, period.id)"
            :period="period"
            :is-selected="false"
            class="timeline-card period-grid__period-position"
            :style="{ ...getPeriodCssVars(period), '--enter-delay': `${i * 25}ms` }"
            @select="selectPeriod"
            @mouseenter="hoveredPeriodId = period.id"
            @mouseleave="hoveredPeriodId = null"
          />
        </div>
      </div>
      <div class="timeline-line"></div>
      <div class="events-container" @click="selectedEvent = null">
        <EventCard
          v-for="event in events"
          :key="event.id"
          :event="event"
          :is-selected="selectedEvent?.id === event.id"
          :is-category-active="isCategoryActive(event)"
          :card-style="getEventStyles(event)"
          :align="getEventAlign(event)"
          @click="selectEvent(event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { ListPeriod, ListEvent } from '@/types/database';
import { useTimelineScaling } from '@/composables/useTimelineScaling';
import {
  timelineEventCardAlign,
  timelineFocusTransform,
  unwrapTemplateRefToHTMLElement,
} from '@/lib/timelinePeriodGridHelpers';
import PeriodCard from './PeriodCard.vue';
import EventCard from './EventCard.vue';

const props = defineProps<{
  periods: ListPeriod[];
  events: ListEvent[];
  loading: boolean;
  parentPeriod: ListPeriod | null;
  currentPeriod: ListPeriod | null;
}>();

const emit = defineEmits<{
  (e: 'period-click', period: ListPeriod): void;
  (e: 'go-back'): void;
}>();

const { updateFromPeriods, getPeriodLayoutStyle, getEventLayoutStyle } = useTimelineScaling();

const error = ref<string | null>(null);
const selectedEvent = ref<ListEvent | null>(null);
const hoveredPeriodId = ref<string | null>(null);
/** Hauteur d'un couloir : hauteur carte période (52px) + marge entre couloirs (4px) */
const ligneHeight = 56;
/** Largeur visuelle minimale (en %) accordée à la période survolée */
const MIN_HOVER_PCT = 8;

// ─── FLIP animation ────────────────────────────────────────────────────────────

/** Ref vers la barre parent (PeriodCard variant="parent"). */
const parentBarRef = ref<any>(null);
/** Rect de la carte cliquée, capturé avant la navigation. */
const flipFrom = ref<DOMRect | null>(null);
/** Map id → élément DOM des cartes de période. */
const periodElMap = new Map<string, HTMLElement>();

function setPeriodRef(el: unknown, id: string) {
  const domEl = unwrapTemplateRefToHTMLElement(el);
  if (domEl) periodElMap.set(id, domEl);
  else periodElMap.delete(id);
}

/**
 * FLIP : on attend que loading repasse à false ET que currentPeriod soit défini.
 * C'est seulement à ce moment que le DOM affiche la barre parent.
 */
watch(
  [() => props.currentPeriod, () => props.loading],
  async ([newPeriod, isLoading]) => {
    // Le FLIP n'a de sens que quand le DOM est visible (loading terminé)
    if (!newPeriod || isLoading || !flipFrom.value) return;
    const from = flipFrom.value;

    await nextTick();

    const parentEl: HTMLElement | null =
      (parentBarRef.value?.$el as HTMLElement) ?? parentBarRef.value ?? null;
    if (!parentEl) { flipFrom.value = null; return; }

    const to = parentEl.getBoundingClientRect();
    if (to.width === 0) { flipFrom.value = null; return; }

    const dx     = from.left  - to.left;
    const dy     = from.top   - to.top;
    const scaleX = from.width / to.width;
    const scaleY = from.height / to.height;

    const PHASE1 = 260; // montée verticale
    const PHASE2 = 340; // expansion horizontale

    // ── Phase 1 : snap à la position de départ ────────────────────────────
    parentEl.style.transition = 'none';
    parentEl.style.transformOrigin = 'top left';
    // Position complète de la carte (lieu + taille)
    parentEl.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;

    void parentEl.getBoundingClientRect(); // force reflow

    // ── Phase 1 : animer uniquement la translation Y (monter vers la barre) ──
    // On garde scaleX et dx constants — seul dy et scaleY s'animent
    parentEl.style.transition = `transform ${PHASE1}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    parentEl.style.transform = `translate(${dx}px, 0px) scale(${scaleX}, 1)`;

    // ── Phase 2 : une fois en position verticale, expansion horizontale ────
    setTimeout(() => {
      if (!parentEl) return;
      parentEl.style.transition = `transform ${PHASE2}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      parentEl.style.transform = 'none';
    }, PHASE1);

    setTimeout(() => {
      if (parentEl) {
        parentEl.style.transition = '';
        parentEl.style.transform = '';
        parentEl.style.transformOrigin = '';
      }
      flipFrom.value = null;
    }, PHASE1 + PHASE2 + 20);
  },
  { flush: 'post' }
);

// ─── Tri et lanes ─────────────────────────────────────────────────────────────

const sortedPeriods = computed(() =>
  [...props.periods].sort((a, b) => (b.startYearsBP ?? 0) - (a.startYearsBP ?? 0))
);

const laneMap = computed((): Map<string, number> => {
  const result = new Map<string, number>();
  const laneMinEnds: number[] = [];

  const allBP = sortedPeriods.value.flatMap(p => [p.startYearsBP ?? 0, p.endYearsBP ?? 0]);
  const span = allBP.length ? Math.max(...allBP) - Math.min(...allBP) : 0;
  const tolerance = span * 0.001;

  for (const period of sortedPeriods.value) {
    const startBP = period.startYearsBP ?? 0;
    const endBP   = period.endYearsBP   ?? 0;

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

const periodRowHeight = computed(() => numLanes.value * ligneHeight);

watch(
  [sortedPeriods, () => props.currentPeriod],
  ([p]) => {
    try { updateFromPeriods(p as any[], props.currentPeriod as any ?? undefined); }
    catch (e) { error.value = e instanceof Error ? e.message : 'Erreur de calcul'; }
  },
  { immediate: true }
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const rawLayouts = computed(() => {
  const map = new Map<string, { left: number; width: number; top: number }>();
  for (const period of sortedPeriods.value) {
    const s = getPeriodLayoutStyle(period as any, {
      row: laneMap.value.get(period.id) ?? 0,
      rowHeight: ligneHeight,
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

  if (hoveredPeriodId.value) {
    const hov = rawLayouts.value.get(hoveredPeriodId.value);
    if (hov && hov.width < MIN_HOVER_PCT) {
      const t1 = hov.left;
      const t2 = hov.left + hov.width;
      const newLeft  = timelineFocusTransform(left, t1, t2, MIN_HOVER_PCT);
      const newRight = timelineFocusTransform(left + width, t1, t2, MIN_HOVER_PCT);
      return {
        '--period-left': `${newLeft}%`,
        '--period-width': `${Math.max(0, newRight - newLeft)}%`,
        '--period-top': `${top}px`,
        '--period-z': String(period.id === hoveredPeriodId.value ? 2 : 1),
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
  const base = getEventLayoutStyle((event as any).date ?? '');
  return parseFloat(base.left as string);
};

const getEventAlign = (event: ListEvent): 'start' | 'center' | 'end' =>
  timelineEventCardAlign(getEventRawLeft(event));

const getEventStyles = (event: ListEvent): { width: string; left: string } => {
  const base = getEventLayoutStyle((event as any).date ?? '');
  const rawLeft = parseFloat(String(base.left));

  if (hoveredPeriodId.value) {
    const hov = rawLayouts.value.get(hoveredPeriodId.value);
    if (hov && hov.width < MIN_HOVER_PCT) {
      const t1 = hov.left;
      const t2 = hov.left + hov.width;
      return {
        width: String(base.width),
        left: `${timelineFocusTransform(rawLeft, t1, t2, MIN_HOVER_PCT)}%`,
      };
    }
  }

  return { width: String(base.width), left: String(base.left) };
};

// ─── Actions ──────────────────────────────────────────────────────────────────

const selectPeriod = (period: ListPeriod) => {
  // Capturer la position de la carte avant la navigation (pour le FLIP)
  const el = periodElMap.get(period.id);
  if (el) flipFrom.value = el.getBoundingClientRect();
  emit('period-click', period);
};

const selectEvent = (event: ListEvent) => {
  selectedEvent.value = selectedEvent.value?.id === event.id ? null : event;
};

const isCategoryActive = (event: ListEvent): boolean => {
  if (!selectedEvent.value || selectedEvent.value.id === event.id) return false;
  const selectedIds = new Set(selectedEvent.value.categories.map(c => c.id));
  return event.categories.some(c => selectedIds.has(c.id));
};

const goBack = () => {
  flipFrom.value = null; // pas de FLIP sur le retour
  emit('go-back');
};
</script>

<style scoped>
.period-grid {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  overflow: hidden;
  background-color: var(--color-background);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  height: 100%;
}

.error-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-error);
}

.empty-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
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
