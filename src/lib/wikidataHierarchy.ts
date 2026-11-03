import { MS_PER_YEAR, parseTemporal } from '@temporal';
import type { WikidataTimelineItem } from '@/types/wikidataGeneration';

export function effectiveWikidataParent(item: WikidataTimelineItem, selected: readonly WikidataTimelineItem[]): string | null {
  return item.type === 'period' && selected.some(parent => parent.type === 'period' && parent.qid === item.parentQid)
    ? item.parentQid! : null;
}

export function wouldCreateWikidataCycle(childQid: string, parentQid: string, periods: readonly WikidataTimelineItem[]): boolean {
  const byId = new Map(periods.filter(item => item.type === 'period').map(item => [item.qid, item]));
  const seen = new Set([childQid]);
  let cursor: string | null | undefined = parentQid;
  while (cursor && byId.has(cursor)) {
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = byId.get(cursor)?.parentQid;
  }
  return false;
}

export function wikidataHierarchyError(items: readonly WikidataTimelineItem[]): string | null {
  return items.some(item => item.type === 'period' && item.parentQid && wouldCreateWikidataCycle(item.qid, item.parentQid, items))
    ? 'Les rattachements forment une boucle. Changez un parent ou choisissez « À la racine ».' : null;
}

// One fixed reference makes comparisons independent of render time. Coarse civil
// dates cover their whole month/year rather than pretending to be its first day.
function dateWindow(raw: string) {
  const now = 0;
  const value = parseTemporal(raw, now);
  if (value.kind === 'unknown') return null;
  const oldest = value.yearsBeforePresent;
  const coarse = value.kind === 'calendar' && ['year', 'month'].includes(value.precision);
  if (!coarse) return { oldest, newest: oldest };
  if (!value.calendarDate) return null;
  const next = new Date(value.calendarDate);
  if (value.precision === 'year') next.setUTCFullYear(next.getUTCFullYear() + 1);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  if (!Number.isFinite(next.getTime())) return null;
  return { oldest, newest: (now - next.getTime() + 1) / MS_PER_YEAR };
}

export function wikidataDateWarnings(item: WikidataTimelineItem, parent: WikidataTimelineItem): string[] {
  const start = dateWindow(item.startDate), end = dateWindow(item.endDate);
  const parentStart = dateWindow(parent.startDate), parentEnd = dateWindow(parent.endDate);
  const warnings: string[] = [];
  let uncertain = false;
  if (start && parentStart && item.startDate !== parent.startDate) {
    if (start.newest > parentStart.oldest) warnings.push(`Commence avant « ${parent.title} » (${parent.startDate}).`);
    else if (start.oldest > parentStart.newest) uncertain = true;
  }
  if (end && parentEnd && item.endDate !== parent.endDate) {
    if (end.oldest < parentEnd.newest) warnings.push(`Se termine après « ${parent.title} » (${parent.endDate}).`);
    else if (end.newest < parentEnd.oldest) uncertain = true;
  }
  if (uncertain) warnings.push(`Les dates au mois ou à l’année ne permettent pas de confirmer l’inclusion dans « ${parent.title} ».`);
  return warnings;
}
