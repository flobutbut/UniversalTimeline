import { describe, expect, it } from 'vitest';
import { contentRange, deduceStoryRole, isTreeRoot, promotionCandidates, storyStructureWarnings, subjectRange, suggestAnchorPeriod } from '@/lib/storyArchitecture';
import type { Event, Period, Story } from '@/types/database';

const now = Date.UTC(2026, 10, 3);
const period = (id: string, startDate: string, endDate: string, storyParentId: string | null = null) =>
  ({ id, label: { fr: id, en: '' }, startDate, endDate, storyParentId, categories: [] }) as unknown as Period;
const event = (id: string, date: string) => ({ id, label: { fr: id, en: '' }, date, categories: [] }) as unknown as Event;
const story = (extra: Partial<Story> = {}): Story => ({ id: '10', title: { fr: 'Frise', en: '' }, author: '', isPublic: false, categories: [], periods: [], events: [], ...extra });
const tree = [
  { id: '1', parentStoryId: null, title: { fr: 'Univers', en: '' } }, { id: '2', parentStoryId: '1', title: { fr: 'Vie', en: '' } },
  { id: '3', parentStoryId: '2', title: { fr: 'Homo', en: '' } }, { id: '4', parentStoryId: '3', title: { fr: 'Néolithique', en: '' } },
  { id: '5', parentStoryId: null, title: { fr: 'Brouillon', en: '' } },
];

describe('anchor suggestion', () => {
  const periods = [period('modern', '1492', '1789'), period('renaissance', '1400', '1650', 'modern'), period('wars', '1494', '1559', 'renaissance'), period('other', '1789', '1914')];
  it('proposes the deepest period containing the subject dates', () => {
    expect(suggestAnchorPeriod(periods, subjectRange('1500', '1550', now), now)).toBe('wars');
    expect(suggestAnchorPeriod(periods, subjectRange('1600', '', now), now)).toBe('renaissance');
    expect(suggestAnchorPeriod(periods, subjectRange('1300', '1950', now), now)).toBeNull();
    expect(suggestAnchorPeriod(periods, subjectRange('', '', now), now)).toBeNull();
    expect(subjectRange('1950', '1900', now)).toBeNull();
  });
  it('reads the frise content bounds from its periods and events', () => {
    const range = contentRange([period('a', '1500', '1520')], [event('e', '1530')], now)!;
    expect(suggestAnchorPeriod(periods, range, now)).toBe('wars');
    expect(contentRange([], [event('u', '')], now)).toBeNull();
  });
});

describe('structure warnings', () => {
  it('flags a crowded level and a sub-period overflowing its parent', () => {
    const many = Array.from({ length: 11 }, (_, i) => period(`p${i}`, String(1500 + i), String(1501 + i), 'root'));
    const warnings = storyStructureWarnings(story({ periods: [period('root', '1500', '1600'), ...many, period('late', '1590', '1650', 'root')] }), [], now);
    expect(warnings.map(w => w.kind)).toEqual(['crowded-level', 'overflow']);
    expect(warnings[0]).toMatchObject({ periodId: 'root' });
    expect(warnings[0].message).toContain('12 sous-périodes');
    expect(warnings[1].message).toContain('« late » déborde des dates de « root »');
  });
  it('tolerates the small gap between a calendar and a geological date', () => {
    expect(storyStructureWarnings(story({ periods: [period('cryo', 'M720', 'M635'), period('ice', 'M720.002', 'M650', 'cryo')] }), [], now)).toEqual([]);
  });
  it('flags sub-periods also present in a sub-frise anchored on their period', () => {
    const s = story({ periods: [period('p', '1000', '1500'), period('b', '1000', '1200', 'p')],
      childStories: [{ id: '11', title: { fr: 'Détail', en: '' }, anchors: [{ type: 'period', id: 'p' }] }],
      relatedStories: [{ id: '11', title: { fr: 'Détail', en: '' }, periodIds: ['p', 'b'], eventIds: [] }] });
    const warnings = storyStructureWarnings(s, [{ id: '10', parentStoryId: '1' }, { id: '11', parentStoryId: '10' }], now);
    expect(warnings).toEqual([expect.objectContaining({ kind: 'duplicated-structure', periodId: 'p', storyId: '11' })]);
    // A thematic entry point is not a sub-frise: sharing content is expected.
    expect(storyStructureWarnings(s, [{ id: '10', parentStoryId: '1' }, { id: '11', parentStoryId: '1' }], now)).toEqual([]);
  });
  it('flags entry points that skip levels, in both directions, and suggests the step', () => {
    const fromTop = storyStructureWarnings(story({ id: '2', parentStoryId: '1', childStories: [
      { id: '3', title: { fr: 'Homo', en: '' }, anchors: [] }, { id: '4', title: { fr: 'Néolithique', en: '' }, anchors: [] }] }), tree, now);
    expect(fromTop.map(w => w.storyId)).toEqual(['4']);
    expect(fromTop[0].message).toContain('passez par « Homo »');
    const toTop = storyStructureWarnings(story({ id: '4', parentStoryId: '3', parentStories: [
      { id: '3', title: { fr: 'Homo', en: '' }, anchors: [] }, { id: '2', title: { fr: 'Vie', en: '' }, anchors: [] }] }), tree, now);
    expect(toTop.map(w => w.storyId)).toEqual(['2']);
  });
  it('flags a public frise without a parent, except the root of the tree', () => {
    expect(storyStructureWarnings(story({ id: '5', isPublic: true, parentStoryId: null }), tree, now).map(w => w.kind)).toEqual(['public-draft']);
    expect(storyStructureWarnings(story({ id: '1', isPublic: true, parentStoryId: null }), tree, now)).toEqual([]);
    expect(isTreeRoot('1', tree)).toBe(true);
    expect(isTreeRoot('5', tree)).toBe(false);
  });
});

describe('promotion to a sub-frise', () => {
  it('proposes periods with many sub-periods, deep levels or many events, but not anchors nor the only root', () => {
    const subs = Array.from({ length: 11 }, (_, i) => period(`s${i}`, String(1100 + i), String(1101 + i), 'big'));
    const deep = [period('d1', '1300', '1350', 'deep'), period('d2', '1300', '1320', 'd1'), period('d3', '1300', '1310', 'd2')];
    const events = Array.from({ length: 10 }, (_, i) => event(`e${i}`, String(1410 + i)));
    const s = story({ periods: [period('big', '1100', '1200'), ...subs, period('deep', '1300', '1400'), ...deep, period('busy', '1400', '1500'), period('anchor', '1500', '1600', null), ...Array.from({ length: 11 }, (_, i) => period(`a${i}`, String(1500 + i), String(1501 + i), 'anchor'))],
      events, childStories: [{ id: '11', title: { fr: '', en: '' }, anchors: [{ type: 'period', id: 'anchor' }] }] });
    expect(promotionCandidates(s, now)).toEqual([
      { periodId: 'big', reasons: ['11 sous-périodes'] },
      { periodId: 'deep', reasons: ['3 niveaux de sous-périodes'] },
      { periodId: 'busy', reasons: ['10 événements dans ses dates'] },
    ]);
    expect(promotionCandidates(story({ periods: [period('only', '1100', '1200'), ...subs.map(p => ({ ...p, storyParentId: 'only' }))] }), now)).toEqual([]);
  });
});

describe('deduced role', () => {
  const roots = [period('a', '1000', '1100'), period('b', '1100', '1200'), period('c', '1200', '1300')];
  it('is a portal when most top periods open on sub-frises, a narrative otherwise', () => {
    const anchors = (ids: string[]) => ids.map((id, i) => ({ id: String(20 + i), title: { fr: '', en: '' }, anchors: [{ type: 'period' as const, id }] }));
    expect(deduceStoryRole(story({ parentStoryId: '1', periods: roots, childStories: anchors(['a', 'b']) }))).toMatchObject({ role: 'portail', openings: 2, draft: false });
    expect(deduceStoryRole(story({ parentStoryId: '1', periods: roots, childStories: anchors(['a']) }))).toMatchObject({ role: 'recit', openings: 1 });
    expect(deduceStoryRole(story({ parentStoryId: '1', periods: roots })).description).toContain('raconté en détail');
  });
  it('is a reading path when it presents periods through other frises, and a draft without a parent', () => {
    const path = story({ periods: roots, navigationContexts: [{ id: '10', title: { fr: '', en: '' }, periods: [], presentations: [{ periodId: 'a', storyId: '20', title: { fr: '', en: '' } }] }] });
    expect(deduceStoryRole(path, tree)).toMatchObject({ role: 'parcours', draft: true });
    expect(deduceStoryRole(story({ id: '1', periods: roots }), tree).draft).toBe(false);
  });
});
