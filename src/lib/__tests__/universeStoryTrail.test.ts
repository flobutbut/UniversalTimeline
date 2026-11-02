import { expect, it, vi } from 'vitest';
import { universeStoryTrail } from '@/lib/universeStoryTrail';
import { storyFixture } from '@/testFixtures/story';
import type { Story, StoryAnchor } from '@/types/database';

const period = (id: string, parent_id: string | null = null) => ({ id, parent_id, label_fr: id, start_years_bp: 100, end_years_bp: 0 });
const story = (id: string, periods = [period(`root-${id}`)]) => storyFixture(id, periods);
function connect(from: Story, to: Story, anchor: StoryAnchor = { type: 'period', id: from.periods[0].id }) {
  (from.childStories ??= []).push({ id: to.id, title: to.title, anchors: [anchor] });
  (to.parentStories ??= []).push({ id: from.id, title: from.title, anchors: [{ ...anchor, label: { fr: anchor.id, en: '' } }] });
}
function graph(...stories: Story[]) {
  const rows = new Map(stories.map(story => [story.id, story]));
  return { ids: new Set(rows.keys()), load: vi.fn(async (id: string) => {
    const row = rows.get(id); if (!row) throw new Error('Introuvable'); return row;
  }) };
}

it('finds real entry points from the Universe and stops at the parent of a leaf anchor', async () => {
  const root = story('1', [period('universe'), period('solar', 'universe'), period('earth', 'solar')]);
  const middle = story('2', [period('earth'), period('culture', 'earth')]);
  const destination = story('3');
  connect(root, middle, { type: 'period', id: 'earth' }); connect(middle, destination);
  const { ids, load } = graph(root, middle, destination);
  expect(await universeStoryTrail(destination, ids, load)).toEqual([
    { storyId: '1', periodId: 'solar' }, { storyId: '2', periodId: 'earth' },
  ]);
});

it('finds the shortest path rather than the first complete parent lineage', async () => {
  const root = story('1'), a = story('2'), b = story('3'), c = story('4'), destination = story('5');
  connect(root, a); connect(a, c); connect(c, destination);
  connect(root, b); connect(b, destination);
  const { ids, load } = graph(root, a, b, c, destination);
  expect((await universeStoryTrail(destination, ids, load)).map(target => target.storyId)).toEqual(['1', '3']);
});

it('uses a direct Universe link without reading its longer neighboring branches', async () => {
  const root = story('1'), middle = story('2'), destination = story('3');
  connect(middle, destination); connect(root, destination);
  const { ids, load } = graph(root, middle, destination);
  expect((await universeStoryTrail(destination, ids, load)).map(target => target.storyId)).toEqual(['1']);
  expect(load).toHaveBeenCalledExactlyOnceWith('1');
});

it('also follows the associations created by a shared event', async () => {
  const root = story('1'), destination = story('2');
  const event = { id: 'writing', label: { fr: 'Écriture', en: '' }, date: '-3200', categories: [] };
  root.events = [event]; destination.events = [event];
  root.relatedStories = [{ id: '2', title: destination.title, periodIds: [], eventIds: ['writing'] }];
  destination.relatedStories = [{ id: '1', title: root.title, periodIds: [], eventIds: ['writing'] }];
  const { ids, load } = graph(root, destination);
  expect(await universeStoryTrail(destination, ids, load)).toEqual([{ storyId: '1', view: 'overview' }]);
});

it('does not invent a path from an editorial parent without a navigable forward link', async () => {
  const root = story('1'), destination = { ...story('2'), parentStoryId: '1' };
  const { ids, load } = graph(root, destination);
  expect(await universeStoryTrail(destination, ids, load)).toEqual([]);
});

it('handles cycles and disconnected frises without duplicating a node', async () => {
  const root = story('1'), a = story('2'), b = story('3'); connect(a, b); connect(b, a);
  const { ids, load } = graph(root, a, b);
  expect(await universeStoryTrail(b, ids, load)).toEqual([]);
  expect(load).toHaveBeenCalledExactlyOnceWith('2');
});

it('never fetches a predecessor absent from the readable catalogue', async () => {
  const root = story('1'), hidden = story('2'), destination = story('3');
  connect(root, hidden); connect(hidden, destination);
  const { load } = graph(root, hidden, destination);
  expect(await universeStoryTrail(destination, new Set(['1', '3']), load)).toEqual([]);
  expect(load).not.toHaveBeenCalled();
});

it('does not block an independent destination if an ancestor is unavailable', async () => {
  const root = story('1'), destination = story('2'); connect(root, destination);
  const load = vi.fn(async () => { throw new Error('Indisponible'); });
  expect(await universeStoryTrail(destination, new Set(['1', '2']), load)).toEqual([]);
});

it('discards the path when another navigation supersedes its loading', async () => {
  const root = story('1'), destination = story('2'); connect(root, destination);
  let current = true;
  const load = vi.fn(async () => { current = false; return root; });
  expect(await universeStoryTrail(destination, new Set(['1', '2']), load, () => current)).toEqual([]);
});

it('checks every connection to a shared predecessor before rejecting it', async () => {
  const root = story('1'), a = story('2'), b = story('3'), destination = story('4');
  connect(root, a); root.childStories = [];
  connect(root, b); connect(a, destination); connect(b, destination);
  const { ids, load } = graph(root, a, b, destination);
  expect((await universeStoryTrail(destination, ids, load)).map(target => target.storyId)).toEqual(['1', '3']);
});
