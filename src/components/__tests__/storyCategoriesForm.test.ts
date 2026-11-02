import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import StoryCategoriesForm from '@/views/DatabaseView/StoryCategoriesForm.vue';
import BaseSelect from '@/components/base/Select.vue';
import { CategoryService } from '@/services/CategoryService';
import type { Story } from '@/types/database';

const story: Story = {
  id: '1', title: { fr: 'Guerre froide', en: 'Cold War' }, description: { fr: 'Résumé', en: 'Summary' }, author: 'Auteur',
  isPublic: false, categories: [{ id: 'c1', label: { fr: 'Histoire', en: 'History' } }], periods: [], events: [],
};
let view: ReturnType<typeof mount>;
const button = (label: string) => view.findAll('button').find(item => item.text() === label || item.attributes('aria-label') === label);
const select = () => view.getComponent(BaseSelect);
const chips = () => view.findAll('.story-categories-form__tags .ui-tag').map(item => item.text());
const add = async (id: string) => { select().vm.$emit('update:modelValue', id); await flushPromises(); };
beforeEach(() => {
  vi.spyOn(CategoryService.getInstance(), 'getCategories').mockResolvedValue([{ id: 'c1', label: 'Histoire' }, { id: 'c2', label: 'Science' }]);
});
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); });

it('lists the categories without a form in read-only mode', async () => {
  view = mount(StoryCategoriesForm, { props: { story, editable: false } });
  await flushPromises();
  expect(view.find('form').exists()).toBe(false);
  expect(view.get('h3').text()).toBe('Catégories de la frise');
  expect(chips()).toEqual(['Histoire']);
  await view.setProps({ story: { ...story, categories: [] } });
  expect(view.text()).toContain('Aucune catégorie associée à cette frise.');
});

it('shows the categories outside a field that only searches the ones to add', async () => {
  view = mount(StoryCategoriesForm, { props: { story, editable: true } });
  await flushPromises();
  expect(chips()).toEqual(['Histoire']);
  expect(select().props('modelValue')).toBeNull();
  expect(select().props('multiple')).toBe(false);
  expect(select().props('options')).toEqual([{ value: 'c2', label: 'Science' }]);
  expect(button('Enregistrer')).toBeUndefined();
  await add('c2');
  expect(chips()).toEqual(['Histoire', 'Science']);
  expect(select().props('modelValue')).toBeNull();
  expect(select().props('options')).toEqual([]);
  await button('Annuler')!.trigger('click');
  expect(chips()).toEqual(['Histoire']);
  expect(button('Enregistrer')).toBeUndefined();
});

it('removes a category from its chip and saves the selection', async () => {
  view = mount(StoryCategoriesForm, { props: { story, editable: true } });
  await flushPromises();
  await button('Retirer Histoire')!.trigger('click');
  expect(view.text()).toContain('Aucune catégorie associée à cette frise.');
  await add('c2');
  await view.get('form').trigger('submit');
  expect(view.emitted('save')![0][0]).toMatchObject({ categories: [{ id: 'c2' }], title: { fr: 'Guerre froide', en: 'Cold War' }, author: 'Auteur', isPublic: false });
  await view.setProps({ story: { ...story, categories: [{ id: 'c2', label: { fr: 'Science', en: '' } }] } });
  expect(chips()).toEqual(['Science']);
  expect(button('Enregistrer')).toBeUndefined();
});

it('keeps the category draft while another tab changes the text, and sends the saved text', async () => {
  view = mount(StoryCategoriesForm, { props: { story, editable: true } });
  await flushPromises();
  await add('c2');
  await view.setProps({ story: { ...story, title: { fr: 'Renommée', en: 'Cold War' }, isPublic: true } });
  expect(chips()).toEqual(['Histoire', 'Science']);
  await view.get('form').trigger('submit');
  expect(view.emitted('save')![0][0]).toMatchObject({ categories: [{ id: 'c1' }, { id: 'c2' }], title: { fr: 'Renommée' }, isPublic: true });
});

it('keeps saved categories visible but blocks adding and saving until the catalogue loads', async () => {
  vi.mocked(CategoryService.getInstance().getCategories).mockRejectedValueOnce(new Error('offline'));
  view = mount(StoryCategoriesForm, { props: { story, editable: true } });
  await flushPromises();
  expect(view.get('[role="alert"]').text()).toContain('Impossible de charger les catégories');
  expect(chips()).toEqual(['Histoire']);
  expect(select().props('disabled')).toBe(true);
  await button('Retirer Histoire')!.trigger('click');
  expect(button('Enregistrer')!.attributes('disabled')).toBeDefined();
  await button('Réessayer')!.trigger('click'); await flushPromises();
  expect(button('Enregistrer')!.attributes('disabled')).toBeUndefined();
});
