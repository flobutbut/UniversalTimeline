import { describe, it, expect, vi, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import PeriodCard from '@/views/HomeView/PeriodCard.vue';
const period = { id: 'period', label: { fr: 'Cambrien', en: 'Cambrian' }, startDate: 'M65', endDate: 'M54', categories: [], hasChildren: true };
describe('active PeriodCard', () => {
  it('renders the label and selects a navigable period', async () => {
    const wrapper = mount(PeriodCard, { props: { period, isSelected: false } });
    expect(wrapper.text()).toContain('Cambrien');
    await wrapper.trigger('click');
    expect(wrapper.emitted('select')?.[0]).toEqual([period]);
  });
  it('keeps a leaf inert so its associations are selected explicitly', async () => {
    const wrapper = mount(PeriodCard, { props: { period: { ...period, hasChildren: false }, isSelected: false } });
    await wrapper.trigger('click'); expect(wrapper.emitted('select')).toBeUndefined();
  });
  it('uses a parent card to go back rather than drilling down', async () => {
    const wrapper = mount(PeriodCard, { props: { period, isSelected: false, variant: 'parent' } });
    await wrapper.trigger('click'); expect(wrapper.emitted('back')).toHaveLength(1);
    expect(wrapper.emitted('select')).toBeUndefined();
  });
  it('offers a drill-down arrow only on timeline cards whose period has children in the story', async () => {
    const drill = (props: object) => mount(PeriodCard, { props: { period, isSelected: false, ...props } }).find('.period-card__drill');
    expect(drill({ period: { ...period, hasChildren: false } }).exists()).toBe(false);
    expect(drill({ variant: 'parent' }).exists()).toBe(false);
    const wrapper = mount(PeriodCard, { props: { period, isSelected: false } });
    const arrow = wrapper.get('.period-card__drill');
    expect(arrow.attributes('aria-label')).toBe('Explorer les sous-périodes de Cambrien');
    await arrow.trigger('click');
    expect(wrapper.emitted('select')).toEqual([[period]]);
  });
});

describe('PeriodCard actions', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it('hides the badge when the title and date need its room, without flickering back', async () => {
    let cardWidth = 300; let resize = () => {};
    // jsdom ne mesure pas les Range : la largeur du texte retombe sur scrollWidth.
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect() {} });
    const actionsHidden = (el: HTMLElement) => !!el.closest('.period-card')?.querySelector('.period-card__actions--hidden');
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('period-card__actions') ? 100 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('period-card__title-action') ? 150 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('card-content') ? cardWidth - (actionsHidden(this) ? 0 : 100) : 0;
    });
    const wrapper = mount(PeriodCard, { props: { period, isSelected: false }, slots: { 'title-actions': '<button class="badge">1 frise associée</button>' }, attachTo: document.body });
    const hidden = () => wrapper.get('.period-card__actions').classes().includes('period-card__actions--hidden');
    expect(hidden()).toBe(false);
    cardWidth = 200; resize(); await nextTick();
    expect(hidden()).toBe(true);
    resize(); await nextTick();
    expect(hidden()).toBe(true);
    await wrapper.setProps({ wrapContent: true }); await nextTick();
    expect(hidden()).toBe(false);
    await wrapper.setProps({ wrapContent: false }); await nextTick();
    expect(hidden()).toBe(true);
    cardWidth = 260; resize(); await nextTick();
    expect(hidden()).toBe(false);
    wrapper.unmount();
  });
});
