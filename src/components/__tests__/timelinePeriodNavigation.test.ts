import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import { StoryApiService } from '@/services/StoryApiService';
import type { ListPeriod } from '@/types/database';

const period = (id: string, hasChildren = false): ListPeriod => ({
  id, label: { fr: id, en: '' }, startDate: 'M65', endDate: 'NOW', hasChildren, categories: [],
});
let view: VueWrapper;
beforeEach(() => {
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockResolvedValue({ childStories: [] } as never);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('period-card--parent')
      ? new DOMRect(0, 40, 800, 52) : new DOMRect(100, 100, 200, 52);
  });
});
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); });
function render(periods = [period('leaf')]) {
  view = mount(PeriodGrid, { props: {
    periods, events: [], loading: false, currentPeriod: period('root', true),
    parentPeriod: null, currentStoryId: '1',
  } });
  return view;
}

it('keeps the same parent and period cards mounted while a navigable period loads', async () => {
  render([period('branch', true)]); const parent = view.get('.period-card--parent').element as HTMLElement;
  const leaf = view.get('.period-card--timeline').element;
  await view.get('.period-card--timeline').trigger('click');
  await view.setProps({ loading: true });
  expect(view.get('.period-grid').attributes('aria-busy')).toBe('true');
  expect(view.get('.period-card--parent').element).toBe(parent);
  expect(view.get('.period-card--timeline').element).toBe(leaf);
  expect(view.find('.feedback-state--loading').exists()).toBe(false);
  await view.setProps({ loading: false });
  expect(parent.style.transform).toBe('');
  expect(view.emitted('period-click')?.[0]).toEqual([period('branch', true)]);
});

it('keeps the back control available when the current period has no remaining items', async () => {
  render([]);
  await view.get('.period-card--parent').trigger('click');
  expect(view.emitted('go-back')).toHaveLength(1);
});

it('uses the initial spinner only when there is no timeline context yet', async () => {
  render();
  await view.setProps({ periods: [], currentPeriod: null, loading: true });
  expect(view.find('.feedback-state--loading').exists()).toBe(true);
});

it('does not descend into a leaf on mouse or keyboard activation', async () => {
  render();
  const leaf = view.get('.period-card--timeline');
  await leaf.trigger('click');
  await leaf.get('.period-card__title-action').trigger('click');
  await leaf.get('.period-card__title-action').trigger('keydown', { key:'Enter' });
  expect(leaf.find('button.period-card__title-action').exists()).toBe(false);
  expect(view.emitted('period-click')).toBeUndefined();
});

it('passes the clicked period when opening an associated frise', async () => {
  render();
  const { default: Badge } = await import('@/views/HomeView/AssociatedStoriesBadge.vue');
  view.findAllComponents(Badge)[1].vm.$emit('select', '11');
  expect(view.emitted('story-select')).toEqual([['11', { type:'period', id:'leaf' }]]);
});

it('places ghost navigation above the parent and emits a separate same-level action', async () => {
  render();
  await view.setProps({ previousPeriod: period('older'), nextPeriod: period('newer') });
  const navigation = view.get('nav[aria-label="Périodes de même niveau"]');
  const buttons = navigation.findAll('button');
  expect(buttons.map(button => button.text())).toEqual(['Période précédente - older', 'Période suivante - newer']);
  expect(buttons.every(button => button.classes().includes('base-button--ghost'))).toBe(true);
  expect(navigation.element.nextElementSibling).toBe(view.get('.period-grid__surface').element);
  expect(buttons[0].attributes('title')).toContain('older');
  await buttons[0].trigger('click');
  await buttons[1].trigger('click');
  expect(view.emitted('navigate-period')).toEqual([['previous'], ['next']]);
  expect(view.emitted('period-click')).toBeUndefined();
  expect(view.emitted('go-back')).toBeUndefined();
});

it('hides unavailable directions, all directions while loading, and the overview navigation', async () => {
  render();
  await view.setProps({ currentPeriod: { ...period('root', true), endDate: undefined } });
  expect(view.find('nav').exists()).toBe(false);
  await view.setProps({ nextPeriod: period('newer') });
  expect(view.get('nav').findAll('button').map(button => button.text())).toEqual(['Période suivante - newer']);
  await view.setProps({ loading: true });
  expect(view.find('nav').exists()).toBe(false);
  await view.setProps({ currentPeriod: null, loading: false });
  expect(view.find('nav').exists()).toBe(false);
});

it('shows the end of the view instead of a missing next period', async () => {
  render();
  expect(view.get('nav').findAll('button')).toHaveLength(0);
  expect(view.get('.period-grid__end-label').text()).toBe("Aujourd'hui");
  await view.setProps({ currentPeriod: { ...period('root', true), endDate: '476' } });
  expect(view.get('.period-grid__end-label').text()).toMatch(/^Fin : 476/);
  await view.setProps({ nextPeriod: period('newer') });
  expect(view.find('.period-grid__end-label').exists()).toBe(false);
});
