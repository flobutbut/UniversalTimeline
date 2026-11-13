import { describe, expect, it } from 'vitest';
import { apiId, mapToCategory, mapToEvent, mapToListStory, mapToPeriod, mapToStory, mapToStorySuggestion } from '../entityMappers';

describe('API entity boundaries', () => {
  it.each([7, '7', ' 7 '])('normalizes the API identifier %s', id => {
    expect(apiId(id)).toBe('7');
  });
  it.each(['', ' ', NaN, Infinity, undefined, null])('refuses an unusable identifier %s', id => {
    expect(() => apiId(id as never)).toThrow('identifiant');
  });
  it('maps raw SQL and canonical period responses to the same model', () => {
    const raw = mapToPeriod({ id: 4, label_fr: 'Terre', label_en: 'Earth', description_fr: 'Planète', start_date: 'G4.6', end_date: 'NOW', start_years_bp: '4600000000', end_years_bp: '0', parent_id: 2, has_children: true, created_at: '2026-10-28T12:00:00Z', categories: [{ id: 8, label_fr: 'Astronomie' }] });
    const canonical = mapToPeriod({ id: '4', label: { fr: 'Terre', en: 'Earth' }, description: { fr: 'Planète' }, startDate: 'G4.6', endDate: 'NOW', startYearsBP: 4600000000, endYearsBP: 0, parentId: '2', hasChildren: true, createdAt: '2026-10-28T12:00:00Z', categories: [{ id: '8', label: { fr: 'Astronomie' } }] });
    expect(canonical).toEqual(raw);
    expect(canonical).toMatchObject({ parentId: '2', hasParent: true, hasChildren: true, endYearsBP: 0 });
  });
  it('keeps authoritative numeric bounds, including zero and dates after 1950', () => {
    expect(mapToEvent({ id: 'e', date: 'M65', date_years_bp: '0' }).dateYearsBP).toBe(0);
    expect(mapToEvent({ id: 'e', date: '2000', dateYearsBP: -50 }).dateYearsBP).toBe(-50);
    expect(mapToEvent({ id: 'e', date: 'M65', date_years_bp: ' ' }).dateYearsBP).toBe(65000000);
  });
  it('reads Wikipedia titles from mapped objects and raw rows, never inventing them', () => {
    expect(mapToPeriod({ id: 'p', wikipedia: { fr: 'Terre', en: null } }).wikipedia).toEqual({ fr: 'Terre', en: null });
    expect(mapToEvent({ id: 'e', wikipedia_title_fr: null, wikipedia_title_en: 'Earth' }).wikipedia).toEqual({ fr: null, en: 'Earth' });
    expect(mapToPeriod({ id: 'p' })).not.toHaveProperty('wikipedia');
    expect(mapToEvent({ id: 'e', wikipedia: { fr: '  ', en: '' } }).wikipedia).toEqual({ fr: null, en: null });
  });
  it('keeps a known frise importance and never invents one', () => {
    expect(mapToEvent({ id: 'e', importance: 'major' }).importance).toBe('major');
    expect(mapToEvent({ id: 'e' })).not.toHaveProperty('importance');
    expect(mapToEvent({ id: 'e', importance: 'critical' })).not.toHaveProperty('importance');
  });
  it('does not invent timestamps, dates or child counts for sparse responses', () => {
    const period = mapToPeriod({ id: 'p' });
    expect(period.createdAt).toBeUndefined(); expect(period.updatedAt).toBeUndefined();
    expect(period.hasChildren).toBeUndefined(); expect(period.startYearsBP).toBeUndefined();
    expect(period.startDate).toBe(''); expect(period.endDate).toBe('');
    expect(mapToEvent({ id: 'e', date: 'inconnue', created_at: 'invalid' }).dateYearsBP).toBeUndefined();
    expect(mapToEvent({ id: 'e', created_at: 'invalid' }).createdAt).toBeUndefined();
  });
  it('clones an existing timestamp and preserves an explicit parent removal', () => {
    const createdAt = new Date('2026-10-28T12:00:00Z');
    const period = mapToPeriod({ id: 'p', createdAt, parent_id: null, parentId: 'old-parent' });
    expect(period.createdAt).toEqual(createdAt); expect(period.createdAt).not.toBe(createdAt);
    expect(period.parentId).toBeNull(); expect(period.hasParent).toBe(false);
  });
  it('normalizes all nested story identifiers and entities', () => {
    const story = mapToStory({ id: 7, title_fr: 'Histoire', periods: [{ id: 1, parent_id: 2, children: [3] }], events: [{ id: 5, date: 'M3', date_years_bp: '3000000' }], childStories: [{ id: 9, title_fr: 'Suite', anchors: [{ type: 'period', id: 1 }, { type: 'event', id: 5 }] }] });
    expect(story.id).toBe('7'); expect(story.periods[0]).toMatchObject({ id: '1', parentId: '2', children: ['3'] });
    expect(story.events[0]).toMatchObject({ id: '5', dateYearsBP: 3000000 });
    expect(story.childStories?.[0]).toMatchObject({ id: '9', anchors: [{ type: 'period', id: '1' }, { type: 'event', id: '5' }] });
  });
  it('distinguishes a metadata summary from a complete story', () => {
    const summary = mapToListStory({ id: 7, title_fr: 'Histoire', start_date: 'G4.6', end_date: 'NOW' });
    expect(summary).toMatchObject({ id: '7', startDate: 'G4.6', endDate: 'NOW', isPublic: false });
    expect(summary).not.toHaveProperty('periods'); expect(summary).not.toHaveProperty('events');
    expect(() => mapToStory({ id: 7 })).toThrow('incomplet');
    expect(() => mapToStory({ id: 7, periods: [] })).toThrow('incomplet');
    expect(mapToStory({ id: 7, periods: [], events: [] })).toMatchObject({ periods: [], events: [] });
  });
  it('maps category strings and multilingual labels consistently', () => {
    expect(mapToCategory({ id: 4, label: 'Sciences' })).toEqual({ id: '4', label: { fr: 'Sciences', en: '' } });
    expect(mapToCategory({ id: '4', label: { fr: 'Sciences', en: 'Science' }, description_fr: 'Description' })).toMatchObject({ label: { fr: 'Sciences', en: 'Science' }, description: { fr: 'Description', en: '' } });
  });
  it('normalizes the suggested story and its parent without an unsafe Story cast', () => {
    expect(mapToStorySuggestion({ id: 2, parent_story_id: 1, title_fr: 'Suite' })).toMatchObject({ id: '2', parentStoryId: '1', title: { fr: 'Suite' } });
    expect(mapToStorySuggestion({ id: 2 }).parentStoryId).toBeNull();
  });
});
