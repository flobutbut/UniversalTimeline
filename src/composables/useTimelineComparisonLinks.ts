import { computed, nextTick, onScopeDispose, ref, watch, type Ref, type WatchSource } from 'vue';
import { sharedEventIds } from '@/lib/timelineComparison';
import type { ListEvent } from '@/types/database';

export interface ComparisonLink { id: string; x: number; y1: number; y2: number }

/**
 * Traits verticaux entre les points d’un même événement présent dans les deux frises.
 * Positions relues dans le DOM (la grille projette ses positions au survol) et retracées
 * après les animations, défilements et redimensionnements.
 */
export function useTimelineComparisonLinks(
  host: Ref<HTMLElement | null>,
  grids: () => [HTMLElement | null, HTMLElement | null],
  events: () => [ListEvent[], ListEvent[]],
  redrawOn: WatchSource[],
) {
  const shared = computed(() => { const [a, b] = events(); return sharedEventIds(a, b); });
  const links = ref<ComparisonLink[]>([]);
  /** Événement survolé ou focalisé dans l’une ou l’autre frise : son trait ressort. */
  const activeEventId = ref<string | null>(null);

  // Identifiants du catalogue arbitraires : comparés tels quels plutôt qu’insérés dans un sélecteur.
  const dot = (grid: HTMLElement | null, id: string) => [...(grid?.querySelectorAll<HTMLElement>('[data-event-id]') ?? [])]
    .find(card => card.getAttribute('data-event-id') === id)?.querySelector<HTMLElement>('.event-dot') ?? null;
  function draw() {
    const root = host.value;
    if (!root || !shared.value.length) { links.value = []; return; }
    const box = root.getBoundingClientRect();
    const [gridA, gridB] = grids();
    links.value = shared.value.flatMap(id => {
      const a = dot(gridA, id), b = dot(gridB, id);
      if (!a || !b) return [];
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return [{ id, x: ra.left - box.left + ra.width / 2, y1: ra.bottom - box.top, y2: rb.top - box.top }];
    });
  }
  let frame = 0;
  let late: ReturnType<typeof setTimeout> | undefined;
  function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); }
  watch([shared, ...redrawOn], () => {
    void nextTick(schedule);
    // Les cartes entrent avec une animation : retracer une fois qu’elle est finie.
    clearTimeout(late); late = setTimeout(schedule, 450);
  }, { flush: 'post' });

  function track(event: Event) {
    const card = (event.target as HTMLElement | null)?.closest?.('[data-event-id]');
    activeEventId.value = card?.getAttribute('data-event-id') ?? null;
  }

  let observer: ResizeObserver | undefined;
  watch(host, element => {
    observer?.disconnect();
    if (element && typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(schedule); observer.observe(element); }
  }, { immediate: true });
  onScopeDispose(() => { observer?.disconnect(); cancelAnimationFrame(frame); clearTimeout(late); });

  return { links, activeEventId, schedule, track, clear: () => { activeEventId.value = null; } };
}
