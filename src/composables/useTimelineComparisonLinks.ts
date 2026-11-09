import { computed, nextTick, onScopeDispose, ref, watch, type Ref, type WatchSource } from 'vue';
import type { ListEvent } from '@/types/database';

export interface ComparisonLink { key: string; id: string; x: number; y1: number; y2: number }

/**
 * Traits entre les occurrences visibles successives d’un même événement.
 * Positions relues dans le DOM (la grille projette ses positions au survol) et retracées
 * après les animations, défilements et redimensionnements.
 */
export function useTimelineComparisonLinks(
  host: Ref<HTMLElement | null>,
  grids: () => (HTMLElement | null)[],
  events: () => ListEvent[][],
  redrawOn: WatchSource[],
) {
  const shared = computed(() => {
    const counts = new Map<string, number>();
    for (const rows of events()) for (const id of new Set(rows.map(event => event.id))) counts.set(id, (counts.get(id) ?? 0) + 1);
    return new Set([...counts].filter(([, count]) => count > 1).map(([id]) => id));
  });
  const links = ref<ComparisonLink[]>([]);
  /** Événement survolé ou focalisé dans l’une ou l’autre frise : son trait ressort. */
  const activeEventId = ref<string | null>(null);

  function draw() {
    const root = host.value;
    if (!root || !shared.value.size) { links.value = []; return; }
    const box = root.getBoundingClientRect();
    const previous = new Map<string, DOMRect>();
    const lines: ComparisonLink[] = [];
    grids().forEach((grid, index) => {
      // Un passage par grille, sans interpoler les identifiants du catalogue dans un sélecteur.
      const seen = new Set<string>();
      for (const card of grid?.querySelectorAll<HTMLElement>('[data-event-id]') ?? []) {
        const id = card.getAttribute('data-event-id')!;
        if (!shared.value.has(id) || seen.has(id)) continue;
        const dot = card.querySelector<HTMLElement>('.event-dot');
        if (!dot) continue;
        const rect = dot.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        seen.add(id);
        const before = previous.get(id);
        if (before) lines.push({ key: `${index}:${id}`, id, x: rect.left - box.left + rect.width / 2, y1: before.bottom - box.top, y2: rect.top - box.top });
        previous.set(id, rect);
      }
    });
    links.value = lines;
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
