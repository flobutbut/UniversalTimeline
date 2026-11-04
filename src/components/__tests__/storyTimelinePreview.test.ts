import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import StoryTimeline from '@/components/StoryTimeline.vue';
import { layoutCompactLanes } from '@/lib/compactStoryTimeline';

const period = (id: string, parentId: string | null, startDate = 'M60', endDate = 'M54') => ({ id, parentId, label: { fr: id, en: '' }, startDate, endDate });
const periods = [period('root', null, 'M65', 'NOW'), ...Array.from({ length: 15 }, (_, i) => period(`child-${i}`, 'root')), period('unknown', 'root', 'unknown', 'NOW')];
const visible = (view: ReturnType<typeof mount>) => view.findAll('[data-period-id]').map(row => row.attributes('data-period-id'));
const top = (view: ReturnType<typeof mount>, id: string) => (view.get(`[data-period-id="${id}"]`).element as HTMLElement).style.getPropertyValue('--story-period-top');

it('clips a cosmic preview to a recent date window without stretching offscreen periods or events',()=>{
  const view=mount(StoryTimeline,{props:{compact:true,proportional:true,referenceTime:Date.UTC(2026,10,4),timeBounds:{start:30,end:0},periods:[
    period('universe',null,'G13.8','NOW'),period('ancient','universe','G10','G4'),period('recent','universe','2000','NOW'),
  ],events:[{id:'old',label:'Ancien',date:'M5'},{id:'new',label:'Récent',date:'2020'}]}});
  expect(visible(view)).toEqual(['universe','recent']);
  expect((view.get('[data-period-id="universe"]').element as HTMLElement).style.getPropertyValue('--story-period-width')).toBe('100%');
  expect(view.find('[data-event-id="old"]').exists()).toBe(false);
  expect(view.find('[data-event-id="new"]').exists()).toBe(true);
  view.unmount();
});

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

it('folds nested groups independently without selecting the parent or moving the time axis', async () => {
  const view = mount(StoryTimeline, { props: { collapsible: true, periods: [
    period('root', null, 'M65', 'NOW'), period('a', 'root'), period('grandchild', 'a'),
    period('b', 'root'), period('other', null, 'M80', 'M70'),
  ], events: [{ id: 'event', label: 'Un événement', date: 'M100' }] } });
  const bar = (id: string) => view.get(`[data-period-id="${id}"]`);
  const rootLeft = (bar('root').element as HTMLElement).style.getPropertyValue('--story-period-left');
  const markerLeft = (view.get('.story-timeline__event-marker').element as HTMLElement).style.left;
  expect(bar('root').get('.story-timeline__period-bar').element.tagName).toBe('BUTTON');
  expect(bar('root').get('.story-timeline__period-toggle').attributes('aria-expanded')).toBe('true');
  await bar('a').get('.story-timeline__period-toggle').trigger('click');
  expect(visible(view)).toEqual(['other', 'root', 'a', 'b']);
  await bar('root').get('.story-timeline__period-toggle').trigger('click');
  expect(visible(view)).toEqual(['other', 'root']);
  expect(bar('root').get('.story-timeline__period-toggle').attributes('aria-expanded')).toBe('false');
  expect((bar('root').element as HTMLElement).style.getPropertyValue('--story-period-left')).toBe(rootLeft);
  expect((view.get('.story-timeline__event-marker').element as HTMLElement).style.left).toBe(markerLeft);
  await bar('root').get('.story-timeline__period-toggle').trigger('click');
  expect(bar('a').get('.story-timeline__period-toggle').attributes('aria-expanded')).toBe('false');
  expect(view.find('[data-period-id="grandchild"]').exists()).toBe(false);
  await bar('a').get('.story-timeline__period-toggle').trigger('click');
  expect(visible(view)).toContain('grandchild');
  expect(view.emitted('select-period')).toBeUndefined();
  await bar('b').get('.story-timeline__period-bar').trigger('click');
  expect(view.emitted('select-period')).toEqual([['b']]);
  await view.get('.story-timeline__event-marker').trigger('click');
  expect(view.emitted('select-event')).toEqual([['event']]);
  view.unmount();
});

it('selects a parent from its bar and only folds its children from the separate sibling control', async () => {
  const view = mount(StoryTimeline, { props: { collapsible: true, periods: [period('root', null, 'M65', 'NOW'), period('child', 'root')] } });
  const root = view.get('[data-period-id="root"]');
  const selection = root.get('.story-timeline__period-bar');
  const toggle = root.get('.story-timeline__period-toggle');
  expect(selection.element.contains(toggle.element)).toBe(false);
  expect(toggle.attributes('aria-label')).toBe('Replier les sous-périodes de root');
  await selection.trigger('click');
  expect(view.emitted('select-period')).toEqual([['root']]);
  await view.setProps({ selectedPeriodId: 'root' });
  expect(selection.attributes('aria-pressed')).toBe('true');
  expect(visible(view)).toContain('child');
  await toggle.trigger('click');
  expect(visible(view)).toEqual(['root']);
  expect(toggle.attributes('aria-label')).toBe('Déplier les sous-périodes de root');
  expect(selection.attributes('aria-pressed')).toBe('true');
  expect(view.emitted('select-period')).toEqual([['root']]);
  expect(view.emitted('deselect')).toBeUndefined();
  await toggle.trigger('click');
  expect(visible(view)).toContain('child');
  expect(view.emitted('select-period')).toEqual([['root']]);
  view.unmount();
});

it('shows every expanded depth in an interactive compact preview, including overlapping children', async () => {
  const view = mount(StoryTimeline, { props: { compact: true, collapsible: true, periods: [
    ...periods, period('grandchild', 'child-0'),
  ] } });
  expect(visible(view)).toHaveLength(17);
  await view.get('[data-period-id="root"] .story-timeline__period-toggle').trigger('click');
  expect(visible(view)).toEqual(['root']);
  await view.get('[data-period-id="root"] .story-timeline__period-toggle').trigger('click');
  expect(visible(view)).toHaveLength(17);
  view.unmount();
});

it('uses the local hierarchy when a child is moved out of a folded group and clears removed groups', async () => {
  const root = period('root', null, 'M65', 'NOW'), child = period('child', 'root');
  const view = mount(StoryTimeline, { props: { collapsible: true, periods: [root, child] } });
  await view.get('[data-period-id="root"] .story-timeline__period-toggle').trigger('click');
  await view.setProps({ periods: [root, { ...child, storyParentId: null }] });
  expect(visible(view)).toContain('child');
  await view.setProps({ periods: [root, child] });
  expect(view.get('[data-period-id="root"] .story-timeline__period-toggle').attributes('aria-expanded')).toBe('true');
  expect(visible(view)).toContain('child');
  view.unmount();
});

it('folds undated descendants without assigning invented coordinates and tolerates legacy cycles', async () => {
  const view = mount(StoryTimeline, { props: { collapsible: true, periods: [
    period('root', null, 'M65', 'NOW'), period('unknown', 'root', 'unknown', 'NOW'),
  ] } });
  expect(view.get('.story-timeline__undated').text()).toContain('unknown');
  await view.get('[data-period-id="root"] .story-timeline__period-toggle').trigger('click');
  expect(view.find('.story-timeline__undated').exists()).toBe(false);
  await view.get('[data-period-id="root"] .story-timeline__period-toggle').trigger('click');
  expect(view.get('.story-timeline__undated').text()).toContain('unknown');
  await view.setProps({ periods: [period('a', 'b'), period('b', 'a')] });
  expect(visible(view)).toHaveLength(2);
  view.unmount();
});

it('places bars from their dates, not from stale stored coordinates computed at another time', () => {
  // Stored a year apart, the second phase would seem to start before the first ends and drop a line.
  const stale = { ...period('second', 'root', '1850', '1900'), startYearsBP: 177.9, endYearsBP: 126.9 };
  const view = mount(StoryTimeline, { props: { compact: true, periods: [
    period('root', null, '1800', '1900'), { ...period('first', 'root', '1800', '1850'), startYearsBP: 226.8, endYearsBP: 176.8 }, stale,
  ] } });
  expect(top(view, 'first')).toBe(top(view, 'second'));
  view.unmount();
});
