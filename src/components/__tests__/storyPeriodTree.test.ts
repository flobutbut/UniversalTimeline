import { afterEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import StoryPeriodTree from '@/views/DatabaseView/StoryPeriodTree.vue';
import { buildStoryPeriodTree, filterStoryPeriodTree } from '@/lib/storyPeriodTree';
import type { ListPeriod } from '@/types/database';

const period = (id: string, parent: string | null = null, extra: Partial<ListPeriod> = {}): ListPeriod => ({
  id, label: { fr: id, en: '' }, startDate: 'M65', endDate: 'NOW', categories: [], storyParentId: parent, ...extra,
});
const periods = [period('root'), period('child', 'root'), period('leaf', 'child'), period('other')];
let view: ReturnType<typeof mount>;
const row = (id: string) => view.get(`[role="treeitem"][data-period-id="${id}"]`);
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); });

it('keeps only frise roots, honors explicit placement and attaches suggestions without moving saved periods', () => {
  const tree = buildStoryPeriodTree([period('root', null, { parentId: 'global' }), period('child', 'root')], [period('unrelated'), period('suggestion', 'root'), period('child', 'suggestion')]);
  expect(tree.map(node => node.period.id)).toEqual(['root']);
  expect(tree[0].children.map(node => [node.period.id, node.inStory])).toEqual([['child', true], ['suggestion', false]]);
});

it('keeps matching descendants and their ancestors for combined accent-insensitive search and category filters', () => {
  const tree = buildStoryPeriodTree([...periods, period('Éocène', 'child', { categories: [{ id: 'geo', label: { fr: 'Géologie', en: '' } }] })]);
  const result = filterStoryPeriodTree(tree, 'eocene', 'geo');
  expect(result.map(node => node.period.id)).toEqual(['root']);
  expect(result[0].children[0].children.map(node => node.period.id)).toEqual(['Éocène']);
  expect(filterStoryPeriodTree(tree, 'eocene', 'other')).toEqual([]);
});

it('does not recurse forever on an old cycle or a cyclic Wikidata suggestion', () => {
  const tree = buildStoryPeriodTree([period('a', 'b'), period('b', 'a')], [period('extra', 'a'), period('extra', 'extra')]);
  expect(tree).toHaveLength(1);
  expect(tree[0].period.id).toBe('a');
  expect(tree[0].children.some(node => node.period.id === 'extra')).toBe(true);
});

it('separates branch expansion from selection and retains expanded sibling branches', async () => {
  view = mount(StoryPeriodTree, { props: { storyId: 'one', periods: [...periods, period('other-child', 'other')] } });
  expect(row('root').attributes('aria-expanded')).toBe('true');
  expect(row('child').attributes('aria-expanded')).toBe('false');
  await row('child').get('button').trigger('click');
  expect(row('leaf').exists()).toBe(true);
  expect(view.emitted('select')).toBeUndefined();
  await row('other').trigger('click');
  expect(view.emitted('select')).toEqual([['other']]);
  expect(row('leaf').exists()).toBe(true);
  await row('root').get('button').trigger('click');
  expect(view.find('[data-period-id="child"]').exists()).toBe(false);
  expect(row('other-child').exists()).toBe(true);
});

it('reveals a selected descendant from the timeline without selecting it a second time', async () => {
  view = mount(StoryPeriodTree, { props: { storyId: 'one', periods } });
  await row('root').get('button').trigger('click');
  await view.setProps({ selectedId: 'leaf' }); await flushPromises();
  expect(row('root').attributes('aria-expanded')).toBe('true');
  expect(row('child').attributes('aria-expanded')).toBe('true');
  expect(row('leaf').attributes('aria-selected')).toBe('true');
  expect(row('leaf').attributes('aria-level')).toBe('3');
  expect(row('leaf').attributes('tabindex')).toBe('0');
  expect(view.emitted('select')).toBeUndefined();
});

it('supports arrows, Home, End and explicit keyboard selection with one tree tab stop', async () => {
  view = mount(StoryPeriodTree, { props: { storyId: 'one', periods }, attachTo: document.body });
  row('root').element.focus();
  await row('root').trigger('keydown', { key: 'ArrowRight' }); await flushPromises();
  expect(document.activeElement).toBe(row('child').element);
  await row('child').trigger('keydown', { key: 'ArrowRight' });
  expect(row('child').attributes('aria-expanded')).toBe('true');
  await row('child').trigger('keydown', { key: 'ArrowRight' }); await flushPromises();
  expect(document.activeElement).toBe(row('leaf').element);
  await row('leaf').trigger('keydown', { key: 'Enter' });
  expect(view.emitted('select')).toEqual([['leaf']]);
  await row('leaf').trigger('keydown', { key: 'ArrowLeft' }); await flushPromises();
  expect(document.activeElement).toBe(row('child').element);
  await row('child').trigger('keydown', { key: 'End' }); await flushPromises();
  expect(document.activeElement).toBe(row('leaf').element);
  await row('leaf').trigger('keydown', { key: 'Home' }); await flushPromises();
  expect(document.activeElement).toBe(row('other').element);
  expect(view.findAll('[role="treeitem"][tabindex="0"]')).toHaveLength(1);
});

it('allows a filtered branch to be collapsed and keeps suggestions distinct from saved rows', async () => {
  view = mount(StoryPeriodTree, { props: { storyId: 'one', periods, search: 'leaf', showAdditional: true, additionalPeriods: [period('suggestion', 'root')] } });
  expect(row('leaf').exists()).toBe(true);
  await row('root').get('button').trigger('click');
  expect(view.find('[data-period-id="leaf"]').exists()).toBe(false);
  await view.setProps({ search: '' });
  expect(row('suggestion').classes()).toContain('is-additional');
  expect(row('suggestion').text()).toContain('Hors de cette frise');
});
