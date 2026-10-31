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
    parentPeriod: null, storySuggestions: [], currentStoryId: '1',
  } });
  return view;
}

it('keeps the same parent and period cards mounted while a leaf loads suggestions', async () => {
  render(); const parent = view.get('.period-card--parent').element as HTMLElement;
  const leaf = view.get('.period-card--timeline').element;
  await view.get('.period-card--timeline').trigger('click');
  await view.setProps({ loading: true });
  expect(view.get('.period-grid').attributes('aria-busy')).toBe('true');
  expect(view.get('.period-card--parent').element).toBe(parent);
  expect(view.get('.period-card--timeline').element).toBe(leaf);
  expect(view.find('.loading-container').exists()).toBe(false);
  await view.setProps({ loading: false });
  expect(parent.style.transform).toBe('');
  expect(view.emitted('period-click')?.[0]).toEqual([period('leaf')]);
});

it('keeps the back control available when the current period has no remaining items', async () => {
  render([]);
  await view.get('.period-card--parent').trigger('click');
  expect(view.emitted('go-back')).toHaveLength(1);
});

it('uses the initial spinner only when there is no timeline context yet', async () => {
  render();
  await view.setProps({ periods: [], currentPeriod: null, loading: true });
  expect(view.find('.loading-container').exists()).toBe(true);
});
