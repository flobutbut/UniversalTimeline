import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import StoryTimeline from '@/components/StoryTimeline.vue';
import { layoutCompactLanes } from '@/lib/compactStoryTimeline';

const period = (id: string, parentId: string | null, startDate = 'M60', endDate = 'M54') => ({ id, parentId, label: { fr: id, en: '' }, startDate, endDate });
const periods = [period('root', null, 'M65', 'NOW'), ...Array.from({ length: 15 }, (_, i) => period(`child-${i}`, 'root')), period('unknown', 'root', 'unknown', 'NOW')];
const visible = (view: ReturnType<typeof mount>) => view.findAll('[data-period-id]').map(row => row.attributes('data-period-id'));
const top = (view: ReturnType<typeof mount>, id: string) => (view.get(`[data-period-id="${id}"]`).element as HTMLElement).style.getPropertyValue('--story-period-top');

it('renders every dated period in the full timeline', () => {
  const view = mount(StoryTimeline, { props: { periods } });
  expect(visible(view)).toHaveLength(16); view.unmount();
});
it('keeps only roots and their direct children on at most four lines in the compact preview', () => {
  const view = mount(StoryTimeline, { props: { compact: true, periods: [
    period('root', null, 'M65', 'NOW'),
    period('a', 'root', 'M65', 'M40'), period('b', 'root', 'M40', 'M10'), period('c', 'root', 'M50', 'M20'),
    period('d', 'root', 'M45', 'M15'), period('e', 'root', 'M44', 'M14'), period('grandchild', 'a', 'M64', 'M63'),
  ] } });
  // a and b share a line (b starts where a ends); c and d each need their own; e finds no room.
  expect(visible(view).sort()).toEqual(['a', 'b', 'c', 'd', 'root']);
  expect(['root', 'a', 'b', 'c', 'd'].map(id => top(view, id))).toEqual(['0px', '12px', '12px', '22px', '32px']);
  view.unmount();
});
it('stacks overlapping roots before any child line with a constant gap', () => {
  const bar = (left: number, width: number, isRoot: boolean) => ({ left, width, isRoot });
  const { placed, height } = layoutCompactLanes([bar(0, 50, false), bar(0, 60, true), bar(40, 60, true), bar(60, 40, false)]);
  expect(placed.map(item => [item.isRoot, item.lane, item.top])).toEqual([[true, 0, 0], [true, 1, 12], [false, 2, 24], [false, 2, 24]]);
  expect(height).toBe(32);
});
