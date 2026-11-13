import { afterEach, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import LanguageSelect from '@/components/LanguageSelect.vue';
import WikipediaLink from '@/components/WikipediaLink.vue';
import { initializeLanguage, language, localizedText, contentLanguage, setLanguage, uiFormat } from '@/i18n';
import { parseStoryWrite } from '../../../server/src/api/inputValidation';

afterEach(() => { vi.restoreAllMocks(); setLanguage('fr'); localStorage.clear(); });

it('switches an existing article link and remembers the reader’s preference', async () => {
  const link = mount(WikipediaLink, { props: { subject: 'Terre', titles: { fr: 'Terre', en: 'Earth' } } });
  const select = mount(LanguageSelect);
  const trigger = select.get('[role=combobox]');
  expect(trigger.attributes('aria-label')).toBe('Langue');
  await trigger.trigger('click');
  await select.get('[role=option]:last-child').trigger('click');
  await nextTick();
  expect(link.get('a').attributes('href')).toBe('https://en.wikipedia.org/wiki/Earth');
  expect(document.documentElement.lang).toBe('en');
  language.value = 'fr';
  initializeLanguage();
  expect(language.value).toBe('en');
  await link.setProps({ titles: { fr: 'Terre', en: null } });
  expect(link.get('a').text()).toContain('View on Wikipedia (FR)');
  expect(uiFormat`Fermer ${'Terre'}`).toBe('Close Terre');
  select.unmount(); link.unmount();
});

it('preserves an English-only frise and identifies the actual language of fallback content', () => {
  const story = parseStoryWrite({ title: { en: 'Earth' }, description: { en: 'A planet.' } });
  expect(story.title).toEqual({ fr: '', en: 'Earth' });
  expect(story.description).toEqual({ fr: null, en: 'A planet.' });
  expect(localizedText(story.description)).toBe('A planet.');
  expect(contentLanguage(story.description)).toBe('en');
});


it.each([
  [['de', 'en-GB', 'fr'], 'fr', 'en'],
  [['fr-CA', 'en-US'], 'en', 'fr'],
  [['es'], 'en', 'fr'],
  [[], 'en-US', 'en'],
] as const)('selects the supported browser language for %j', (languages, primary, expected) => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue([...languages]);
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(primary);
  initializeLanguage();
  expect(document.documentElement.lang).toBe(expected);
});
