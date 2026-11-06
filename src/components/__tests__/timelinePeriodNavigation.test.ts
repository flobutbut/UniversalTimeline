import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import PeriodCard from '@/views/HomeView/PeriodCard.vue';
import { StoryApiService } from '@/services/StoryApiService';
import type { ListPeriod } from '@/types/database';
import {h} from 'vue';
import { timelineBounds } from '@/services/TimelineScalingService';

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

it('keeps the reference and temporal controls available on an empty narrative without a wrapper', async () => {
  view=mount(PeriodGrid,{props:{periods:[],events:[],loading:false,currentPeriod:null,parentPeriod:null,currentStoryId:'1',overviewNavigation:true,nextPeriod:period('next')},slots:{'overview-context':'<button class="return-marker">Retour à la source</button>'}});
  expect(view.get('.return-marker').text()).toBe('Retour à la source');
  expect(view.text()).toContain('Aucune période à afficher');
  await view.get('[data-period-direction="next"]').trigger('click');
  expect(view.emitted('navigate-period')).toEqual([['next']]);
});

it.each([
  ['M7','M1.2',0,100*1.6/2.8],
  ['M2','M1',100*0.8/2.8,100/2.8],
  ['M7','TODAY',0,100],
])('projects the source period into the unchanged narrative window (%s to %s)',async(start,end,left,width)=>{
  view=mount(PeriodGrid,{props:{periods:[{...period('homo'),startDate:'M2.8',endDate:'TODAY'}],events:[],loading:false,currentPeriod:null,parentPeriod:null,currentStoryId:'1',storyBounds:{startYearsBP:2800000,endYearsBP:0},overviewPeriod:{...period('origin'),startDate:start,endDate:end}},slots:{'overview-context':({style})=>h('div',{class:'source-reference',style},'Origin')}});
  const style=(view.get('.source-reference').element as HTMLElement).style;
  expect(parseFloat(style.marginLeft)).toBeCloseTo(left);expect(parseFloat(style.width)).toBeCloseTo(width);
  expect((view.get('[data-period-id="homo"]').element as HTMLElement).style.getPropertyValue('--period-width')).toBe('100%');
});
it.each([['M7','M3'],['2100','2200'],['','']])('does not render an origin with no visible temporal intersection (%s to %s)',(start,end)=>{
  view=mount(PeriodGrid,{props:{periods:[{...period('homo'),startDate:'M2.8',endDate:'TODAY'}],events:[],loading:false,currentPeriod:null,parentPeriod:null,currentStoryId:'1',storyBounds:{startYearsBP:2800000,endYearsBP:0},overviewPeriod:{...period('origin'),startDate:start,endDate:end}},slots:{'overview-context':()=>h('div',{class:'source-reference'},'Origin')}});
  expect(view.find('.source-reference').exists()).toBe(false);
});

it.each([
  ['M66', 'TODAY', true, false],
  ['M2', '2100', false, true],
  ['M66', '2100', true, true],
  ['M2.8', 'TODAY', false, false],
  ['M2', 'M1', false, false],
])('marks only the clipped ends of the source period (%s to %s)', (start, end, before, after) => {
  const origin = { ...period('origin'), startDate: start as string, endDate: end as string };
  view = mount(PeriodGrid, {
    props: { periods: [{ ...period('homo'), startDate: 'M2.8', endDate: 'TODAY' }], events: [], loading: false, currentPeriod: null, parentPeriod: null, currentStoryId: '1', overviewPeriod: origin },
    slots: { 'overview-context': ({ style, continuation }) => h(PeriodCard, { period: origin, variant: 'parent', isSelected: false, style, continuesBefore: continuation.before, continuesAfter: continuation.after }) },
  });
  const source = view.get('.period-card--parent');
  expect(source.classes().includes('period-card--continues-before')).toBe(before);
  expect(source.classes().includes('period-card--continues-after')).toBe(after);
  expect((view.get('[data-period-id="homo"]').element as HTMLElement).style.getPropertyValue('--period-width')).toBe('100%');
});

it('shows the Cenozoic continuing past both ends of the hominin window, updating when the frame reaches the present', async () => {
  const origin = { ...period('cenozoic'), startDate: 'M66', endDate: 'TODAY' };
  view = mount(PeriodGrid, {
    props: { periods: [{ ...period('hominins'), startDate: 'M7', endDate: 'M1.2' }], events: [], loading: false, currentPeriod: null, parentPeriod: null, currentStoryId: '1', overviewPeriod: origin },
    slots: { 'overview-context': ({ style, continuation }) => h(PeriodCard, { period: origin, variant: 'parent', isSelected: false, style, continuesBefore: continuation.before, continuesAfter: continuation.after }) },
  });
  const source = () => view.get('.period-card--parent');
  expect(source().classes()).toEqual(expect.arrayContaining(['period-card--continues-before', 'period-card--continues-after']));
  expect((source().element as HTMLElement).style.width).toBe('100%');
  await view.setProps({ periods: [{ ...period('hominins'), startDate: 'M7', endDate: 'TODAY' }] });
  expect(source().classes()).toContain('period-card--continues-before');
  expect(source().classes()).not.toContain('period-card--continues-after');
});

it('keeps the back control visible when the parent dates are unknown', async () => {
  render();
  await view.setProps({ currentPeriod: { ...period('root', true), endDate: 'unknown' } });
  const parent = view.get('.period-card--parent');
  expect((parent.element as HTMLElement).style.width).toBe('');
  await parent.trigger('click');
  expect(view.emitted('go-back')).toHaveLength(1);
});

it('uses the initial spinner only when there is no timeline context yet', async () => {
  render();
  await view.setProps({ periods: [], currentPeriod: null, loading: true });
  expect(view.find('.feedback-state--loading').exists()).toBe(true);
});

it.each(['card', 'title', 'Enter', ' '])('opens a leaf with %s activation', async action => {
  render();
  const leaf = view.get('.period-card--timeline');
  expect(leaf.find('button.period-card__title-action').exists()).toBe(true);
  if (action === 'card') await leaf.trigger('click');
  else if (action === 'title') await leaf.get('.period-card__title-action').trigger('click');
  else await leaf.trigger('keydown', { key: action });
  expect(view.emitted('period-click')).toEqual([[period('leaf')]]);
});

it('opens an undated leaf through its title', async () => {
  const undated = { ...period('undated'), startDate: '', endDate: '' };
  render([undated]);
  const title = view.get('.period-grid__undated button');
  expect(title.attributes('disabled')).toBeUndefined();
  await title.trigger('click');
  expect(view.emitted('period-click')).toEqual([[undated]]);
});

it('keeps a leaf closed while the timeline is loading', async () => {
  render();
  await view.setProps({ loading: true });
  await view.get('.period-card--timeline').trigger('click');
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
  await view.setProps({ currentPeriod: { ...period('root', true), endDate: '476' }, periods: [{ ...period('leaf'), endDate: '476' }] });
  expect(view.get('.period-grid__end-label').text()).toMatch(/^Fin : 476/);
  await view.setProps({ nextPeriod: period('newer') });
  expect(view.find('.period-grid__end-label').exists()).toBe(false);
});

it('shows the full longer child and scales the parent, events and end label to the same interval', async () => {
  // Legacy numeric coordinates were imported at a different reference date.
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 10, 3));
  const parent = { ...period('ww2', true), startDate: '1939-09-01', endDate: '1945-09-02', startYearsBP: 86.59521799778817, endYearsBP: 80.59111122160748 };
  const child = { ...period('sino-japanese'), startDate: '1937-07-07', endDate: '1945-09-09', startYearsBP: 88.75835484371436, endYearsBP: 80.58313239333789 };
  view = mount(PeriodGrid, { props: { periods: [child], events: [
    { id: 'start', label: { fr: 'Début de la période parente', en: '' }, date: parent.startDate, categories: [] },
  ], loading: false, currentPeriod: parent, parentPeriod: null, currentStoryId: '9' } });
  const childElement = view.get('.period-card--timeline').element as HTMLElement;
  expect(parseFloat(childElement.style.getPropertyValue('--period-left'))).toBeCloseTo(0, 6);
  expect(parseFloat(childElement.style.getPropertyValue('--period-width'))).toBeCloseTo(100, 6);
  const parentElement = view.get('.period-card--parent').element as HTMLElement;
  expect(parseFloat(parentElement.style.marginLeft)).toBeGreaterThan(20);
  expect(parseFloat(parentElement.style.width)).toBeLessThan(80);
  const event = view.get('.event-card').element as HTMLElement;
  expect(parseFloat(event.style.left)).toBeCloseTo(parseFloat(parentElement.style.marginLeft), 6);
  expect(view.get('.period-grid__end-label').text()).toBe('Fin : 9 septembre 1945');
  expect(view.get('.period-card--parent').text()).toContain('1 septembre 1939');
});

it.each([
  ['1804-03-21T12:00:00Z', '2000-01-01T00:00:00Z', false, false],
  ['1804-03-21T11:59:59Z', '2000-01-01T00:00:00Z', true, false],
  ['1804-03-21T12:00:00Z', '2000-01-01T00:00:01Z', false, true],
])('compares calendar clipping at one instant, retaining a real one-second overhang (%s to %s)', (startDate, endDate, before, after) => {
  const loadedAt = Date.UTC(2026, 10, 6, 12);
  const bounds = timelineBounds([
    { startDate: '1804-03-21T12:00:00Z', endDate: '2000-01-01T00:00:00Z' },
  ], loadedAt)!;
  vi.spyOn(Date, 'now').mockReturnValue(loadedAt + 60000);
  const origin = { ...period('origin'), startDate, endDate };
  view = mount(PeriodGrid, {
    props: { periods: [{ ...period('empire'), startDate: '1804-05-18', endDate: '1815-06-22' }], events: [],
      loading: false, currentPeriod: null, parentPeriod: null, currentStoryId: '2', storyBounds: bounds, overviewPeriod: origin },
    slots: { 'overview-context': ({ style, continuation }) => h(PeriodCard, {
      period: origin, variant: 'parent', isSelected: false, style, continuesBefore: continuation.before, continuesAfter: continuation.after,
    }) },
  });
  const reference = view.get('.period-card--parent');
  expect(reference.classes().includes('period-card--continues-before')).toBe(before);
  expect(reference.classes().includes('period-card--continues-after')).toBe(after);
});
