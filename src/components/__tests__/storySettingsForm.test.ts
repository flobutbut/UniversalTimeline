import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import StorySettingsForm from '@/views/DatabaseView/StorySettingsForm.vue';
import { TagService } from '@/services/TagService';
import type { Story } from '@/types/database';

const story: Story = {
  id: '1', title: { fr: 'Guerre froide', en: 'Cold War' }, description: { fr: 'Résumé', en: 'Summary' }, author: 'Auteur',
  isPublic: true, categories: [], tags: [{ id: 'c1', label: { fr: 'Histoire', en: 'History' }, family: 'societes', position: 1, parentId: null }], periods: [], events: [],
};
let view: ReturnType<typeof mount>;
const button = (label: string) => view.findAll('button').find(item => item.text() === label);
const titleFr = () => view.get('input[placeholder="Titre en français"]');
beforeEach(() => {
  vi.spyOn(TagService.getInstance(), 'getTags').mockResolvedValue([{ id: 'c1', label: { fr: 'Histoire', en: 'History' }, family: 'societes', position: 1, parentId: null }]);
});
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); });

it('shows the frise settings as text without a form in read-only mode', async () => {
  view = mount(StorySettingsForm, { props: { story, editable: false } });
  await flushPromises();
  expect(view.find('form').exists()).toBe(false);
  expect(view.get('dl').text()).toContain('Guerre froide');
  expect(view.get('dl').text()).not.toContain('Cold War');
  expect(view.get('dl').text()).not.toContain('Auteur');
  expect(view.get('dl').text()).toContain('Publique');
  expect(view.get('dl').text()).not.toContain('Histoire');
  expect(button('Enregistrer')).toBeUndefined();
  expect(button('Supprimer la frise')).toBeUndefined();
  expect(view.text()).not.toContain('Actions sensibles');
});

it('reveals save and cancel only while the draft differs from the frise', async () => {
  view = mount(StorySettingsForm, { props: { story, editable: true } });
  await flushPromises();
  expect((titleFr().element as HTMLInputElement).value).toBe('Guerre froide');
  expect(view.find('input[placeholder="Title in English"]').exists()).toBe(false);
  expect(view.text()).not.toContain('Catégories');
  expect(view.find('input[placeholder="Nom de l\'auteur"]').exists()).toBe(false);
  expect(button('Enregistrer')).toBeUndefined();
  expect(button('Annuler')).toBeUndefined();
  await titleFr().setValue('Guerre froide (1947-1991)');
  expect(button('Enregistrer')?.exists()).toBe(true);
  await button('Annuler')!.trigger('click');
  expect((titleFr().element as HTMLInputElement).value).toBe('Guerre froide');
  expect(button('Enregistrer')).toBeUndefined();
});

it('emits the submission and settles on the saved frise', async () => {
  view = mount(StorySettingsForm, { props: { story, editable: true } });
  await flushPromises();
  await titleFr().setValue('Nouvelle frise');
  await view.get('form').trigger('submit');
  const submission = view.emitted('save')![0][0] as { title: { fr: string }; author: string; tags: string[] };
  expect(submission.title.fr).toBe('Nouvelle frise');
  expect(submission.author).toBe('Auteur');
  expect(submission.title).toEqual({ fr: 'Nouvelle frise', en: 'Cold War' });
  expect(submission).toMatchObject({ isPublic: true });
  expect(submission.tags).toEqual(['c1']);
  await view.setProps({ story: { ...story, title: { fr: 'Nouvelle frise', en: 'Cold War' } } });
  expect(button('Enregistrer')).toBeUndefined();
});

it('keeps a failed draft and blocks an invalid one', async () => {
  view = mount(StorySettingsForm, { props: { story, editable: true } });
  await flushPromises();
  await titleFr().setValue('Brouillon');
  await view.get('form').trigger('submit');
  await view.setProps({ error: 'Erreur lors de la sauvegarde des données' });
  expect(view.get('[role="alert"]').text()).toContain('Erreur lors de la sauvegarde');
  expect((titleFr().element as HTMLInputElement).value).toBe('Brouillon');
  await titleFr().setValue('');
  expect(button('Enregistrer')!.attributes('disabled')).toBeDefined();
});

it('keeps visibility and destructive actions out of the draft', async () => {
  view = mount(StorySettingsForm, { props: { story, editable: true } });
  await flushPromises();
  expect(view.get('form').text()).not.toContain('Mode public');
  expect(view.text()).not.toContain('Actions sensibles');
  expect(button('Supprimer la frise')).toBeUndefined();
  await titleFr().setValue('Brouillon');
  await view.setProps({ story: { ...story, isPublic: false } });
  expect((titleFr().element as HTMLInputElement).value).toBe('Brouillon');
  await view.get('form').trigger('submit');
  expect(view.emitted('save')![0][0]).toMatchObject({ isPublic: false, title: { fr: 'Brouillon' } });
});

it('sends the saved tags and visibility with its text draft, never a stale copy', async () => {
  view = mount(StorySettingsForm, { props: { story, editable: true } });
  await flushPromises();
  await titleFr().setValue('Brouillon');
  await view.setProps({ story: { ...story, tags: [{ id: 'c2', label: { fr: 'Science', en: '' }, family: 'societes', position: 1, parentId: null }] } });
  expect((titleFr().element as HTMLInputElement).value).toBe('Brouillon');
  await view.get('form').trigger('submit');
  expect(view.emitted('save')![0][0]).toMatchObject({ title: { fr: 'Brouillon' }, tags: ['c2'], isPublic: true });
});

it('saves its text even when the tag catalogue cannot load', async () => {
  vi.mocked(TagService.getInstance().getTags).mockRejectedValue(new Error('offline'));
  view = mount(StorySettingsForm, { props: { story, editable: true } });
  await flushPromises();
  await titleFr().setValue('Brouillon');
  expect(button('Enregistrer')!.attributes('disabled')).toBeUndefined();
});
