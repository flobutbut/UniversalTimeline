import { afterEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import StoryPlacementFields from '@/views/DatabaseView/StoryPlacementFields.vue';
import BaseSelect from '@/components/base/Select.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { apiClient } from '@/services/ApiClient';
import { storyFixture } from '@/testFixtures/story';
import type { StoryPlacementDraft } from '@/types/editForm';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
let view: ReturnType<typeof mount>;
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); });
const parent = storyFixture('1', [{ id: 'modern', label_fr: 'Époque moderne', start_date: '1492', end_date: '1789' }, { id: 'wars', label_fr: 'Guerres d’Italie', start_date: '1494', end_date: '1559', story_parent_id: 'modern' }]);

function start() {
  let value: StoryPlacementDraft = { parentStoryId: null, anchorPeriodId: null, complete: true };
  view = mount(StoryPlacementFields, { props: { modelValue: value, candidates: [parent], 'onUpdate:modelValue': (next: StoryPlacementDraft) => { value = next; void view.setProps({ modelValue: next }); } }, attachTo: document.body });
  return () => value;
}
it('keeps creation without a parent optional and complete', () => {
  const value = start();
  expect(view.text()).toContain('Facultatif : rattachez cette frise');
  expect(value()).toEqual({ parentStoryId: null, anchorPeriodId: null, complete: true });
});
it('proposes the deepest anchor containing the subject dates, and keeps a manual choice', async () => {
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockResolvedValue(parent);
  const value = start();
  view.findAllComponents(BaseSelect)[0].vm.$emit('update:modelValue', '1'); await flushPromises();
  expect(value()).toMatchObject({ parentStoryId: '1', anchorPeriodId: null, complete: false });
  const [startInput, endInput] = view.findAll('input[type="text"]').filter(input => input.attributes('placeholder')?.startsWith('Ex.'));
  await startInput.setValue('1500'); await endInput.setValue('1520'); await flushPromises();
  expect(value()).toMatchObject({ anchorPeriodId: 'wars', complete: true });
  expect(view.text()).toContain('Proposée : « Guerres d’Italie »');
  view.findAllComponents(BaseSelect)[1].vm.$emit('update:modelValue', 'modern'); await flushPromises();
  await startInput.setValue('1510'); await flushPromises();
  expect(value()).toMatchObject({ anchorPeriodId: 'modern', complete: true });
});
it('sends the parent and anchor with the new frise', async () => {
  vi.mocked(apiClient.post).mockResolvedValue({ id: 9, title_fr: 'Nouvelle', parent_story_id: 1 });
  await StoryApiService.getInstance().createStory({ title: { fr: 'Nouvelle' }, isPublic: true, storyPlacement: { parentStoryId: '1', anchorPeriodId: 'wars' } });
  expect(apiClient.post).toHaveBeenCalledWith('/stories', expect.objectContaining({ isPublic: true, parentStoryId: '1', anchor: { anchorType: 'period', anchorId: 'wars' } }));
  expect(vi.mocked(apiClient.post).mock.calls[0][1]).not.toHaveProperty('storyPlacement');
});
