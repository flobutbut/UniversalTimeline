import { describe, expect, it } from 'vitest';
import picasso from '../fixtures/Q5593.json';
import apollo11 from '../fixtures/Q43653.json';
import apollo from '../fixtures/Q46611.json';
import renaissance from '../fixtures/Q4692.json';
import cretaceous from '../fixtures/Q44626.json';
import revolution from '../fixtures/Q6534.json';
import war from '../fixtures/Q362.json';
import { defaultSettings, evaluate, labDate, sourceUrl, type LabSnapshot } from '../model';

const snapshot = (value: unknown) => structuredClone(value) as LabSnapshot;
describe('generation laboratory on captured public Wikidata declarations', () => {
  it('extracts Picasso’s life and seven notable works with independent statement identities', () => {
    const data = snapshot(picasso), original = JSON.stringify(data);
    const items = evaluate(data, 'person', defaultSettings);
    const born = items.find(i => i.source.property === 'P569')!;
    const died = items.find(i => i.source.property === 'P570')!;
    expect(born.start?.raw).toBe('1881-10-25');
    expect(died.start?.raw).toBe('1973-04-08');
    expect(born.id).not.toBe(died.id);
    expect(born.source.qid).toBe(died.source.qid);
    expect(born.source.statementId).toBeTruthy();
    expect(sourceUrl(born)).toContain('https://www.wikidata.org/wiki/Q5593#');
    expect(items.filter(i => i.category === 'Œuvres' && i.status === 'retained')).toHaveLength(7);
    expect(new Set(items.map(i => i.id)).size).toBe(items.length);
    expect(JSON.stringify(data)).toBe(original);
  });
  it('keeps undated relationships visible for review without inventing a date', () => {
    const items = evaluate(snapshot(picasso), 'person', defaultSettings);
    const training = items.find(i => i.source.property === 'P69')!;
    expect(training.start).not.toBeNull();
    expect(training.end).toBeNull();
    expect(training.status).toBe('review');
    expect(items.some(i => !i.start && i.status === 'review')).toBe(true);
  });
  it('applies biography and work controls without changing the recorded source', () => {
    const items = evaluate(snapshot(picasso), 'person', { ...defaultSettings, biography: false });
    expect(items.filter(i => i.status === 'retained').every(i => i.category === 'Œuvres')).toBe(true);
    const life = evaluate(snapshot(picasso), 'person', { ...defaultSettings, works: false });
    expect(life.filter(i => i.category === 'Œuvres').every(i => i.status === 'excluded')).toBe(true);
  });
  it('reads Apollo launch/return dates and retains two distinct docking statements', () => {
    const items = evaluate(snapshot(apollo11), 'space', defaultSettings);
    const mission = items.find(i => i.origin === 'entity' && i.qid === 'Q43653')!;
    expect(mission.status).toBe('retained');
    expect(mission.start?.raw).toBe('1969-07-16');
    expect(mission.end?.raw).toBe('1969-07-24');
    const dockings = items.filter(i => i.targetQid === 'Q557450');
    expect(dockings).toHaveLength(2);
    expect(dockings.every(i => i.status === 'retained')).toBe(true);
    expect(dockings[0].id).not.toBe(dockings[1].id);
    expect(items.find(i => i.origin === 'fact' && i.source.property === 'P619')?.status).toBe('excluded');
    expect(items.find(i => i.origin === 'fact' && i.source.property === 'P620')?.status).toBe('excluded');
    expect(items.find(i => i.qid === 'Q80218435')?.status).toBe('excluded');
  });
  it('does not treat a year-level programme end as January 1 and lose its final missions', () => {
    const items = evaluate(snapshot(apollo), 'space', defaultSettings);
    for (const qid of ['Q43653', 'Q188168', 'Q180971']) expect(items.find(i => i.qid === qid && i.origin === 'entity')?.status).toBe('retained');
  });
  it('preserves century precision for the Renaissance and allows the user to require review', () => {
    const data = snapshot(renaissance);
    const root = evaluate(data, 'history', defaultSettings).find(i => i.qid === 'Q4692')!;
    expect(root.start?.label).toBe('vers 1400');
    expect(root.start?.precision).toBe(7);
    expect(root.start?.approximate).toBe(true);
    expect(root.status).toBe('retained');
    expect(evaluate(data, 'history', { ...defaultSettings, approximate: false }).find(i => i.qid === 'Q4692')?.status).toBe('review');
  });
  it('requires review for conflicting same-rank dates and unsupported calendars', () => {
    const conflict = labDate([{ time: '+1900-01-01T00:00:00Z', precision: 11 }, { time: '+1901-01-01T00:00:00Z', precision: 11 }]);
    expect(conflict?.order).toBeNull(); expect(conflict?.values).toHaveLength(2);
    const unsupported = labDate([{ time: '+1400-00-00T00:00:00Z', precision: 7, calendarmodel: 'http://www.wikidata.org/entity/Q28892' }]);
    expect(unsupported?.order).toBeNull();
  });
  it('retains current Cretaceous subdivisions and explains why the obsolete one is excluded', () => {
    const items = evaluate(snapshot(cretaceous), 'geology', defaultSettings);
    expect(items.find(i => i.qid === 'Q2070512')?.status).toBe('excluded');
    expect(items.find(i => i.qid === 'Q2070512')?.reasons.join(' ')).toContain('obsolète');
    expect(items.find(i => i.qid === 'Q55811')?.start?.raw).toBe('M66');
    expect(items.find(i => i.qid === 'Q752187')?.status).toBe('retained');
  });
  it('keeps Normandy in the historical selection and excludes the postwar badge from the old engine', () => {
    const items = evaluate(snapshot(war), 'history', defaultSettings);
    expect(items.find(i => i.qid === 'Q16470')?.status).toBe('retained');
    expect(items.find(i => i.qid === 'Q11776606')?.status).toBe('excluded');
    expect(items.filter(i => i.status === 'retained').length).toBeLessThanOrEqual(40);
    expect(evaluate(snapshot(war), 'history', { ...defaultSettings, limit: 20 }).filter(i => i.status === 'retained')).toHaveLength(20);
  });
  it('deduplicates a dated significant-event qualifier and its independent event entity', () => {
    const items = evaluate(snapshot(revolution), 'history', defaultSettings);
    expect(items.filter(i => i.status === 'retained' && (i.qid === 'Q6539' || i.targetQid === 'Q6539'))).toHaveLength(1);
    expect(items.find(i => i.targetQid === 'Q6539')?.reasons.join(' ')).toContain('Doublon');
  });
  it('keeps a sourced fact when its candidate counterpart could not be qualified', () => {
    const data = snapshot(revolution); data.eligible = [];
    const items = evaluate(data, 'history', defaultSettings);
    expect(items.find(i => i.targetQid === 'Q6539')?.status).toBe('retained');
    expect(items.find(i => i.origin === 'entity' && i.qid === 'Q6539')?.status).toBe('excluded');
  });
});
