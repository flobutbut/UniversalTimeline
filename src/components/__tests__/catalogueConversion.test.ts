import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import StoryDetailPanel from '@/views/DatabaseView/StoryDetailPanel.vue';
import StoryItemActionsMenu from '@/views/DatabaseView/StoryItemActionsMenu.vue';
import EditModal from '@/views/DatabaseView/EditModal.vue';
import Tabs from '@/components/base/Tabs.vue';
import FinderItem from '@/views/GraphView/FinderItem.vue';
import { EventApiService } from '@/services/EventApiService';
import { PeriodApiService } from '@/services/PeriodApiService';
import { SearchApiService } from '@/services/SearchApiService';
import { WikidataQueryService } from '@/services/WikidataQueryService';
import type { EditFormSubmission } from '@/types/editForm';
import type { Period, Story } from '@/types/database';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
const category = { id: 'politique', label: { fr: 'Politique', en: '' } };
const period = (id: string, parentId: string | null = null): Period => ({ id, parentId, storyParentId: parentId, hasParent: !!parentId, hasChildren: false, label: { fr: id, en: '' }, description: { fr: `À propos de ${id}`, en: '' }, wikidata_id: `Q${id.length}`, startDate: '1789-07-14', endDate: '1789-07-15', categories: [category], children: [], temporalLocation: '' });
const story: Story = {
  id: '1', title: { fr: 'Révolution', en: '' }, author: '', isPublic: false, categories: [],
  periods: [period('root'), period('bastille', 'root')],
  events: [{ id: 'terror', label: { fr: 'Terreur', en: '' }, date: '1793-09-05', wikidata_id: 'Q20', categories: [category] }],
};
const submission = (patch: Partial<EditFormSubmission>): EditFormSubmission => ({
  qid: 'Q20', title: { fr: 'Terreur', en: '' }, description: { fr: null, en: null }, startDate: '', endDate: '', date: '',
  location: null, author: '', isPublic: false, parentId: null, categories: [{ id: 'politique' }], ...patch,
});
let view: ReturnType<typeof mount>;
const button = (name: string) => view.findAll('button').find(item => item.text() === name);
async function start(tab: 'periods' | 'events', initialStory = story) {
  view = mount(StoryDetailPanel, { props: { story: initialStory }, attachTo: document.body, global: { stubs: {
    StoryTimeline: true, StoryRelatedPickerModal: true, EditModal: { name: 'EditModal', props: ['type', 'mode', 'data', 'convertFrom', 'loading', 'error'], template: '<div class="edit-modal-stub" />' },
  } } });
  await flushPromises();
  view.getComponent(Tabs).vm.$emit('update:modelValue', tab); await flushPromises();
}
beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(WikidataQueryService.getInstance(), 'loadPeriodChildrenByWikidataId').mockResolvedValue([]);
  vi.spyOn(SearchApiService.getInstance(), 'searchLocal').mockResolvedValue([]);
});
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); });

it('offers the conversion in the item menu only when a target type is given', async () => {
  view = mount(StoryItemActionsMenu, { props: { label: 'Terreur', convertTo: 'period' }, attachTo: document.body });
  await view.get('button').trigger('click'); await flushPromises();
  const item = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(entry => entry.textContent?.includes('Convertir en période'))!;
  item.click(); await flushPromises();
  expect(view.emitted('convert')).toHaveLength(1);
  view.unmount(); document.body.innerHTML = '';
  view = mount(StoryItemActionsMenu, { props: { label: 'Racine' }, attachTo: document.body });
  await view.get('button').trigger('click'); await flushPromises();
  expect(document.body.textContent).not.toContain('Convertir');
});

it('converts the event shown in its fiche into a period prefilled from the event, then reloads the frise', async () => {
  const convert = vi.spyOn(EventApiService.getInstance(), 'convertToPeriod').mockResolvedValue({ ...period('p-new'), label: { fr: 'Terreur', en: '' } });
  await start('events');
  view.findAllComponents(FinderItem).find(row => row.props('itemId') === 'terror')!.vm.$emit('click'); await flushPromises();
  await button('Convertir en période')!.trigger('click'); await flushPromises();
  const modal = view.getComponent({ name: 'EditModal' });
  expect(modal.props()).toMatchObject({ type: 'period', mode: 'create', convertFrom: 'event' });
  expect(modal.props('data')).toMatchObject({ qid: 'Q20', label: { fr: 'Terreur' }, startDate: '1793-09-05', endDate: '', categories: [{ id: 'politique' }] });
  modal.vm.$emit('submit', submission({ startDate: '1793-09-05', endDate: '1794-07-28' })); await flushPromises();
  expect(convert).toHaveBeenCalledWith('terror', expect.objectContaining({ qid: 'Q20', startDate: '1793-09-05', endDate: '1794-07-28' }));
  expect(view.emitted('entity-converted')).toHaveLength(1);
  expect(view.findComponent({ name: 'EditModal' }).exists()).toBe(false);
});

it('keeps the form open with the server refusal and never resends it on its own', async () => {
  const convert = vi.spyOn(PeriodApiService.getInstance(), 'convertToEvent')
    .mockRejectedValue({ response: { data: { error: 'Conversion impossible : cette période est utilisée par 1 frise(s) d’autres comptes.' } } });
  await start('periods');
  const row = view.findAllComponents(FinderItem).find(item => item.props('itemId') === 'root')!;
  expect(row.findComponent(StoryItemActionsMenu).props('convertTo')).toBeUndefined();
  await row.vm.$emit('click'); await flushPromises();
  const leaf = view.findAllComponents(FinderItem).find(item => item.props('itemId') === 'bastille')!;
  expect(leaf.findComponent(StoryItemActionsMenu).props('convertTo')).toBe('event');
  leaf.findComponent(StoryItemActionsMenu).vm.$emit('convert'); await flushPromises();
  const modal = view.getComponent({ name: 'EditModal' });
  expect(modal.props()).toMatchObject({ type: 'event', convertFrom: 'period' });
  expect(modal.props('data')).toMatchObject({ qid: 'Q8', date: '1789-07-14', description: { fr: 'À propos de bastille' } });
  modal.vm.$emit('submit', submission({ qid: 'Q8', title: { fr: 'bastille', en: '' }, date: '1789-07-14' })); await flushPromises();
  expect(convert).toHaveBeenCalledOnce();
  expect(view.getComponent({ name: 'EditModal' }).props('error')).toContain('d’autres comptes');
  expect(view.emitted('entity-converted')).toBeUndefined();
});

it('carries a derived fact identity into the conversion form without requiring a fictitious Q-id', async () => {
  const sourceKey = 'fact:Q5593:P69:q5593$11111111-1111-4111-8111-111111111111';
  const derived = { ...story.events[0], wikidata_id: null, sourceKey };
  const convert = vi.spyOn(EventApiService.getInstance(), 'convertToPeriod').mockResolvedValue({ ...period('p-new'), wikidata_id: null, sourceKey });
  await start('events', { ...story, events: [derived] });
  view.findAllComponents(FinderItem).find(row => row.props('itemId') === 'terror')!.vm.$emit('click'); await flushPromises();
  await button('Convertir en période')!.trigger('click'); await flushPromises();
  const modal = view.getComponent({ name: 'EditModal' });
  expect(modal.props('data')).toMatchObject({ qid: '', sourceKey });
  modal.vm.$emit('submit', submission({ qid: '', sourceKey, startDate: '1793', endDate: '1794' })); await flushPromises();
  expect(convert).toHaveBeenCalledWith('terror', expect.objectContaining({ qid: '', sourceKey }));
  expect(view.emitted('entity-converted')).toHaveLength(1);
});

it('titles the shared form as a conversion and hides the catalogue search', async () => {
  view = mount(EditModal, { props: { isOpen: true, type: 'event', mode: 'create', convertFrom: 'period', data: { label: { fr: 'Bastille' }, date: '1789-07-14' } }, attachTo: document.body });
  await flushPromises();
  expect(document.body.textContent).toContain('Convertir en événement');
  expect(document.body.textContent).toContain('remplacée par cet événement dans toutes les frises');
  expect(document.querySelector('.edit-modal__wikidata-header')).toBeNull();
  expect([...document.querySelectorAll('button')].some(item => item.textContent?.trim() === 'Convertir')).toBe(true);
});
