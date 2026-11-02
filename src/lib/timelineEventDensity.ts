import type { EventCardAlign } from './timelinePeriodGridHelpers';

/** Largeur réservée à un tooltip ouvert par défaut (titre et date), marge comprise. */
export const DEFAULT_TOOLTIP_SLOT_PX = 168;
/** Largeur maximale d'un tooltip complet (survol ou sélection), marge comprise. */
export const FULL_TOOLTIP_SLOT_PX = 248;
/** Décalage de la bulle alignée sur un bord, identique au style d'EventCard. */
const EDGE_OFFSET_PX = 6;

export interface TimelineEventSlot { id: string; leftPct: number; align: EventCardAlign }

/** Intervalle horizontal [début, fin[ occupé par la bulle d'un événement, en pixels. */
export function eventTooltipSpan(item: TimelineEventSlot, widthPx: number, slotPx: number): [number, number] {
  const x = item.leftPct / 100 * widthPx;
  const start = item.align === 'start' ? x - EDGE_OFFSET_PX
    : item.align === 'end' ? x + EDGE_OFFSET_PX - slotPx
    : x - slotPx / 2;
  return [start, start + slotPx];
}

/**
 * Événements dont le tooltip compact s'affiche sans survol : par ordre de priorité, puis
 * chronologique, chacun est retenu si sa bulle ne chevauche aucune bulle déjà retenue.
 * Sans largeur mesurée, aucun.
 */
export function defaultOpenEvents<T extends TimelineEventSlot>(
  items: T[],
  widthPx: number,
  priority: (a: T, b: T) => number = () => 0,
  slotPx = DEFAULT_TOOLTIP_SLOT_PX,
): Set<string> {
  const open = new Set<string>();
  if (widthPx <= 0) return open;
  const placed: Array<[number, number]> = [];
  for (const item of [...items].sort((a, b) => priority(a, b) || a.leftPct - b.leftPct)) {
    const [start, end] = eventTooltipSpan(item, widthPx, slotPx);
    if (placed.some(([otherStart, otherEnd]) => start < otherEnd && otherStart < end)) continue;
    placed.push([start, end]);
    open.add(item.id);
  }
  return open;
}

/** Retire les tooltips ouverts par défaut que recouvrirait le tooltip complet des événements actifs. */
export function withoutCoveredTooltips(
  open: ReadonlySet<string>,
  items: TimelineEventSlot[],
  activeIds: ReadonlySet<string>,
  widthPx: number,
): Set<string> {
  const covers = items.filter(item => activeIds.has(item.id)).map(item => eventTooltipSpan(item, widthPx, FULL_TOOLTIP_SLOT_PX));
  if (!covers.length) return new Set(open);
  return new Set(items.filter(item => {
    if (!open.has(item.id) || activeIds.has(item.id)) return open.has(item.id);
    const [start, end] = eventTooltipSpan(item, widthPx, DEFAULT_TOOLTIP_SLOT_PX);
    return !covers.some(([coverStart, coverEnd]) => start < coverEnd && coverStart < end);
  }).map(item => item.id));
}
