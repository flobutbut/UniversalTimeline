import type { ListEvent, TagRef } from '@/types/database';
import { matchesTags, primaryTag, tagLabel } from './tags';

/** En dessous, une frise reste lisible : elle s'ouvre sur tous ses événements. */
export const TIMELINE_FILTER_MIN_EVENTS = 16;
/** Sujets retenus à l'ouverture d'une frise sans tag : un seul ferait disparaître le reste dès qu'un thème domine. */
const UNTAGGED_STORY_SUBJECTS = 2;
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

/** Sujets actifs à l'ouverture ; null : tout est affiché. Une frise sans tag part de ses deux sujets les plus représentés. */
export function defaultEventTagIds(story: FilterableStory): string[] | null {
  if (story.events.length < TIMELINE_FILTER_MIN_EVENTS) return null;
  const counts = primaryCounts(story.events);
  const own = story.tags?.map(tag => tag.id).filter(id => story.events.some(event => matchesTags(event, [id]))) ?? [];
  if (own.length) return own;
  return counts.length ? counts.slice(0, UNTAGGED_STORY_SUBJECTS).map(({ tag }) => tag.id) : null;
}

/**
 * « L'essentiel » : un événement reste visible dès qu'un de ses sujets (principal ou non) est actif,
 * pour ne pas écarter un fait à cheval sur deux domaines. Un événement majeur reste visible, et une
 * fiche pas encore classée n'est jamais masquée pour autant.
 */
export function isEventShown(event: ListEvent, active: readonly string[] | null): boolean {
  if (!active || event.importance === 'major') return true;
  return !event.tags?.length || matchesTags(event, active);
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
