import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import StoryTimeline from '@/components/StoryTimeline.vue';

const period = (id: string, parentId: string | null, startDate = 'M60', endDate = 'M54') => ({ id, parentId, label: { fr: id, en: '' }, startDate, endDate });
const periods = [period('root', null, 'M65', 'NOW'), ...Array.from({ length: 15 }, (_, i) => period(`child-${i}`, 'root')), period('unknown', 'root', 'unknown', 'NOW')];
const visible = (view: ReturnType<typeof mount>) => view.findAll('[data-period-id]').map(row => row.attributes('data-period-id'));

it('renders every dated period in full and compact previews', () => {
  for (const compact of [false, true]) {
    const view = mount(StoryTimeline, { props: { periods, compact } });
    expect(visible(view)).toHaveLength(16); view.unmount();
  }
});
