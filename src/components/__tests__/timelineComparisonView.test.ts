import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import { EventApiService } from '@/services/EventApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { storyFixture } from '@/testFixtures/story';

// La timeline réelle, avec une seconde frise portée par le paramètre `compare`.
const dto = (id: string, parentId: string | null, start: string, end: string) =>
  ({ id, parent_id: parentId, label_fr: id, start_date: start, end_date: end, has_children: !!parentId === false });
const stories: Record<string, ReturnType<typeof storyFixture>> = {
  '1': storyFixture('1', [dto('bourbons', null, '1589', '1789'), dto('louis', 'bourbons', '1643', '1715')],
    [{ id: 'declaration', label_fr: 'Déclaration', date: '1776-07-04' }] as never),
  '2': storyFixture('2', [dto('colonial', null, '1607', '1765'), dto('revolution', null, '1765', '1783')],
    [{ id: 'declaration', label_fr: 'Déclaration', date: '1776-07-04' }] as never),
};
let view: VueWrapper;
let router: Router;
beforeEach(() => {
  const api = StoryApiService.getInstance();
  vi.spyOn(api, 'getListStories').mockResolvedValue([stories['1'], stories['2']]);
  vi.spyOn(api, 'getStory').mockImplementation(async id => stories[id]);
  vi.spyOn(EventApiService.getInstance(), 'getStoryListEvents').mockResolvedValue([]);
});
afterEach(() => { view?.unmount(); router?.options.history.destroy(); vi.restoreAllMocks(); });
async function open(path: string) {
  router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/timeline', name: 'timeline', component: HomeView },
    { path: '/database', name: 'database', component: { template: '<div />' } },
  ] });
  await router.push(path); await router.isReady();
  view = mount(HomeView, { attachTo: document.body, global: { plugins: [createPinia(), router] } });
  await flushPromises(); await flushPromises();
}
const sections = () => view.findAll('section.home-view__frise');

it('keeps the single timeline unchanged until a frise is added', async () => {
  await open('/timeline?story=1');
  expect(sections()).toHaveLength(1);
  expect(view.find('.period-grid--compact').exists()).toBe(false);
  expect(view.text()).toContain('Ajouter une frise');
});

it('opens the compared frise from the URL, in compact mode, and removes it from the URL', async () => {
  await open('/timeline?story=1&compare=2');
  expect(sections()).toHaveLength(2);
  expect(sections()[1].attributes('aria-label')).toBe('Seconde frise : Frise 2');
  expect(view.findAll('.period-grid--compact')).toHaveLength(2);
  expect(view.text()).not.toContain('Ajouter une frise');
  // Chaque frise garde ses propres événements, même partagés.
  expect(sections()[1].find('[data-event-id="declaration"]').exists()).toBe(true);
  await view.get('[aria-label="Retirer la seconde frise"]').trigger('click'); await flushPromises();
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
