import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StoryDetailPanel from '@/views/DatabaseView/StoryDetailPanel.vue';
import Tabs from '@/components/base/Tabs.vue';
import Switch from '@/components/base/Switch.vue';
import { storyFixture } from '@/testFixtures/story';
import { useAuthStore } from '@/stores/useAuthStore';
import { WikidataQueryService } from '@/services/WikidataQueryService';

const fixture = () => storyFixture('one', [
  { id: 'root', label_fr: 'Racine', story_parent_id: null },
  { id: 'child', label_fr: 'Enfant', story_parent_id: 'root' },
  { id: 'leaf', label_fr: 'Feuille', story_parent_id: 'child' },
  { id: 'other', label_fr: 'Autre racine', story_parent_id: null },
]);
let view: ReturnType<typeof mount>;
const row = (id: string) => view.get(`[data-story-period-id="${id}"]`);
const column = (index: number) => view.findAll('.story-period-columns .finder-column')[index];
const moves = () => view.emitted('add-periods');
async function start(story = fixture()) {
  view = mount(StoryDetailPanel, { props: { story }, attachTo: document.body,
    global: { stubs: { StoryTimeline: true, StoryRelatedPickerModal: true, RouterLink: true } } });
  view.getComponent(Tabs).vm.$emit('update:modelValue', 'periods'); await flushPromises();
}
async function select(id: string) { await row(id).get('.finder-item-content').trigger('click'); await flushPromises(); }
async function drag(id: string) {
  const transfer = { effectAllowed: 'none', dropEffect: 'none', setData: vi.fn() };
  await row(id).trigger('dragstart', { dataTransfer: transfer });
  return transfer;
}
beforeEach(() => { setActivePinia(createPinia()); });
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); });

it('moves a branch to the root once, waits for confirmation, and rebuilds the selected path after refresh', async () => {
  const original = fixture();
  await start(); await select('root'); await select('child'); await select('leaf');
  const transfer = await drag('child');
  expect(transfer.effectAllowed).toBe('move'); expect(transfer.setData).toHaveBeenCalledWith('text/plain', 'child');
  await column(0).trigger('dragover', { dataTransfer: transfer });
  expect(column(0).classes()).toContain('story-period-column--drop-target');
  expect(transfer.dropEffect).toBe('move');
  await column(0).trigger('drop'); await column(0).trigger('drop');
  expect(moves()).toEqual([[['child'], null]]);
  expect(row('child').element.closest('.finder-column')).toBe(column(1).element);
  expect(view.props('story')!.periods).toEqual(original.periods);
  const updated = fixture(); updated.periods.find(p => p.id === 'child')!.storyParentId = null;
  await view.setProps({ story: updated }); await flushPromises();
  expect(row('child').element.closest('.finder-column')).toBe(column(0).element);
  expect(row('leaf').element.closest('.finder-column')).toBe(column(1).element);
  expect(original.periods.find(p => p.id === 'child')!.storyParentId).toBe('root');
});

it('accepts an empty destination column beneath its selected parent', async () => {
  await start(); await select('other');
  expect(column(1).text()).toContain('Aucune sous-période');
  await drag('root'); await column(1).trigger('drop');
  expect(moves()).toEqual([[['root'], 'other']]);
});

it('uses the destination column parent even when dropped directly onto another row', async () => {
  await start(); await select('root'); await drag('other'); await row('child').trigger('drop');
  expect(moves()).toEqual([[['other'], 'root']]);
});

it('rejects self, descendant and unchanged-parent destinations, including nested drag targets', async () => {
  await start(); await select('root'); await select('child');
  const transfer = await drag('root');
  for (const index of [0, 1, 2]) {
    await column(index).trigger('dragover', { dataTransfer: transfer });
    expect(transfer.dropEffect).toBe('none');
    expect(column(index).classes()).not.toContain('story-period-column--drop-target');
  }
  await row('leaf').trigger('drop'); expect(moves()).toBeUndefined();
  await drag('child'); await column(1).trigger('drop'); expect(moves()).toBeUndefined();
});

it('keeps the target highlighted when entering its children and cancels on dragend or Escape', async () => {
  await start(); await select('root'); await drag('other'); await column(1).trigger('dragover');
  await column(1).trigger('dragleave', { relatedTarget: row('child').element });
  expect(column(1).classes()).toContain('story-period-column--drop-target');
  await row('other').trigger('dragend');
  expect(view.find('.story-period-column--drop-target').exists()).toBe(false);
  expect(view.find('.story-period-row--dragging').exists()).toBe(false);
  await column(1).trigger('drop'); expect(moves()).toBeUndefined();
  await drag('other'); await column(1).trigger('keydown', { key: 'Escape' });
  await column(1).trigger('drop'); expect(moves()).toBeUndefined();
});

it('retains the original placement after a refused write and lets the user retry', async () => {
  await start(); await select('root'); await drag('child'); await column(0).trigger('drop');
  await view.setProps({ updating: true });
  expect(row('child').attributes('draggable')).toBe('false');
  await view.setProps({ updating: false, error: 'Déplacement refusé' });
  expect(view.get('[role="alert"]').text()).toContain('Déplacement refusé');
  expect(row('child').element.closest('.finder-column')).toBe(column(1).element);
  await drag('child'); await column(0).trigger('drop');
  expect(moves()).toEqual([[['child'], null], [['child'], null]]);
});

it.each(['story', 'busy', 'tab', 'permission'] as const)('cancels a drag when %s changes before the drop', async change => {
  await start(); await select('root'); await drag('child');
  if (change === 'story') await view.setProps({ story: { ...fixture(), id: 'two' } });
  if (change === 'busy') await view.setProps({ updating: true });
  if (change === 'tab') {
    view.getComponent(Tabs).vm.$emit('update:modelValue', 'events'); await flushPromises();
    view.getComponent(Tabs).vm.$emit('update:modelValue', 'periods'); await flushPromises();
  }
  if (change === 'permission') { const auth = useAuthStore(); auth.enabled = true; auth.account = null; await flushPromises(); }
  await column(0).trigger('drop');
  expect(moves()).toBeUndefined(); expect(view.find('.story-period-row--dragging').exists()).toBe(false);
});

it('never imports Wikidata suggestions by dragging or accepts them as parents', async () => {
  vi.spyOn(WikidataQueryService.getInstance(), 'loadPeriodChildrenByWikidataId').mockResolvedValue([
    { id: 'Q200', label: { fr: 'Suggestion', en: '' }, description: { fr: '', en: '' },
      temporalData: [{ startDate: '1000', endDate: '1100', location: 'Globale' }], hasChildren: false, children: [] },
  ]);
  const data = fixture(); data.periods[0].wikidata_id = 'Q100';
  await start(); await view.setProps({ story: data }); await select('root');
  view.getComponent(Switch).vm.$emit('update:modelValue', true); await flushPromises();
  expect(row('wikidata:Q200').attributes('draggable')).toBe('false');
  await drag('wikidata:Q200'); await column(0).trigger('drop'); expect(moves()).toBeUndefined();
  await select('wikidata:Q200'); await drag('other'); await column(2).trigger('drop');
  expect(moves()).toBeUndefined();
});

const childRow = (id: string, index: number) => column(index).get(`[data-child-story-id="${id}"]`);
it('moves just the dragged occurrence of an associated frise, preserving its other displayed locations', async () => {
  const data = fixture();
  data.childStories = [{ id: 'linked', title: { fr: 'Frise liée', en: '' }, atRoot: true,
    anchors: [{ type: 'period', id: 'root' }, { type: 'period', id: 'child' }] }];
  await start(data); await select('root'); await select('child');
  expect(childRow('linked', 0).exists()).toBe(true);
  expect(childRow('linked', 1).attributes('draggable')).toBe('true');
  await childRow('linked', 1).get('.anchored-story-row__link').trigger('dragstart');
  await column(0).trigger('drop');
  expect(view.emitted('move-child-story')).toEqual([['linked', { type: 'period', id: 'root' }, null]]);
  expect(moves()).toBeUndefined();
  const updated = fixture(); updated.childStories = [{ ...data.childStories[0], anchors: [{ type: 'period', id: 'child' }] }];
  await view.setProps({ story: updated });
  expect(column(1).find('[data-child-story-id="linked"]').exists()).toBe(false);
  expect(childRow('linked', 0).exists()).toBe(true); expect(childRow('linked', 2).exists()).toBe(true);
});

it('does not project event-only or missing-period links into the root column', async () => {
  const data = fixture();
  data.childStories = [
    { id: 'event-link', title: { fr: 'Événement', en: '' }, atRoot: false, anchors: [{ type: 'event', id: 'event' }] },
    { id: 'missing-link', title: { fr: 'Période absente', en: '' }, anchors: [{ type: 'period', id: 'missing' }] },
  ];
  await start(data); await select('root');
  expect(column(0).find('[data-child-story-id]').exists()).toBe(false);
  expect(view.emitted('move-child-story')).toBeUndefined();
});

it('moves an explicit root while retaining its independent event access', async () => {
  const data = fixture();
  data.childStories = [{ id: 'linked', title: { fr: 'Frise liée', en: '' }, atRoot: true, anchors: [{ type: 'event', id: 'event' }] }];
  await start(data); await select('root');
  await childRow('linked', 0).trigger('dragstart'); await column(1).trigger('drop');
  expect(view.emitted('move-child-story')).toEqual([['linked', null, { type: 'period', id: 'root' }]]);
});

it('disables associated-frise dragging while busy or read-only, and cancels stale drags', async () => {
  const data = fixture(); data.childStories = [{ id: 'linked', title: { fr: 'Frise liée', en: '' }, atRoot: true, anchors: [] }];
  await start(data); await select('root'); await childRow('linked', 0).trigger('dragstart');
  await view.setProps({ updating: true });
  expect(childRow('linked', 0).attributes('draggable')).toBe('false');
  await column(1).trigger('drop'); expect(view.emitted('move-child-story')).toBeUndefined();
  await view.setProps({ updating: false });
  const auth = useAuthStore(); auth.enabled = true; auth.account = null; await flushPromises();
  expect(childRow('linked', 0).attributes('draggable')).toBe('false');
});
