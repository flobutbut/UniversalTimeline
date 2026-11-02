import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils';
import StoryRelationsPanel from '@/views/DatabaseView/StoryRelationsPanel.vue';
import ParentStoryPickerModal from '@/views/DatabaseView/ParentStoryPickerModal.vue';
import BaseSelect from '@/components/base/Select.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { useDataStore } from '@/stores/useDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { storyFixture } from '@/testFixtures/story';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
const source = (id: string) => ({ ...storyFixture(id, [{ id: 'p1', label_fr: 'Première période' }, { id: 'p2', label_fr: 'Seconde période' }]), ownerUserId: 'me' });
const parent = (id: string) => ({ id, title: { fr: `Frise ${id}`, en: '' }, ownerUserId: 'me', anchors: [{ type: 'period' as const, id: 'p1', label: { fr: 'Première période', en: '' } }] });
let view: ReturnType<typeof mount>;
const button = (label: string) => new DOMWrapper(document.body).findAll('button').find(item => item.text() === label)!;
beforeEach(() => { setActivePinia(createPinia()); vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([source('1'), source('2'), source('3')]); });
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); });

it('groups multiple sources and emits removal for one entry point', async () => {
  view = mount(StoryRelationsPanel, { props: { story: { ...source('3'), parentStories: [parent('1'), parent('2')] } } });
  expect(view.findAll('.story-relations__source')).toHaveLength(2);
  await view.get('button[aria-label="Retirer le point d’entrée Première période depuis Frise 1"]').trigger('click');
  expect(view.emitted('remove-parent')).toEqual([['1', { type: 'period', id: 'p1' }]]);
  expect(view.text()).not.toContain('Frises enfants');
});

it('offers another location in an existing source, keeps a failed draft, then closes only after confirmed refresh', async () => {
  const story = { ...source('3'), parentStories: [parent('1')] };
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockResolvedValue(source('1'));
  view = mount(StoryRelationsPanel, { props: { story }, attachTo: document.body });
  await button('Ajouter un point d’entrée').trigger('click'); await flushPromises();
  const picker = view.getComponent(ParentStoryPickerModal);
  expect(picker.props('candidates').map((s: { id: string }) => s.id)).toEqual(['1', '2']);
  picker.findAllComponents(BaseSelect)[0].vm.$emit('update:modelValue', '1'); await flushPromises();
  const period = picker.findAllComponents(BaseSelect)[1];
  expect(period.props('options')).toEqual([{ value: 'p2', label: 'Seconde période' }]);
  period.vm.$emit('update:modelValue', 'p2'); await flushPromises();
  await button('Ajouter').trigger('click');
  expect(view.emitted('add-parent')).toEqual([['1', 'p2']]);
  await view.setProps({ error: 'Écriture refusée' });
  expect(view.getComponent(ParentStoryPickerModal).text()).toContain('Écriture refusée');
  await view.setProps({ error: null, story: { ...story, parentStories: [{ ...parent('1'), anchors: [...parent('1').anchors, { type: 'period', id: 'p2', label: { fr: 'Seconde période', en: '' } }] }] } });
  expect(view.findComponent(ParentStoryPickerModal).exists()).toBe(false);
});

it('ignores an older source load after another source was selected', async () => {
  let resolve!: (value: ReturnType<typeof source>) => void;
  const pending = new Promise<ReturnType<typeof source>>(yes => { resolve = yes; });
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockImplementation(id => id === '1' ? pending : Promise.resolve({ ...source('2'), periods: [] }));
  view = mount(ParentStoryPickerModal, { props: { candidates: [source('1'), source('2')] }, attachTo: document.body });
  const select = view.findAllComponents(BaseSelect)[0];
  select.vm.$emit('update:modelValue', '1'); await flushPromises();
  select.vm.$emit('update:modelValue', '2'); await flushPromises();
  resolve(source('1')); await flushPromises();
  expect(view.findAllComponents(BaseSelect)[1].props('options')).toEqual([]);
  expect(button('Ajouter').attributes('disabled')).toBeDefined();
});

it('hides editing controls on a readable frise owned by another account', async () => {
  const auth = useAuthStore(); auth.enabled = true; auth.account = { id: 'other', isAdmin: false };
  useDataStore().updateStories([source('1')]);
  view = mount(StoryRelationsPanel, { props: { story: { ...source('3'), parentStories: [parent('1')] } } });
  expect(view.findAll('button')).toHaveLength(0);
  expect(view.get('a').attributes('href')).toBe('/database?story=1');
});
