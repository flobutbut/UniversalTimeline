import { afterEach, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import StoryDangerZone from '@/views/DatabaseView/StoryDangerZone.vue';
import type { Story } from '@/types/database';

const story: Story = {
  id: '1', title: { fr: 'Guerre froide', en: 'Cold War' }, description: { fr: 'Résumé', en: 'Summary' }, author: 'Auteur',
  isPublic: true, categories: [], periods: [], events: [],
};
let view: ReturnType<typeof mount>;
const button = (label: string) => view.findAll('button').find(item => item.text() === label);
afterEach(() => view?.unmount());

it('changes the visibility and deletes the frise from the saved state', async () => {
  view = mount(StoryDangerZone, { props: { story } });
  expect(view.text()).toContain('Visibilité : publique');
  await button('Rendre privée')!.trigger('click');
  expect(view.emitted('toggle-visibility')).toHaveLength(1);
  await button('Supprimer la frise')!.trigger('click');
  expect(view.emitted('delete')).toHaveLength(1);
  await view.setProps({ story: { ...story, isPublic: false, parentStoryId: '7' } });
  expect(view.text()).toContain('Visibilité : privée');
  expect(button('Rendre publique')?.attributes('disabled')).toBeUndefined();
});

it('allows publishing a private frise without a parent', async () => {
  view = mount(StoryDangerZone, { props: { story: { ...story, isPublic: false, parentStoryId: null } } });
  expect(button('Rendre publique')?.attributes('disabled')).toBeUndefined();
  await button('Rendre publique')!.trigger('click');
  expect(view.emitted('toggle-visibility')).toHaveLength(1);
});

it('blocks both actions while a write is in progress', () => {
  view = mount(StoryDangerZone, { props: { story, busy: true } });
  expect(view.findAll('button').map(item => item.attributes('disabled'))).toEqual(['', '']);
});
