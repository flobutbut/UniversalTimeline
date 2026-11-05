import { afterEach, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import StoryArchitecturePanel from '@/views/DatabaseView/StoryArchitecturePanel.vue';
import StoryItemActionsMenu from '@/views/DatabaseView/StoryItemActionsMenu.vue';
import { storyFixture } from '@/testFixtures/story';

let view: ReturnType<typeof mount>;
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; });
const subs = Array.from({ length: 11 }, (_, i) => ({ id: `s${i}`, label_fr: `Phase ${i}`, start_date: String(1100 + i), end_date: String(1101 + i), story_parent_id: 'big' }));
const story = () => ({ ...storyFixture('3', [
  { id: 'big', label_fr: 'Grande période', start_date: '1100', end_date: '1200' }, ...subs,
  { id: 'other', label_fr: 'Autre', start_date: '1200', end_date: '1300' },
]), parentStoryId: '1' });

it('shows the deduced role, the non-blocking warnings and a promotion for the owner', async () => {
  view = mount(StoryArchitecturePanel, { props: { story: story(), stories: [], editable: true, canPromote: true } });
  expect(view.get('.story-architecture__badge').text()).toBe('Récit');
  expect(view.text()).not.toContain('Brouillon');
  expect(view.get('summary').text()).toContain('2 points d’architecture à revoir');
  expect(view.text()).toContain('« Grande période » regroupe 11 sous-périodes');
  expect(view.text()).toContain('« Grande période » remplit les critères d’une sous-frise : 11 sous-périodes.');
  await view.get('button').trigger('click');
  expect(view.emitted('promote')).toEqual([['big']]);
});
it('hides the review from readers and the promotion from non-owners, and marks a draft', async () => {
  view = mount(StoryArchitecturePanel, { props: { story: { ...story(), parentStoryId: null, isPublic: false }, stories: [], editable: false } });
  expect(view.text()).toContain('Privé');
  expect(view.find('details').exists()).toBe(false);
  await view.setProps({ editable: true, canPromote: false });
  expect(view.find('details').exists()).toBe(true);
  expect(view.find('.story-architecture__promotion button').exists()).toBe(false);
});
it('explains the missing parent on a private draft and displays actual public visibility', async () => {
  view = mount(StoryArchitecturePanel, { props: { story: { ...story(), parentStoryId: null, isPublic: false }, stories: [] }, attachTo: document.body });
  await view.get('.story-architecture__visibility button').trigger('click'); await flushPromises();
  expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Vous pouvez rendre cette frise publique dans les Propriétés, même sans frise parente.');
  await view.setProps({ story: { ...story(), isPublic: true } });
  expect(view.text()).toContain('Public'); expect(view.text()).not.toContain('Privé');
  expect(document.querySelector('[role="tooltip"]')).toBeNull();
  await view.setProps({ story: { ...story(), isPublic: false } });
  expect(view.text()).toContain('Privé');
  expect(view.find('.story-architecture__visibility').exists()).toBe(false);
});
it('labels the menu action as a promotion when the period meets the criteria', async () => {
  view = mount(StoryItemActionsMenu, { props: { label: 'Grande période', createStory: true, promote: true }, attachTo: document.body });
  await view.get('button').trigger('click'); await flushPromises();
  const items = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].map(item => item.textContent?.trim());
  expect(items).toEqual(['Modifier', 'Promouvoir en sous-frise', 'Supprimer']);
});
