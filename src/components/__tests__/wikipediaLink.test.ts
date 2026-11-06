import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import WikipediaLink from '@/components/WikipediaLink.vue';
import EventCard from '@/views/HomeView/EventCard.vue';

let view: VueWrapper | undefined;
afterEach(() => view?.unmount());

describe('lien Wikipédia', () => {
  it('ouvre l’article français dans un nouvel onglet avec un nom accessible complet', () => {
    view = mount(WikipediaLink, { props: { titles: { fr: 'Révolution française', en: 'French Revolution' }, subject: 'Révolution française' } });
    const link = view.get('a');
    expect(link.attributes()).toMatchObject({ href: 'https://fr.wikipedia.org/wiki/R%C3%A9volution_fran%C3%A7aise', target: '_blank', rel: 'noopener noreferrer', hreflang: 'fr' });
    expect(link.text()).toContain('Voir sur Wikipédia');
    expect(link.text()).toContain('(nouvel onglet)');
  });

  it('se replie sur l’article anglais en le signalant, et n’affiche rien sans article', () => {
    view = mount(WikipediaLink, { props: { titles: { fr: null, en: 'Earth' }, subject: 'Terre' } });
    expect(view.get('a').attributes('href')).toBe('https://en.wikipedia.org/wiki/Earth');
    expect(view.get('a').text()).toContain('(en)');
    view.unmount();
    view = mount(WikipediaLink, { props: { titles: { fr: null, en: null }, subject: 'Terre' } });
    expect(view.find('a').exists()).toBe(false);
  });

  it('s’affiche sous la description d’un événement sans figer ni libérer son infobulle', async () => {
    const event = { id: 'e', label: { fr: 'Prise de la Bastille', en: '' }, date: '1789-07-14', categories: [], description: { fr: 'Début de la Révolution', en: '' }, wikipedia: { fr: 'Prise de la Bastille', en: null } };
    view = mount(EventCard, { props: { event, isSelected: true, isCategoryActive: false, cardStyle: { width: '10px', left: '0' } } });
    const description = view.get('.event-description').element;
    const link = view.get('a.wikipedia-link');
    expect(description.compareDocumentPosition(link.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await link.trigger('click');
    expect(view.emitted('click')).toBeUndefined();
  });
});

describe('fiche période', () => {
  it('place le lien Wikipédia sous la description', async () => {
    const { default: StoryPeriodDetail } = await import('@/views/DatabaseView/StoryPeriodDetail.vue');
    const period = { id: 'p', label: { fr: 'Directoire', en: '' }, startDate: '1795-10-26', endDate: '1799-11-09', categories: [], description: { fr: 'Régime politique', en: '' }, wikipedia: { fr: 'Directoire', en: 'French Directory' } };
    view = mount(StoryPeriodDetail, { props: { period, inStory: true, children: [], stories: [], summaries: [] }, global: { stubs: { RouterLink: true } } });
    const description = view.get('.story-period-detail__description').element;
    const link = view.get('a.wikipedia-link');
    expect(link.attributes('href')).toBe('https://fr.wikipedia.org/wiki/Directoire');
    expect(description.compareDocumentPosition(link.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
