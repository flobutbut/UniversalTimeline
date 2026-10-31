import { describe, it, expect } from 'vitest';
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
  it('emits leaf selection so the story navigation can offer anchored stories', async () => {
    const wrapper = mount(PeriodCard, { props: { period: { ...period, hasChildren: false }, isSelected: false } });
    await wrapper.trigger('click'); expect(wrapper.emitted('select')?.[0]).toEqual([{ ...period, hasChildren: false }]);
  });
  it('uses a parent card to go back rather than drilling down', async () => {
    const wrapper = mount(PeriodCard, { props: { period, isSelected: false, variant: 'parent' } });
    await wrapper.trigger('click'); expect(wrapper.emitted('back')).toHaveLength(1);
    expect(wrapper.emitted('select')).toBeUndefined();
  });
});
