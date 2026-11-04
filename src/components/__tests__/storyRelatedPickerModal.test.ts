import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StoryRelatedPickerModal from '@/views/DatabaseView/StoryRelatedPickerModal.vue';
import Select from '@/components/base/Select.vue';
import { useDataStore } from '@/stores/useDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { storyFixture } from '@/testFixtures/story';

let view: ReturnType<typeof mount>;
beforeEach(() => {
  setActivePinia(createPinia());
  const auth = useAuthStore(); auth.enabled = true; auth.account = { id: 'owner' };
  useDataStore().stories = ['1', '2', '3', '4'].map(id => ({ ...storyFixture(id), ownerUserId: id === '4' ? 'other' : 'owner' }));
});
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); });
const submit = () => view.findAll('button').find(button => button.text() === 'Associer')!;

it('uses the design system multi-select, keeps selections across searches, and submits their IDs', async () => {
  view = mount(StoryRelatedPickerModal, { props: { excludeStoryIds: ['1'] }, attachTo: document.body });
  const select = view.getComponent(Select);
  expect(select.props('options').map(option => option.value)).toEqual(['2', '3']);
  expect(submit().attributes('disabled')).toBeDefined();
  await select.get('[role="combobox"]').trigger('click');
  await select.get('input').setValue('Frise 2');
  await select.get('[role="option"]').trigger('click');
  await select.get('input').setValue('Frise 3');
  await select.get('[role="option"]').trigger('click');
  expect(view.get('[role="status"]').text()).toBe('2 frises sélectionnées');
  expect(select.findAll('.ui-tag')).toHaveLength(2);
  await submit().trigger('click');
  expect(view.emitted('confirm')).toEqual([[['2', '3'], undefined]]);
});

it('requires a valid period when choosing an anchor and filters newly excluded destinations', async () => {
  const period = storyFixture('1', [{ id: 'anchor', label_fr: 'Période' }]).periods[0];
  view = mount(StoryRelatedPickerModal, { props: { excludeStoryIds: ['1'], periods: [period] } });
  const [anchor, frises] = view.findAllComponents(Select);
  frises.vm.$emit('update:modelValue', ['2', '3', '4']); await flushPromises();
  expect(submit().attributes('disabled')).toBeDefined();
  anchor.vm.$emit('update:modelValue', 'anchor'); await flushPromises();
  await view.setProps({ excludeStoryIds: ['1', '3'] });
  await submit().trigger('click');
  expect(view.emitted('confirm')).toEqual([[['2'], 'anchor']]);
});

it('shows a retryable loading error instead of an empty picker', async () => {
  const store = useDataStore(); store.stories = [];
  const load = vi.spyOn(store, 'ensureStoriesLoaded').mockRejectedValueOnce(new Error('Unavailable')).mockImplementationOnce(async () => {
    store.stories = [{ ...storyFixture('2'), ownerUserId: 'owner' }];
  });
  view = mount(StoryRelatedPickerModal, { props: { excludeStoryIds: ['1'] } }); await flushPromises();
  expect(view.get('[role="alert"]').text()).toContain('Impossible de charger les frises.');
  await view.get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(load).toHaveBeenCalledTimes(2);
  expect(view.getComponent(Select).props('options').map(option => option.value)).toEqual(['2']);
});
