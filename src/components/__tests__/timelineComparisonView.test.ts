import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router';
import { defineComponent } from 'vue';
import HomeView from '@/views/HomeView.vue';
import { EventApiService } from '@/services/EventApiService';
import { useDataStore } from '@/stores/useDataStore';
import { StoryApiService } from '@/services/StoryApiService';
import { storyFixture } from '@/testFixtures/story';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import Select from '@/components/base/Select.vue';
import Switch from '@/components/base/Switch.vue';

// La timeline réelle, avec une seconde frise portée par le paramètre `compare`.
const dto = (id: string, parentId: string | null, start: string, end: string) =>
  ({ id, parent_id: parentId, label_fr: id, start_date: start, end_date: end, has_children: !!parentId === false });
const stories: Record<string, ReturnType<typeof storyFixture>> = {
  '1': storyFixture('1', [dto('bourbons', null, '1589', '1789'), dto('louis', 'bourbons', '1643', '1715')],
    [{ id: 'declaration', label_fr: 'Déclaration', date: '1776-07-04' }] as never),
  '2': storyFixture('2', [dto('colonial', null, '1607', '1765'), dto('revolution', null, '1765', '1783')],
    [{ id: 'declaration', label_fr: 'Déclaration', date: '1776-07-04' }] as never),
  '3': storyFixture('3', [dto('modern', null, '1600', '1900'), dto('enlightenment', 'modern', '1685', '1815')],
    [{ id: 'declaration', label_fr: 'Déclaration', date: '1776-07-04' }] as never),
};
let view: VueWrapper;
let router: Router;
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-09T00:00:00Z'));
  const api = StoryApiService.getInstance();
  vi.spyOn(api, 'getListStories').mockResolvedValue(Object.values(stories));
  vi.spyOn(api, 'getStory').mockImplementation(async id => stories[id]);
  vi.spyOn(EventApiService.getInstance(), 'getStoryListEvents').mockResolvedValue([]);
});
afterEach(() => { view?.unmount(); router?.options.history.destroy(); vi.restoreAllMocks(); });
async function open(path: string, cached = false) {
  router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/timeline', name: 'timeline', component: HomeView },
    { path: '/database', name: 'database', component: { template: '<div />' } },
  ] });
  await router.push(path); await router.isReady();
  const root = cached ? defineComponent({ components: { RouterView }, template: '<RouterView v-slot="{ Component }"><KeepAlive include="HomeView"><component :is="Component" /></KeepAlive></RouterView>' }) : HomeView;
  view = mount(root, { attachTo: document.body, global: { plugins: [createPinia(), router] } });
  await flushPromises(); await flushPromises();
}
const sections = () => view.findAll('section.home-view__frise');

it('keeps the single timeline unchanged until a frise is added', async () => {
  await open('/timeline?story=1');
  expect(sections()).toHaveLength(1);
  expect(view.find('[aria-label^="Retirer "]').exists()).toBe(false);
  expect(view.find('.period-grid--compact').exists()).toBe(false);
  expect(view.find('.home-view__frise--active').exists()).toBe(false);
  expect(view.find('[data-panel-toggle]').exists()).toBe(false);
  expect(view.getComponent(Switch).props('label')).toBe('Étendre');
  expect(view.getComponent(PeriodGrid).props('axisViewport')).toBe(view.get('.home-view__viewport').element);
  expect(view.getComponent(PeriodGrid).props('naturalHeight')).toBe(true);
  expect(view.text()).toContain('Ajouter une frise');
});

it('opens the compared frise from the URL, in compact mode, and removes it from the URL', async () => {
  await open('/timeline?story=1&compare=2');
  expect(sections()).toHaveLength(2);
  expect(sections()[1].attributes('aria-label')).toBe('Frise : Frise 2');
  expect(view.findAll('.period-grid--compact')).toHaveLength(2);
  expect(view.findAllComponents(PeriodGrid).every(grid => !grid.props('axisViewport'))).toBe(true);
  expect(view.text()).toContain('Ajouter une frise');
  // Chaque frise garde ses propres événements, même partagés.
  expect(sections()[1].find('[data-event-id="declaration"]').exists()).toBe(true);
  await view.get('[aria-label="Retirer Frise 2"]').trigger('click'); await flushPromises();
  expect(sections()).toHaveLength(1);
  expect(router.currentRoute.value.query).toEqual({ story: '1' });
});

it('keeps the comparison while the first frise navigates', async () => {
  await open('/timeline?story=1&compare=2');
  // La racine unique est déjà ouverte : on descend dans l’une de ses sous-périodes.
  await sections()[0].get('[data-period-id="louis"]').trigger('click'); await flushPromises(); await flushPromises();
  expect(router.currentRoute.value.query).toMatchObject({ story: '1', period: 'louis', compare: '2' });
  expect(sections()).toHaveLength(2);
});

it('ignores a comparison with the same frise or an invalid identifier', async () => {
  await open('/timeline?story=1&compare=1');
  expect(sections()).toHaveLength(1);
  view.unmount(); router.options.history.destroy();
  await open('/timeline?story=1&compare=abc');
  expect(sections()).toHaveLength(1);
  expect(view.find('[role="alert"]').exists()).toBe(false);
});

const storyOrder = () => sections().map(section => section.attributes('data-story-id'));
const sectionFor = (id: string) => sections().find(section => section.attributes('data-story-id') === id)!;
const settle = async () => { await flushPromises(); await flushPromises(); };

it('adds several frises and excludes every open frise from the picker', async () => {
  await open('/timeline?story=1');
  for (const id of ['2', '3']) {
    await view.findAll('button').find(button => button.text() === 'Ajouter une frise')!.trigger('click');
    const picker = view.findAllComponents(Select).find(select => select.classes('home-view__story-picker'))!;
    expect(picker.props('options').map((option: { value: string }) => option.value)).not.toContain('1');
    if (id === '3') expect(picker.props('options').map((option: { value: string }) => option.value)).not.toContain('2');
    picker.vm.$emit('update:modelValue', id); await settle();
  }
  expect(storyOrder()).toEqual(['1', '2', '3']);
  expect(router.currentRoute.value.query).toEqual({ story: '1', compare: ['2', '3'] });
  expect(view.findAll('.period-grid--compact')).toHaveLength(3);
});

it('inserts an associated frise right below its origin and hides the action once it is open', async () => {
  vi.mocked(StoryApiService.getInstance().getStory).mockImplementation(async id => id === '1'
    ? { ...stories['1'], childStories: [{ id: '3', title: { fr: 'Frise 3', en: '' }, anchors: [], atRoot: true }] }
    : stories[id]);
  await open('/timeline?story=1&compare=2');
  const addFromHeader = () => document.body.querySelector<HTMLElement>('[aria-label="Ajouter Frise 3 sous cette frise"]');
  await sectionFor('1').get('.home-view__story-selector button').trigger('click'); await settle();
  addFromHeader()!.click(); await settle(); await flushPromises();
  expect(storyOrder()).toEqual(['1', '3', '2']);
  expect(router.currentRoute.value.query).toEqual({ story: '1', compare: ['3', '2'] });
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Replier Frise 3');
  expect(addFromHeader()).toBeNull();
});

it('restores all frises and their visual order, ignoring invalid, repeated and unknown order entries', async () => {
  await open('/timeline?story=1&compare=2&compare=abc&compare=3&compare=2&compare=1&order=3&order=1&order=3&order=999');
  expect(storyOrder()).toEqual(['3', '1', '2']);
  expect(sectionFor('1').attributes('data-leading')).toBe('true');
  expect(view.findAllComponents(PeriodGrid)).toHaveLength(3);
});

it('minimizes every frise while keeping its periods, events, grid instance and common frame', async () => {
  await open('/timeline?story=1&compare=2&compare=3');
  const frame = sectionFor('1').getComponent(PeriodGrid).vm.getScaleFrame();
  const gridId = sectionFor('1').getComponent(PeriodGrid).vm.$.uid;
  expect(frame).not.toBeNull();
  await view.get('[aria-label="Replier Frise 1"]').trigger('click'); await settle();
  expect(sectionFor('1').get('.home-view__breadcrumbs').text()).toContain('bourbons');
  expect(sectionFor('1').findAll('.story-breadcrumb').length).toBeGreaterThan(0);
  expect(sectionFor('1').getComponent(PeriodGrid).props('minimized')).toBe(true);
  expect(sectionFor('1').getComponent(PeriodGrid).vm.$.uid).toBe(gridId);
  expect(sectionFor('1').get('[data-period-id="louis"]').exists()).toBe(true);
  expect(sectionFor('1').get('[data-event-id="declaration"]').exists()).toBe(true);
  expect(sectionFor('1').find('.event-card.is-default-open').exists()).toBe(false);
  expect(sectionFor('2').getComponent(PeriodGrid).props('scaleFrame')).toEqual(frame);
  for (const id of ['2', '3']) await view.get(`[aria-label="Replier Frise ${id}"]`).trigger('click');
  await settle();
  expect(view.findAllComponents(PeriodGrid)).toHaveLength(3);
  expect(view.findAllComponents(PeriodGrid).every(grid => grid.props('minimized'))).toBe(true);
  expect(sections().every(section => section.classes('home-view__frise--collapsed'))).toBe(true);
  await view.get('[aria-label="Déplier Frise 3"]').trigger('click'); await settle();
  expect(sectionFor('3').getComponent(PeriodGrid).props('scaleFrame')).toEqual(frame);
  await view.get('[aria-label="Déplier Frise 1"]').trigger('click'); await settle();
  expect(sectionFor('1').getComponent(PeriodGrid).vm.getScaleFrame()).toEqual(frame);
  expect(sectionFor('1').getComponent(PeriodGrid).props('currentPeriod')?.id).toBe('bourbons');
});

it('places the add control outside the scrollable stack so it overlays the available timeline height', async () => {
  await open('/timeline?story=1&compare=2');
  expect(view.get('.home-view__add').element.parentElement).toBe(view.get('.home-view').element);
  expect(view.get('.home-view__stack').find('.home-view__add').exists()).toBe(false);
});

it('restores the single view and its extension preference after removing the last comparison', async () => {
  await open('/timeline?story=1');
  view.getComponent(Switch).vm.$emit('update:modelValue', true); await settle();
  expect(view.getComponent(PeriodGrid).props('showChildren')).toBe(true);
  await view.findAll('button').find(button => button.text() === 'Ajouter une frise')!.trigger('click');
  view.findAllComponents(Select).find(select => select.classes('home-view__story-picker'))!.vm.$emit('update:modelValue', '2'); await settle();
  expect(view.findComponent(Switch).exists()).toBe(false);
  expect(view.findAll('.home-view__frise--active')).toHaveLength(1);
  expect(sectionFor('1').getComponent(PeriodGrid).props('showChildren')).toBe(false);
  await view.get('[aria-label="Replier Frise 1"]').trigger('click'); await settle();
  await view.get('[aria-label="Retirer Frise 2"]').trigger('click'); await settle();
  expect(sections()).toHaveLength(1);
  expect(sections()[0].classes()).not.toContain('home-view__frise--active');
  expect(sections()[0].classes()).not.toContain('home-view__frise--collapsed');
  expect(view.find('[data-panel-toggle]').exists()).toBe(false);
  expect(view.getComponent(Switch).props('modelValue')).toBe(true);
  expect(view.getComponent(PeriodGrid).props()).toMatchObject({ compact: false, minimized: false, showChildren: true });
  expect(view.getComponent(PeriodGrid).props('axisViewport')).toBe(view.get('.home-view__viewport').element);
});

it('also leaves the minimized comparison mode when the URL returns to a single frise', async () => {
  await open('/timeline?story=1&compare=2');
  await view.get('[aria-label="Replier Frise 1"]').trigger('click'); await settle();
  await router.push('/timeline?story=1'); await settle();
  expect(view.find('.home-view__frise--active').exists()).toBe(false);
  expect(view.find('.home-view__frise--collapsed').exists()).toBe(false);
  expect(view.getComponent(Switch).props('label')).toBe('Étendre');
  expect(view.getComponent(PeriodGrid).props('minimized')).toBe(false);
});

it('moves the primary frise by drag and keyboard while keeping panel instances and collapse state', async () => {
  await open('/timeline?story=1&compare=2&compare=3');
  const primaryGridId = sectionFor('1').getComponent(PeriodGrid).vm.$.uid;
  await view.get('[aria-label="Replier Frise 2"]').trigger('click'); await settle();
  const target = sectionFor('3');
  vi.spyOn(target.element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 400, 800, 240));
  const transfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
  await view.get('[aria-label="Déplacer Frise 1"]').trigger('dragstart', { dataTransfer: transfer });
  await target.trigger('dragover', { clientY: 620, dataTransfer: transfer });
  expect(target.classes()).toContain('home-view__frise--drop-after');
  await target.trigger('drop', { dataTransfer: transfer }); await settle();
  expect(storyOrder()).toEqual(['2', '3', '1']);
  expect(router.currentRoute.value.query).toMatchObject({ story: '1', compare: ['2', '3'], order: ['2', '3', '1'] });
  expect(sectionFor('1').getComponent(PeriodGrid).vm.$.uid).toBe(primaryGridId);
  expect(sectionFor('1').attributes('data-leading')).toBe('true');
  expect(sectionFor('2').classes()).toContain('home-view__frise--collapsed');
  await view.get('[aria-label="Déplacer Frise 1"]').trigger('keydown', { key: 'ArrowUp', altKey: true }); await settle();
  expect(storyOrder()).toEqual(['2', '1', '3']);
  expect(view.get('[role="status"]').text()).toContain('position 2 sur 3');
  const location = router.currentRoute.value.fullPath;
  view.unmount(); router.options.history.destroy();
  await open(location);
  expect(storyOrder()).toEqual(['2', '1', '3']);
});

it('cancels a drag without changing the order and supports the mobile move buttons', async () => {
  await open('/timeline?story=1&compare=2&compare=3');
  await view.get('[aria-label="Déplacer Frise 3"]').trigger('dragstart');
  await sectionFor('1').trigger('dragover', { clientY: 0 });
  await view.get('[aria-label="Déplacer Frise 3"]').trigger('dragend');
  await sectionFor('1').trigger('drop'); await settle();
  expect(storyOrder()).toEqual(['1', '2', '3']);
  await view.get('[aria-label="Monter Frise 3"]').trigger('click'); await settle();
  expect(storyOrder()).toEqual(['1', '3', '2']);
  expect(router.currentRoute.value.query.compare).toEqual(['3', '2']);
});

it('lets the third frise lead in place, keeps that navigation on collapse, and restores the primary on removal', async () => {
  await open('/timeline?story=1&compare=2&compare=3');
  await sectionFor('3').get('[data-period-id="modern"]').trigger('click'); await settle();
  await sectionFor('3').get('[data-period-id="enlightenment"]').trigger('click'); await settle();
  expect(sectionFor('3').attributes('data-leading')).toBe('true');
  expect(sectionFor('3').getComponent(PeriodGrid).props('currentPeriod')?.id).toBe('enlightenment');
  const frame = sectionFor('3').getComponent(PeriodGrid).vm.getScaleFrame();
  expect(sectionFor('1').getComponent(PeriodGrid).props('scaleFrame')).toEqual(frame);
  await view.get('[aria-label="Replier Frise 3"]').trigger('click'); await settle();
  expect(sectionFor('1').getComponent(PeriodGrid).props('scaleFrame')).toEqual(frame);
  await view.get('[aria-label="Déplier Frise 3"]').trigger('click'); await settle();
  expect(sectionFor('3').getComponent(PeriodGrid).props('currentPeriod')?.id).toBe('enlightenment');
  await view.get('[aria-label="Retirer Frise 3"]').trigger('click'); await settle();
  expect(storyOrder()).toEqual(['1', '2']);
  expect(sectionFor('1').attributes('data-leading')).toBe('true');
  expect(router.currentRoute.value.query).toMatchObject({ story: '1', compare: '2' });
});

it('preserves the other panels and their order when the primary frise navigates or browser history changes', async () => {
  await open('/timeline?story=1&compare=2&compare=3&order=3&order=1&order=2');
  await sectionFor('1').get('[data-period-id="louis"]').trigger('click'); await settle();
  expect(router.currentRoute.value.query).toMatchObject({ period: 'louis', compare: ['3', '2'], order: ['3', '1', '2'] });
  expect(storyOrder()).toEqual(['3', '1', '2']);
  router.back(); await settle();
  expect(router.currentRoute.value.query.period).toBeUndefined();
  expect(storyOrder()).toEqual(['3', '1', '2']);
});

it('shows a failed follower independently and retries it without disturbing the other panels', async () => {
  const api = StoryApiService.getInstance();
  let failed = true;
  vi.mocked(api.getStory).mockImplementation(async id => {
    if (id === '2' && failed) throw new Error('Frise indisponible');
    return stories[id];
  });
  await open('/timeline?story=1&compare=2&compare=3');
  expect(sectionFor('2').get('[role="alert"]').text()).toContain('Frise indisponible');
  expect(sectionFor('1').findComponent(PeriodGrid).exists()).toBe(true);
  expect(sectionFor('3').findComponent(PeriodGrid).exists()).toBe(true);
  failed = false;
  await sectionFor('2').get('[role="alert"] button').trigger('click'); await settle();
  expect(sectionFor('2').find('[role="alert"]').exists()).toBe(false);
  expect(sectionFor('2').get('[data-event-id="declaration"]').exists()).toBe(true);
});

it('deduplicates a frise reached from another panel and keeps the panel that navigated', async () => {
  await open('/timeline?story=1&compare=2&compare=3');
  const secondKey = sectionFor('2').attributes('data-lane-key');
  sectionFor('2').getComponent(PeriodGrid).vm.$emit('story-select', '3'); await settle();
  expect(storyOrder()).toEqual(['1', '3']);
  expect(sectionFor('3').attributes('data-lane-key')).toBe(secondKey);
  expect(sectionFor('3').attributes('data-leading')).toBe('true');
  expect(router.currentRoute.value.query.compare).toBe('3');
});

it('restores focus to the next panel when removing a comparison placed before the primary', async () => {
  await open('/timeline?story=1&compare=2&compare=3&order=2&order=1&order=3');
  await view.get('[aria-label="Retirer Frise 2"]').trigger('click'); await settle();
  expect(storyOrder()).toEqual(['1', '3']);
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Replier Frise 1');
});

it('restores focus to the primary story selector after the last comparison is removed', async () => {
  vi.mocked(StoryApiService.getInstance().getStory).mockImplementation(async id => id === '1'
    ? { ...stories['1'], childStories: [{ id: '3', title: { fr: 'Frise 3', en: '' }, anchors: [], atRoot: true }] }
    : stories[id]);
  await open('/timeline?story=1&compare=2');
  const remove = view.get('[aria-label="Retirer Frise 2"]');
  (remove.element as HTMLElement).focus();
  await remove.trigger('click'); await settle();
  expect(document.activeElement).toBe(sectionFor('1').get('.home-view__story-selector button').element);
});

it('keeps the overlay add control unavailable while a chronological slide is active', async () => {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate');
  const finishes: Array<() => void> = [];
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: () => {
    let finish!: () => void;
    const finished = new Promise<void>(resolve => { finish = resolve; });
    finishes.push(finish);
    return { finished, cancel: finish };
  } });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 800, 500));
  try {
    await open('/timeline?story=2&period=colonial');
    await view.get('[data-period-direction="next"]').trigger('click'); await settle();
    expect(view.find('.home-view__viewport--sliding').exists()).toBe(true);
    expect(view.get('.home-view__add button').attributes('disabled')).toBeDefined();
    finishes.forEach(finish => finish()); await settle();
    expect(view.find('.home-view__viewport--sliding').exists()).toBe(false);
    expect(view.get('.home-view__add button').attributes('disabled')).toBeUndefined();
  } finally {
    finishes.forEach(finish => finish());
    if (original) Object.defineProperty(HTMLElement.prototype, 'animate', original);
    else delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
  }
});

it('does not change the leader when removing an unrelated follower', async () => {
  await open('/timeline?story=1&compare=2&compare=3');
  await sectionFor('3').get('[data-period-id="modern"]').trigger('click'); await settle();
  const grid = sectionFor('3').getComponent(PeriodGrid).vm.$.uid;
  await view.get('[aria-label="Retirer Frise 2"]').trigger('click'); await settle();
  expect(storyOrder()).toEqual(['1', '3']);
  expect(sectionFor('3').attributes('data-leading')).toBe('true');
  expect(sectionFor('3').getComponent(PeriodGrid).vm.$.uid).toBe(grid);
  expect(router.currentRoute.value.query.compare).toBe('3');
});

it('ignores a removed follower whose snapshot resolves after removal', async () => {
  let resolve!: (story: ReturnType<typeof storyFixture>) => void;
  const pending = new Promise<ReturnType<typeof storyFixture>>(yes => { resolve = yes; });
  vi.mocked(StoryApiService.getInstance().getStory).mockImplementation(id => id === '2' ? pending : Promise.resolve(stories[id]));
  await open('/timeline?story=1&compare=2&compare=3');
  expect(sectionFor('2').getComponent(PeriodGrid).props('loading')).toBe(true);
  await view.get('[aria-label="Retirer Frise 2"]').trigger('click'); await settle();
  resolve(stories['2']); await settle();
  expect(storyOrder()).toEqual(['1', '3']);
  expect(router.currentRoute.value.query.compare).toBe('3');
  expect(view.find('[role="alert"]').exists()).toBe(false);
});

it('keeps the primary panel collapsed when navigating one of its remaining periods', async () => {
  await open('/timeline?story=1&compare=2');
  await view.get('[aria-label="Replier Frise 1"]').trigger('click'); await settle();
  await sectionFor('1').get('[data-period-id="louis"]').trigger('click'); await settle();
  expect(router.currentRoute.value.query).toMatchObject({ period: 'louis', compare: '2' });
  expect(sectionFor('1').classes()).toContain('home-view__frise--collapsed');
  expect(sectionFor('1').getComponent(PeriodGrid).props('minimized')).toBe(true);
});


it('preserves comparison identities, local navigation, collapse and order across a real KeepAlive round trip', async () => {
  await open('/timeline?story=1&compare=2&compare=3&order=3&order=1&order=2', true);
  await sectionFor('3').get('[data-period-id="modern"]').trigger('click'); await settle();
  await sectionFor('3').get('[data-period-id="enlightenment"]').trigger('click'); await settle();
  await view.get('[aria-label="Replier Frise 3"]').trigger('click'); await settle();
  const ids = sections().map(section => section.getComponent(PeriodGrid).vm.$.uid);
  const location = router.currentRoute.value.fullPath;
  await router.push('/database'); await settle();
  expect(sections()).toHaveLength(0);
  await router.push(location); await settle();
  expect(storyOrder()).toEqual(['3', '1', '2']);
  expect(sections().map(section => section.getComponent(PeriodGrid).vm.$.uid)).toEqual(ids);
  expect(sectionFor('3').classes()).toContain('home-view__frise--collapsed');
  expect(sectionFor('3').attributes('data-leading')).toBe('true');
  expect(sectionFor('3').getComponent(PeriodGrid).props('currentPeriod')?.id).toBe('enlightenment');
});


it('retries the primary follower without reloading its inactive leading navigation', async () => {
  await open('/timeline?story=1&compare=2');
  useDataStore().invalidateStories();
  let failed = true;
  vi.mocked(StoryApiService.getInstance().getStory).mockImplementation(async id => {
    if (id === '1' && failed) throw new Error('Lecture de suivi indisponible');
    return stories[id];
  });
  await sectionFor('2').get('[data-period-id="colonial"]').trigger('click'); await settle();
  expect(sectionFor('2').attributes('data-leading')).toBe('true');
  expect(sectionFor('1').get('[role="alert"]').text()).toContain('Lecture de suivi indisponible');
  failed = false;
  await sectionFor('1').get('[role="alert"] button').trigger('click'); await settle();
  expect(sectionFor('1').find('[role="alert"]').exists()).toBe(false);
  expect(sectionFor('1').findComponent(PeriodGrid).exists()).toBe(true);
  expect(sectionFor('2').attributes('data-leading')).toBe('true');
});

it('selects a background without changing the common frame, displayed content, instances or URL', async () => {
  await open('/timeline?story=1&compare=2&compare=3');
  const initial = sectionFor('1').getComponent(PeriodGrid).vm.getScaleFrame();
  const content = () => sections().map(section => ({
    id: section.attributes('data-story-id'), uid: section.getComponent(PeriodGrid).vm.$.uid,
    periods: section.findAll('[data-period-id]').map(row => row.attributes('data-period-id')),
    events: section.findAll('[data-event-id]').map(row => row.attributes('data-event-id')),
    current: section.getComponent(PeriodGrid).props('currentPeriod')?.id,
  }));
  const before = content(), location = router.currentRoute.value.fullPath;
  const reads = vi.mocked(StoryApiService.getInstance().getStory).mock.calls.length;
  await sectionFor('2').get('.period-grid').trigger('click'); await settle();
  expect(sectionFor('2').attributes('data-selected')).toBe('true');
  expect(sectionFor('1').attributes('data-leading')).toBe('true');
  expect(sectionFor('1').getComponent(PeriodGrid).vm.getScaleFrame()).toEqual(initial);
  expect(content()).toEqual(before);
  await sectionFor('3').trigger('keydown', { key: 'Enter' }); await settle();
  expect(sectionFor('3').attributes('data-selected')).toBe('true');
  expect(sectionFor('2').attributes('data-selected')).toBeUndefined();
  expect(content()).toEqual(before);
  expect(router.currentRoute.value.fullPath).toBe(location);
  expect(StoryApiService.getInstance().getStory).toHaveBeenCalledTimes(reads);
});

it('reframes only after explicit period navigation or overview, selecting the panel that navigates', async () => {
  await open('/timeline?story=1&compare=2');
  const initial = sectionFor('1').getComponent(PeriodGrid).vm.getScaleFrame();
  await sectionFor('2').get('.period-grid').trigger('click'); await settle();
  await sectionFor('1').get('[data-period-id="louis"]').trigger('click'); await settle();
  expect(sectionFor('1').attributes('data-selected')).toBe('true');
  expect(sectionFor('1').getComponent(PeriodGrid).vm.getScaleFrame()).not.toEqual(initial);
  const narrowed = sectionFor('1').getComponent(PeriodGrid).vm.getScaleFrame();
  await sectionFor('2').get('.home-view__panel-content').trigger('click'); await settle();
  expect(sectionFor('2').getComponent(PeriodGrid).props('scaleFrame')).toEqual(narrowed);
  await sectionFor('2').get('.home-view__story-breadcrumb button').trigger('click'); await settle();
  expect(sectionFor('2').attributes('data-leading')).toBe('true');
  expect(sectionFor('2').attributes('data-selected')).toBe('true');
  expect(sectionFor('2').getComponent(PeriodGrid).vm.getScaleFrame()).not.toEqual(narrowed);
  expect(sectionFor('2').getComponent(PeriodGrid).props('currentPeriod')).toBeNull();
});

it('does not treat event selection, collapse or filter controls as a background selection', async () => {
  await open('/timeline?story=1&compare=2');
  await sectionFor('2').get('.event-dot').trigger('click'); await settle();
  expect(sectionFor('1').attributes('data-leading')).toBe('true');
  await view.get('[aria-label="Replier Frise 2"]').trigger('click'); await settle();
  expect(sectionFor('1').attributes('data-leading')).toBe('true');
  await sectionFor('2').get('.period-grid').trigger('click'); await settle();
  expect(sectionFor('2').attributes('data-selected')).toBe('true');
  expect(sectionFor('1').attributes('data-leading')).toBe('true');
  expect(sectionFor('2').classes()).toContain('home-view__frise--collapsed');
});

it('allows closing any frise while protecting the last remaining one', async () => {
  await open('/timeline?story=1&compare=2&compare=3');
  const secondKey = sectionFor('2').attributes('data-lane-key');
  await view.get('[aria-label="Retirer Frise 1"]').trigger('click'); await settle();
  expect(storyOrder()).toEqual(['2', '3']);
  expect(sectionFor('2').attributes('data-lane-key')).toBe(secondKey);
  expect(router.currentRoute.value.query).toMatchObject({ story: '2', compare: '3' });
  await sectionFor('2').get('[data-period-id="revolution"]').trigger('click'); await settle();
  expect(router.currentRoute.value.query).toMatchObject({ story: '2', period: 'revolution', compare: '3' });
  await view.get('[aria-label="Retirer Frise 2"]').trigger('click'); await settle();
  expect(storyOrder()).toEqual(['3']);
  expect(view.find('.home-view__frise--active').exists()).toBe(false);
  expect(view.getComponent(Switch).props('label')).toBe('Étendre');
  expect(view.find('[aria-label="Retirer Frise 3"]').exists()).toBe(false);
  expect(router.currentRoute.value.query.story).toBe('3');
  expect(router.currentRoute.value.query.empty).toBeUndefined();
  const add = view.get('.home-view__add button');
  expect(add.attributes('disabled')).toBeUndefined();
  await add.trigger('click');
  view.findAllComponents(Select).find(select => select.classes('home-view__story-picker'))!.vm.$emit('update:modelValue', '1'); await settle();
  expect(storyOrder()).toEqual(['3', '1']);
  expect(router.currentRoute.value.query).toMatchObject({ story: '3', compare: '1' });
  expect(view.find('[aria-label="Retirer Frise 3"]').exists()).toBe(true);
  expect(view.find('[aria-label="Retirer Frise 1"]').exists()).toBe(true);
});

it('promotes the selected surviving frise without losing its position or instance, then routes its actions', async () => {
  await open('/timeline?story=1&compare=2&compare=3');
  await sectionFor('3').get('[data-period-id="modern"]').trigger('click'); await settle();
  await sectionFor('3').get('[data-period-id="enlightenment"]').trigger('click'); await settle();
  const gridId = sectionFor('3').getComponent(PeriodGrid).vm.$.uid;
  await view.get('[aria-label="Retirer Frise 1"]').trigger('click'); await settle();
  expect(storyOrder()).toEqual(['2', '3']);
  expect(sectionFor('3').getComponent(PeriodGrid).vm.$.uid).toBe(gridId);
  expect(sectionFor('3').attributes('data-leading')).toBe('true');
  expect(router.currentRoute.value.query).toMatchObject({ story: '3', period: 'enlightenment', compare: '2', order: ['2', '3'] });
  await sectionFor('3').get('.period-card--parent .period-card__title-action').trigger('click'); await settle();
  expect(router.currentRoute.value.query).toMatchObject({ story: '3', period: 'modern' });
  await view.get('[aria-label="Monter Frise 3"]').trigger('click'); await settle();
  expect(storyOrder()).toEqual(['3', '2']);
});

it('opens and restores an intentionally empty view without loading a hidden frise', async () => {
  await open('/timeline?empty=1');
  expect(sections()).toHaveLength(0);
  expect(StoryApiService.getInstance().getStory).not.toHaveBeenCalled();
  expect(view.get('.home-view__add button').attributes('disabled')).toBeUndefined();
  await router.push('/timeline?story=2&compare=3'); await settle();
  expect(storyOrder()).toEqual(['2', '3']);
  router.back(); await settle();
  expect(sections()).toHaveLength(0);
  expect(router.currentRoute.value.query).toEqual({ empty: '1' });
});

it('marks the actual clipped period boundaries in a following frise', async () => {
  await open('/timeline?story=1&period=louis&compare=2');
  const period = sectionFor('2').get('[data-period-id="colonial"]');
  expect(period.classes()).toContain('period-card--continues-before');
  expect(period.classes()).toContain('period-card--continues-after');
  await sectionFor('2').get('.period-grid').trigger('click'); await settle();
  expect(sectionFor('2').get('[data-period-id="colonial"]').classes()).toContain('period-card--continues-before');
  await sectionFor('2').get('.home-view__story-breadcrumb button').trigger('click'); await settle();
  expect(sectionFor('2').get('[data-period-id="colonial"]').classes()).not.toContain('period-card--continues-before');
  expect(sectionFor('2').get('[data-period-id="colonial"]').classes()).not.toContain('period-card--continues-after');
});


it('labels known content outside the frame without changing the frame when that panel is selected', async () => {
  vi.mocked(StoryApiService.getInstance().getStory).mockImplementation(async id => id === '3'
    ? storyFixture('3', [dto('future', null, '2100', '2200')]) : stories[id]);
  await open('/timeline?story=1&compare=3');
  expect(sectionFor('3').text()).toContain('Hors de la période affichée');
  await sectionFor('3').get('.period-grid').trigger('click'); await settle();
  expect(sectionFor('3').attributes('data-selected')).toBe('true');
  expect(sectionFor('3').text()).toContain('Hors de la période affichée');
  expect(sectionFor('1').attributes('data-leading')).toBe('true');
  await sectionFor('3').get('.home-view__story-breadcrumb button').trigger('click'); await settle();
  expect(sectionFor('3').text()).not.toContain('Hors de la période affichée');
  expect(sectionFor('3').get('[data-period-id="future"]').exists()).toBe(true);
});

it('keeps an actually empty frise distinct from content outside the frame', async () => {
  vi.mocked(StoryApiService.getInstance().getStory).mockImplementation(async id => id === '3' ? storyFixture('3') : stories[id]);
  await open('/timeline?story=1&compare=3');
  expect(sectionFor('3').text()).toContain('Aucune période à afficher');
  expect(sectionFor('3').text()).not.toContain('Hors de la période affichée');
});

it('preserves the independent selection through reorder and unrelated removal, then chooses a survivor on close', async () => {
  await open('/timeline?story=1&compare=2&compare=3');
  await sectionFor('2').get('.period-grid').trigger('click'); await settle();
  const frame = sectionFor('1').getComponent(PeriodGrid).vm.getScaleFrame();
  await view.get('[aria-label="Descendre Frise 2"]').trigger('click'); await settle();
  expect(storyOrder()).toEqual(['1', '3', '2']);
  expect(sectionFor('2').attributes('data-selected')).toBe('true');
  await view.get('[aria-label="Retirer Frise 3"]').trigger('click'); await settle();
  expect(sectionFor('2').attributes('data-selected')).toBe('true');
  expect(sectionFor('1').getComponent(PeriodGrid).vm.getScaleFrame()).toEqual(frame);
  await view.get('[aria-label="Retirer Frise 2"]').trigger('click'); await settle();
  expect(sectionFor('1').attributes('data-selected')).toBe('true');
  expect(view.find('.home-view__frise--active').exists()).toBe(false);
});

it('keeps selection distinct from the frame source across a KeepAlive round trip', async () => {
  await open('/timeline?story=1&compare=2&compare=3', true);
  await sectionFor('3').get('.period-grid').trigger('click'); await settle();
  const location = router.currentRoute.value.fullPath;
  const frame = sectionFor('1').getComponent(PeriodGrid).vm.getScaleFrame();
  await router.push('/database'); await settle();
  await router.push(location); await settle();
  expect(sectionFor('3').attributes('data-selected')).toBe('true');
  expect(sectionFor('1').attributes('data-leading')).toBe('true');
  expect(sectionFor('1').getComponent(PeriodGrid).vm.getScaleFrame()).toEqual(frame);
});
