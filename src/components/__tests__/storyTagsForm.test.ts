import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import StoryTagsForm from '@/views/DatabaseView/StoryTagsForm.vue';
import { TagService } from '@/services/TagService';
import type { Story } from '@/types/database';

const ref = (id: string, label: string, family = 'societes', position = 1) => ({ id, label: { fr: label, en: label }, family, position, parentId: null });
const conflits = ref('conflits', 'Conflits');
const arts = ref('arts', 'Arts', 'productions', 2);
const sport = ref('sport', 'Sport', 'productions', 3);
const terre = ref('terre', 'Terre', 'monde-vivant', 4);
const story: Story = { id: '1', title: { fr: 'Guerre froide', en: 'Cold War' }, description: { fr: 'Résumé', en: 'Summary' }, author: 'Auteur', isPublic: false, categories: [], tags: [conflits], periods: [], events: [] };
let view: ReturnType<typeof mount>;
const button = (label: string) => view.findAll('button').find(item => item.text() === label || item.attributes('aria-label') === label);
const chosen = () => view.findAll('.tag-picker__selected .ui-tag').map(item => item.text());
beforeEach(() => { vi.spyOn(TagService.getInstance(), 'getTags').mockResolvedValue([conflits, arts, sport, terre]); });
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); });

it('lists the tags without a form in read-only mode', async () => {
  view = mount(StoryTagsForm, { props: { story, editable: false } });
  await flushPromises();
  expect(view.find('form').exists()).toBe(false);
  expect(view.get('h3').text()).toBe('Tags de la frise');
  expect(view.findAll('.story-tags-form__tags .ui-tag').map(item => item.text())).toEqual(['Conflits']);
  await view.setProps({ story: { ...story, tags: [] } });
  expect(view.text()).toContain('Aucun tag associé à cette frise.');
});

it('groups the grid by family and cancels back to the saved tags', async () => {
  view = mount(StoryTagsForm, { props: { story, editable: true } });
  await flushPromises();
  expect(view.findAll('.tag-picker__family').map(item => item.attributes('aria-label'))).toEqual(['Monde & vivant', 'Sociétés', 'Productions']);
  expect(button('Enregistrer')).toBeUndefined();
  await button('Arts')!.trigger('click');
  expect(chosen()).toEqual(['Conflits', 'Arts']);
  await button('Annuler')!.trigger('click');
  expect(chosen()).toEqual(['Conflits']);
});

it('sends the tags in rank order and lets another tag become primary', async () => {
  view = mount(StoryTagsForm, { props: { story, editable: true } });
  await flushPromises();
  await button('Arts')!.trigger('click');
  await button('Définir Arts comme tag principal')!.trigger('click');
  expect(chosen()).toEqual(['Arts', 'Conflits']);
  await view.get('form').trigger('submit');
  expect(view.emitted('save')![0][0]).toMatchObject({ tags: ['arts', 'conflits'], title: { fr: 'Guerre froide', en: 'Cold War' }, isPublic: false });
});

it('stops at three tags', async () => {
  view = mount(StoryTagsForm, { props: { story, editable: true } });
  await flushPromises();
  await button('Arts')!.trigger('click');
  await button('Sport')!.trigger('click');
  expect(button('Terre')!.attributes('disabled')).toBeDefined();
  await button('Retirer Sport')!.trigger('click');
  expect(button('Terre')!.attributes('disabled')).toBeUndefined();
});

it('keeps the tag draft while another tab changes the text, and sends the saved text', async () => {
  view = mount(StoryTagsForm, { props: { story, editable: true } });
  await flushPromises();
  await button('Arts')!.trigger('click');
  await view.setProps({ story: { ...story, title: { fr: 'Renommée', en: 'Cold War' }, isPublic: true } });
  expect(chosen()).toEqual(['Conflits', 'Arts']);
  await view.get('form').trigger('submit');
  expect(view.emitted('save')![0][0]).toMatchObject({ tags: ['conflits', 'arts'], title: { fr: 'Renommée' }, isPublic: true });
});

it('blocks saving until the grid loads', async () => {
  vi.mocked(TagService.getInstance().getTags).mockRejectedValueOnce(new Error('offline'));
  view = mount(StoryTagsForm, { props: { story, editable: true } });
  await flushPromises();
  expect(view.get('[role="alert"]').text()).toContain('Impossible de charger les tags');
  await button('Réessayer')!.trigger('click'); await flushPromises();
  expect(view.find('[role="alert"]').exists()).toBe(false);
  await button('Retirer Conflits')!.trigger('click');
  expect(button('Enregistrer')!.attributes('disabled')).toBeUndefined();
});
