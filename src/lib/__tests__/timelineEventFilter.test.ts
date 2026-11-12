import { expect, it } from 'vitest';
import { defaultEventTagIds, isEventOfSubject, isEventShown, timelineSubjectOptions, TIMELINE_FILTER_MIN_EVENTS } from '@/lib/timelineEventFilter';
import type { EventImportance, ListEvent, TagRef } from '@/types/database';

const tag = (id: string, position = 1, parentId: string | null = null): TagRef => ({ id, label: { fr: id.toUpperCase(), en: id }, family: 'societes', position, parentId });
const event = (tags: TagRef[], importance?: EventImportance): ListEvent => ({ id: Math.random().toString(), label: { fr: 'e', en: '' }, date: '1900', categories: [], tags, ...(importance ? { importance } : {}) });
const many = (count: number, ...tags: TagRef[]) => Array.from({ length: count }, () => event(tags));
const conflits = tag('conflits', 6); const pouvoir = tag('pouvoir', 5); const arts = tag('arts', 15);

it('shows everything below the threshold', () => {
  expect(defaultEventTagIds({ tags: [conflits], events: many(TIMELINE_FILTER_MIN_EVENTS - 1, conflits) })).toBeNull();
});

it('starts from the tags of the frise that its events actually use', () => {
  const events = [...many(10, conflits), ...many(10, arts)];
  expect(defaultEventTagIds({ tags: [conflits, pouvoir], events })).toEqual(['conflits']);
});

it('falls back to the two most represented subjects without usable frise tags', () => {
  const events = [...many(6, pouvoir), ...many(11, conflits), ...many(3, arts)];
  expect(defaultEventTagIds({ tags: [], events })).toEqual(['conflits', 'pouvoir']);
  expect(defaultEventTagIds({ tags: [tag('sport', 16)], events })).toEqual(['conflits', 'pouvoir']);
  expect(defaultEventTagIds({ events: many(20) })).toBeNull();
});

it('keeps a single subject when the frise covers only one', () => {
  expect(defaultEventTagIds({ events: many(20, conflits) })).toEqual(['conflits']);
});

it('breaks a tie with the grid order', () => {
  expect(defaultEventTagIds({ events: [...many(10, arts), ...many(10, conflits), ...many(10, pouvoir)] })).toEqual(['pouvoir', 'conflits']);
});

it('keeps an event when any of its tags is active, plus major and unclassified events', () => {
  const secondary = event([pouvoir, conflits]);
  expect(isEventShown(event([conflits]), ['conflits'])).toBe(true);
  expect(isEventShown(secondary, ['conflits'])).toBe(true);
  expect(isEventShown(secondary, ['arts'])).toBe(false);
  // Le tag de la frise compte même s'il n'est le sujet principal d'aucun événement.
  expect(defaultEventTagIds({ tags: [conflits], events: Array.from({ length: 16 }, () => secondary) })).toEqual(['conflits']);
  expect(isEventShown(event([arts], 'major'), ['conflits'])).toBe(true);
  expect(isEventShown(event([]), ['conflits'])).toBe(true);
  expect(isEventShown(event([arts]), null)).toBe(true);
  expect(isEventShown(event([tag('droit', 101, 'pouvoir')]), ['pouvoir'])).toBe(true);
});

it('keeps a chosen subject strict, without major events from other subjects', () => {
  expect(isEventOfSubject(event([conflits]), 'conflits')).toBe(true);
  expect(isEventOfSubject(event([arts], 'major'), 'conflits')).toBe(false);
  expect(isEventOfSubject(event([pouvoir, conflits]), 'conflits')).toBe(false);
  expect(isEventOfSubject(event([]), 'conflits')).toBe(false);
});

it('offers the essential entry on dense frises only, then subjects by number of events', () => {
  expect(timelineSubjectOptions([...many(2, arts), ...many(3, conflits, arts), event([])]).map(option => option.label)).toEqual(['Tous les sujets', 'CONFLITS (3)', 'ARTS (2)']);
  expect(timelineSubjectOptions(many(TIMELINE_FILTER_MIN_EVENTS, conflits))[0].label).toBe('L’essentiel');
});
