import type { ListEvent, TagRef } from '@/types/database';
import { matchesTags, primaryTag, tagLabel } from './tags';

/** En dessous, une frise reste lisible : elle s'ouvre sur tous ses événements. */
export const TIMELINE_FILTER_MIN_EVENTS = 16;
export const ESSENTIAL_EVENTS = '__essentiel';
export const ALL_EVENTS = '__tous';

export interface FilterableStory { tags?: readonly TagRef[]; events: readonly ListEvent[] }

function primaryCounts(events: readonly ListEvent[]) {
  const counts = new Map<string, { tag: TagRef; count: number }>();
  for (const event of events) {
    const tag = primaryTag(event);
    if (tag) counts.set(tag.id, { tag, count: (counts.get(tag.id)?.count ?? 0) + 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.tag.position - b.tag.position);
}

/** Sujets actifs à l'ouverture ; null : tout est affiché. Une frise sans tag part de son sujet le plus représenté. */
export function defaultEventTagIds(story: FilterableStory): string[] | null {
  if (story.events.length < TIMELINE_FILTER_MIN_EVENTS) return null;
  const counts = primaryCounts(story.events);
  const own = story.tags?.map(tag => tag.id).filter(id => counts.some(({ tag }) => tag.id === id)) ?? [];
  if (own.length) return own;
  return counts.length ? [counts[0].tag.id] : null;
}

/** Un événement majeur reste visible, et une fiche pas encore classée n'est jamais masquée pour autant. */
export function isEventShown(event: ListEvent, active: readonly string[] | null): boolean {
  if (!active || event.importance === 'major') return true;
  const primary = primaryTag(event);
  return !primary || matchesTags({ tags: [primary] }, active);
}

/** Un sujet choisi explicitement montre ce sujet seul, y compris ses sous-domaines. */
export function isEventOfSubject(event: ListEvent, subject: string): boolean {
  const primary = primaryTag(event);
  return !!primary && matchesTags({ tags: [primary] }, [subject]);
}

export function timelineSubjectOptions(events: readonly ListEvent[]): { value: string; label: string }[] {
  return [
    ...(events.length >= TIMELINE_FILTER_MIN_EVENTS ? [{ value: ESSENTIAL_EVENTS, label: 'L’essentiel' }] : []),
    { value: ALL_EVENTS, label: 'Tous les sujets' },
    ...primaryCounts(events).map(({ tag, count }) => ({ value: tag.id, label: `${tagLabel(tag)} (${count})` })),
  ];
}
