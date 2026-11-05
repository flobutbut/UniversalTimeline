import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, disposePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import WikidataGenerationView from '@/views/WikidataGenerationView.vue';
import * as generation from '@/services/WikidataGenerationService';
import { SearchApiService } from '@/services/SearchApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { useAuthStore } from '@/stores/useAuthStore';
import type { WikidataTimelineDraft } from '@/types/wikidataGeneration';
import { defaultSettings } from '@/lib/wikidataGenerationModel';

const fixture = (): WikidataTimelineDraft => ({ qid: 'Q1', title: 'Révolution', description: 'Un sujet', warnings: ['Sélection à vérifier'], items: [
  { qid: 'Q2', type: 'event', title: 'Prise de la Bastille', description: 'Événement', startDate: '1789-07-14', endDate: '', selected: true },
  { qid: 'Q3', type: 'period', title: 'Période sans fin', description: '', startDate: '1789', endDate: '', selected: false },
] });
const searches = SearchApiService.getInstance(); const stories = StoryApiService.getInstance();
let pinia: Pinia; let router: Router; let view: ReturnType<typeof mount>;
beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(generation, 'generateWikidataTimeline').mockImplementation(async () => fixture());
  vi.spyOn(searches, 'searchWikidataEntityLabels').mockResolvedValue([]);
  vi.spyOn(searches, 'searchLocalByWikidataIds').mockResolvedValue([]);
  vi.spyOn(stories, 'createFromWikidata').mockResolvedValue({ id: '42', periodCount: 0, eventCount: 1 });
  vi.spyOn(stories, 'findWikidataStories').mockResolvedValue([]);
});
afterEach(() => { view?.unmount(); router?.options.history.destroy(); disposePinia(pinia); vi.restoreAllMocks(); vi.useRealTimers(); sessionStorage.clear(); document.body.innerHTML = ''; });
async function start(path = '/generate?wikidata=Q1', signedIn = true) {
  pinia = createPinia(); const auth = useAuthStore(pinia); auth.enabled = true; auth.ready = true;
  if (signedIn) auth.account = { id: 'alice', isAdmin: false };
  vi.spyOn(auth, 'ensureProfile').mockResolvedValue();
  router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/generate', name: 'wikidata-generation', component: WikidataGenerationView },
    ...['timeline', 'database', 'login', 'profile'].map(name => ({ path: `/${name}`, name, component: { template: '<div />' } })),
  ] });
  await router.push(path); await router.isReady();
  view = mount({ template: '<RouterView />' }, { attachTo: document.body, global: { plugins: [pinia, router] } }); await flushPromises();
}
const button = (text: string) => view.findAll('button').find(element => element.text().includes(text))!;

it('warns globally about an existing frise and requires a deliberate choice before creating another one', async () => {
  vi.mocked(stories.findWikidataStories).mockResolvedValue([{ id: '30', title: 'Révolution française', reason: 'subject' }]);
  await start();
  const notice = view.get('.generation-existing-stories');
  expect(notice.text()).toContain('Une frise correspondante existe déjà');
  expect(notice.get('a').attributes('href')).toBe('/database?story=30');
  expect(button('Enregistrer la frise').attributes('disabled')).toBeDefined();
  expect(stories.createFromWikidata).not.toHaveBeenCalled();
  await notice.get('input[type="checkbox"]').setValue(true);
  await button('Enregistrer la frise').trigger('click'); await flushPromises();
  expect(stories.createFromWikidata).toHaveBeenCalledWith('Q1', 'Révolution', expect.any(Array), false, 'Un sujet', ['30']);
});

it('keeps saving disabled when the global duplicate check fails and retries only that read', async () => {
  vi.mocked(stories.findWikidataStories).mockRejectedValueOnce(new Error('indisponible'));
  await start();
  expect(view.get('.generation-existing-stories [role="alert"]').text()).toContain('Impossible de vérifier');
  expect(button('Enregistrer la frise').attributes('disabled')).toBeDefined();
  await button('Réessayer').trigger('click'); await flushPromises();
  expect(button('Enregistrer la frise').attributes('disabled')).toBeUndefined();
  expect(stories.createFromWikidata).not.toHaveBeenCalled();
});

it('discards stale duplicate matches after the title changes', async () => {
  let resolve!: (value: { id: string; title: string; reason: 'subject' }[]) => void;
  vi.mocked(stories.findWikidataStories).mockReturnValueOnce(new Promise(yes => { resolve = yes; }));
  await start();
  expect(button('Enregistrer la frise').attributes('disabled')).toBeDefined();
  const oldSignal = vi.mocked(stories.findWikidataStories).mock.calls[0][2];
  await view.get('.generation-overview input').setValue('Un autre titre'); await flushPromises();
  resolve([{ id: '30', title: 'Ancienne réponse', reason: 'subject' }]); await flushPromises();
  expect(oldSignal?.aborted).toBe(true);
  expect(view.text()).not.toContain('Ancienne réponse');
  expect(button('Enregistrer la frise').attributes('disabled')).toBeUndefined();
});

it('shows a duplicate found at save time without automatically repeating the write', async () => {
  vi.mocked(stories.createFromWikidata).mockRejectedValueOnce({ response: { status: 409, data: { error: 'Une frise existe déjà.', existingStories: [{ id: '30', title: 'Révolution française', reason: 'subject' }] } } });
  await start();
  const scrollTo = vi.fn(); view.get('.generation-details').element.scrollTo = scrollTo;
  await button('Enregistrer la frise').trigger('click'); await flushPromises();
  expect(view.get('.generation-existing-stories a').attributes('href')).toBe('/database?story=30');
  expect(view.get('.generation-duplicate-choice input').element.checked).toBe(false);
  expect(button('Enregistrer la frise').attributes('disabled')).toBeDefined();
  expect(stories.createFromWikidata).toHaveBeenCalledOnce();
  expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
});

it('previews without writing, allows date correction and saves only the selected valid items', async () => {
  await start(); expect(stories.createFromWikidata).not.toHaveBeenCalled();
  const rows = view.findAll('.generation-item');
  expect(rows[1].get('input[type="checkbox"]').attributes('disabled')).toBeDefined();
  expect(rows[1].get('details').attributes('open')).toBeDefined();
  await rows[1].get('input[placeholder="Date de fin connue"]').setValue('1799');
  expect(rows[1].get('input[type="checkbox"]').element.checked).toBe(true);
  await rows[0].get('input[type="checkbox"]').setValue(false);
  await view.get('input[maxlength="255"]').setValue('Ma frise');
  await button('Enregistrer la frise').trigger('click'); await flushPromises();
  expect(stories.createFromWikidata).toHaveBeenCalledWith('Q1', 'Ma frise', [expect.objectContaining({ qid: 'Q3', endDate: '1799' })], false, 'Un sujet');
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=42');
});

it('uses the segmented type control above the fields to save an incomplete period as an event', async () => {
  await start();
  const row = view.findAll('.generation-item')[1];
  expect(row.find('select').exists()).toBe(false);
  expect(view.text()).not.toContain('Ajouter comme événement');
  expect(view.text()).not.toContain('Compléter la période');
  const control = row.get('[role="radiogroup"]');
  expect(control.element.nextElementSibling).toBe(row.get('.generation-item-fields').element);
  expect(control.get('input[value="period"]').element.checked).toBe(true);
  await control.get('input[value="event"]').setValue(true);
  expect(row.get('details').attributes('open')).toBeDefined();
  expect(row.find('input[placeholder="Date de fin connue"]').exists()).toBe(false);
  expect(row.get('input[placeholder="Ex. 1789 ou 1789-07-14"]').element.value).toBe('1789');
  expect(row.get('input[type="checkbox"]').element.checked).toBe(true);
  expect(stories.createFromWikidata).not.toHaveBeenCalled();
  await view.findAll('.generation-item')[0].get('input[type="checkbox"]').setValue(false);
  await button('Enregistrer la frise').trigger('click'); await flushPromises();
  expect(stories.createFromWikidata).toHaveBeenCalledWith('Q1', 'Révolution', [expect.objectContaining({ qid: 'Q3', type: 'event', startDate: '1789' })], false, 'Un sujet');
});

it('waits until every error is resolved and deselects a card that becomes invalid again', async () => {
  await start();
  const row = view.findAll('.generation-item')[1];
  const checkbox = row.get('input[type="checkbox"]');
  await row.get('input[maxlength="255"]').setValue('');
  await row.get('input[placeholder="Date de fin connue"]').setValue('1799');
  expect(checkbox.element.checked).toBe(false);
  await row.get('input[maxlength="255"]').setValue('Titre corrigé');
  expect(checkbox.element.checked).toBe(true);
  await row.get('input[placeholder="Date de fin connue"]').setValue('1780');
  expect(checkbox.element.checked).toBe(false);
  expect(stories.createFromWikidata).not.toHaveBeenCalled();
});

it('keeps a valid card manually deselected when its title or date is edited', async () => {
  await start();
  const row = view.findAll('.generation-item')[0];
  const checkbox = row.get('input[type="checkbox"]');
  await checkbox.setValue(false);
  await row.get('input[maxlength="255"]').setValue('Titre ajusté');
  await row.get('input[placeholder="Ex. 1789 ou 1789-07-14"]').setValue('1789-07-15');
  expect(checkbox.element.checked).toBe(false);
  expect(button('Enregistrer la frise').attributes('disabled')).toBeDefined();
});

it('normalizes both edited date fields after a pause and saves the canonical dates', async () => {
  vi.useFakeTimers(); await start();
  const row = view.findAll('.generation-item')[1];
  const startDate = row.get('input[placeholder="Ex. 1789 ou 1789-07-14"]');
  const endDate = row.get('input[placeholder="Date de fin connue"]');
  await startDate.setValue('14/07/1789'); await endDate.setValue('9 novembre 1799');
  expect(startDate.element.value).toBe('14/07/1789'); expect(endDate.element.value).toBe('9 novembre 1799');
  await vi.advanceTimersByTimeAsync(800);
  expect(startDate.element.value).toBe('1789-07-14'); expect(endDate.element.value).toBe('1799-11-09');
  expect(row.get('input[type="checkbox"]').element.checked).toBe(true);
  expect(stories.createFromWikidata).not.toHaveBeenCalled();
  await view.findAll('.generation-item')[0].get('input[type="checkbox"]').setValue(false);
  await button('Enregistrer la frise').trigger('click'); await flushPromises();
  expect(stories.createFromWikidata).toHaveBeenCalledWith('Q1', 'Révolution', [expect.objectContaining({ startDate: '1789-07-14', endDate: '1799-11-09' })], false, 'Un sujet');
});

it('shows actual catalogue values and prevents editing an existing shared record', async () => {
  vi.mocked(searches.searchLocalByWikidataIds).mockImplementation(async (_ids, type) => type === 'event' ? [{ id: 'saved', wikidataId: 'Q2', type: 'event', label: { fr: 'Titre du catalogue', en: '' }, description: 'Description du catalogue', date: '1789', dateLabel: '1789', fromWikidata: false }] : []);
  await start(); const row = view.findAll('.generation-item')[0];
  expect(row.get('.generation-item-fields input[maxlength="255"]').element.value).toBe('Titre du catalogue');
  expect(row.get('textarea').element.value).toBe('Description du catalogue');
  for (const field of row.findAll('.generation-item-fields input, textarea')) {
    expect(field.attributes('readonly')).toBeDefined();
    expect(field.attributes('disabled')).toBeUndefined();
  }
  expect(row.get('input[placeholder="Ex. 1789 ou 1789-07-14"]').element.value).toBe('1789');
  expect(row.get('input[value="period"]').attributes('disabled')).toBeDefined();
  expect(row.get('input[type="checkbox"]').attributes('disabled')).toBeUndefined();
  expect(view.findAll('.generation-item')[1].get('input[maxlength="255"]').attributes('readonly')).toBeUndefined();
  await button('Enregistrer la frise').trigger('click'); await flushPromises();
  expect(stories.createFromWikidata).toHaveBeenCalledWith('Q1', 'Révolution', [expect.objectContaining({ startDate: '1789', title: 'Titre du catalogue' })], false, 'Un sujet');
});

it('renders catalogue periods with read-only start and end fields while leaving their local parent editable', async () => {
  vi.mocked(searches.searchLocalByWikidataIds).mockImplementation(async (_ids, type) => type === 'period' ? [{ id: 'saved-period', wikidataId: 'Q3', type: 'period', label: { fr: 'Période du catalogue', en: '' }, description: 'Description', startDate: '1789', endDate: '1799', dateLabel: '1789–1799', fromWikidata: false }] : []);
  await start(); const row = view.get('#generation-item-Q3');
  expect(row.findAll('.generation-item-fields input[readonly]')).toHaveLength(3);
  expect(row.get('#generation-end-Q3').element.value).toBe('1799');
  expect(row.get('[role="combobox"]').attributes('aria-disabled')).toBe('false');
  expect(row.get('input[type="checkbox"]').element.checked).toBe(true);
  await row.get('input[value="event"]').trigger('change');
  await button('Enregistrer la frise').trigger('click'); await flushPromises();
  expect(stories.createFromWikidata).toHaveBeenCalledWith('Q1', 'Révolution', expect.arrayContaining([expect.objectContaining({ qid: 'Q3', type: 'period', startDate: '1789', endDate: '1799' })]), false, 'Un sujet');
});

it('lets a visitor preview and preserves corrections when following the sign-in link', async () => {
  await start('/generate?wikidata=Q1', false);
  await view.get('input[maxlength="255"]').setValue('Brouillon conservé');
  const link = view.findAll('a').find(element => element.text().includes('Se connecter pour enregistrer'))!;
  expect(link.attributes('href')).toContain('redirect=/generate?wikidata=Q1');
  await link.trigger('click'); await flushPromises();
  expect(stories.createFromWikidata).not.toHaveBeenCalled();
  expect(JSON.parse(sessionStorage.getItem('wikidata-generation-draft')!).title).toBe('Brouillon conservé');
});

it('restores an edited public draft after sign-in', async () => {
  const previous = fixture(); previous.title = 'Titre corrigé'; previous.items[0].selected = false;
  sessionStorage.setItem('wikidata-generation-draft', JSON.stringify(previous));
  await start(); expect(view.get('input[maxlength="255"]').element.value).toBe('Titre corrigé');
  expect(button('Enregistrer la frise').attributes('disabled')).toBeDefined();
});

it('recalculates selection after changing rules while preserving manual corrections', async () => {
  vi.mocked(generation.generateWikidataTimeline).mockImplementation(async (_qid, options) => {
    const result = fixture(); result.profile = 'history'; result.settings = { ...defaultSettings, ...options?.settings };
    result.items[0].status = result.settings.approximate ? 'retained' : 'review';
    return result;
  });
  await start();
  await view.get('.generation-overview input').setValue('Mon titre');
  await view.findAll('.generation-item')[0].get('input[maxlength="255"]').setValue('Fait corrigé');
  await view.get('.generation-rules input[type="checkbox"]').setValue(false); await flushPromises();
  expect(view.get('.generation-overview input').element.value).toBe('Mon titre');
  expect(view.text()).toContain('0 sélectionnés');
  await button('À vérifier').trigger('click');
  const row = view.findAll('.generation-item').find(item => item.text().includes('Fait corrigé'))!;
  expect(row.get('input[type="checkbox"]').element.checked).toBe(false);
  await row.get('input[type="checkbox"]').setValue(true);
  expect(button('Enregistrer la frise').attributes('disabled')).toBeUndefined();
});

it('restores generation rules before fetching the saved sign-in draft', async () => {
  const previous = { ...fixture(), profile: 'history', settings: { ...defaultSettings, approximate: false, limit: 20 } };
  sessionStorage.setItem('wikidata-generation-draft', JSON.stringify(previous));
  await start();
  expect(generation.generateWikidataTimeline).toHaveBeenCalledWith('Q1', expect.objectContaining({ profile: 'history', settings: expect.objectContaining({ approximate: false, limit: 20 }) }));
});

it('offers an explicit retry after a failed load without showing it as a successful empty result', async () => {
  vi.mocked(generation.generateWikidataTimeline).mockRejectedValueOnce(new Error('Wikidata indisponible'));
  await start(); expect(view.text()).toContain('Wikidata indisponible'); expect(view.find('.generation-overview').exists()).toBe(false);
  await button('Réessayer').trigger('click'); await flushPromises();
  expect(view.find('.generation-overview').exists()).toBe(true);
  expect(generation.generateWikidataTimeline).toHaveBeenLastCalledWith('Q1', expect.objectContaining({ force: true }));
});

it('discards a late response when a newer subject is opened', async () => {
  let resolve!: (value: WikidataTimelineDraft) => void;
  vi.mocked(generation.generateWikidataTimeline).mockReturnValueOnce(new Promise(yes => { resolve = yes; }));
  await start(); const signal = vi.mocked(generation.generateWikidataTimeline).mock.calls[0][1]?.signal;
  await router.push('/generate?wikidata=Q9'); await flushPromises();
  resolve({ ...fixture(), title: 'Ancienne réponse' }); await flushPromises();
  expect(signal?.aborted).toBe(true); expect(view.text()).not.toContain('Ancienne réponse');
});

it('prevents double saves and route changes while the transaction is pending', async () => {
  let resolve!: (value: { id: string; periodCount: number; eventCount: number }) => void;
  vi.mocked(stories.createFromWikidata).mockReturnValue(new Promise(yes => { resolve = yes; }));
  await start(); await button('Enregistrer la frise').trigger('click');
  await router.push('/timeline'); expect(router.currentRoute.value.name).toBe('wikidata-generation');
  await button('Enregistrement…').trigger('click'); expect(stories.createFromWikidata).toHaveBeenCalledOnce();
  resolve({ id: '42', periodCount: 0, eventCount: 1 }); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=42');
});

it('blocks another save after a lost response and invites checking existing frises', async () => {
  vi.mocked(stories.createFromWikidata).mockRejectedValue({ code: 'ERR_NETWORK' });
  await start(); await button('Enregistrer la frise').trigger('click'); await flushPromises();
  expect(view.get('[role="alert"]').text()).toContain('n’a pas pu être confirmé');
  expect(view.get('[role="alert"] a').text()).toBe('Vérifier mes frises');
  expect(button('Enregistrer la frise').attributes('disabled')).toBeDefined();
  expect(stories.createFromWikidata).toHaveBeenCalledOnce();
});

const hierarchyFixture = (): WikidataTimelineDraft => ({ qid: 'Q1', title: 'Révolution', description: '', warnings: [], items: [
  { qid: 'Q1', type: 'period', title: 'Révolution', description: '', startDate: '1789-07-14', endDate: '1799-11-09', selected: true, parentQid: null },
  { qid: 'Q2', type: 'period', title: 'Convention', description: '', startDate: '1792-09-20', endDate: '1795-10-26', selected: true, parentQid: 'Q1', parentCandidates: ['Q1'] },
  { qid: 'Q3', type: 'period', title: 'Thermidor', description: '', startDate: '1794-07-27', endDate: '1795-10-26', selected: true, parentQid: 'Q2', parentCandidates: ['Q2'] },
  { qid: 'Q4', type: 'period', title: 'Guerres', description: '', startDate: '1792-04-20', endDate: '1802-03-25', selected: true, parentQid: 'Q1', parentCandidates: ['Q1'] },
] });

it('previews the hierarchy, warns about date overflow without blocking and saves the chosen parents', async () => {
  vi.mocked(generation.generateWikidataTimeline).mockResolvedValue(hierarchyFixture());
  await start();
  expect(view.get('[role="tree"]').attributes('aria-label')).toBe('Périodes de la frise');
  expect(view.get('[data-period-id="Q2"]').attributes('aria-level')).toBe('2');
  await view.get('[data-period-id="Q2"] button').trigger('click');
  expect(view.get('[data-period-id="Q3"]').attributes('aria-level')).toBe('3');
  expect(view.get('#generation-item-Q4 .generation-hierarchy-warnings').text()).toContain('Se termine après');
  expect(button('Enregistrer la frise').attributes('disabled')).toBeUndefined();
  await view.get('#generation-parent-Q3').trigger('click'); await flushPromises();
  (document.getElementById('generation-parent-Q3-option-0') as HTMLElement).click(); await flushPromises();
  expect(view.get('.generation-tree [data-period-id="Q3"]').attributes('aria-level')).toBe('1');
  await button('Enregistrer la frise').trigger('click'); await flushPromises();
  expect(stories.createFromWikidata).toHaveBeenCalledWith('Q1', 'Révolution', expect.arrayContaining([expect.objectContaining({ qid: 'Q3', parentQid: null })]), false, '');
});

it('promotes a child to the preview root when its parent is deselected, and excludes descendants from parent choices', async () => {
  vi.mocked(generation.generateWikidataTimeline).mockResolvedValue(hierarchyFixture());
  await start();
  await view.get('#generation-parent-Q1').trigger('click'); await flushPromises();
  expect(document.querySelectorAll('[id^="generation-parent-Q1-option-"]')).toHaveLength(1);
  await view.get('#generation-parent-Q1').trigger('keydown', { key: 'Escape' });
  await view.get('#generation-item-Q2 input[type="checkbox"]').setValue(false);
  expect(view.get('.generation-tree [data-period-id="Q3"]').attributes('aria-level')).toBe('1');
  expect(view.get('#generation-item-Q3 .generation-hierarchy-warnings').text()).toContain('Parent non sélectionné');
  expect(button('Enregistrer la frise').attributes('disabled')).toBeUndefined();
});

it('restores local parent choices across sign-in and blocks a cyclic restored draft', async () => {
  const cached = hierarchyFixture(); cached.items[0].parentQid = 'Q3';
  sessionStorage.setItem('wikidata-generation-draft', JSON.stringify(cached));
  vi.mocked(generation.generateWikidataTimeline).mockResolvedValue(hierarchyFixture());
  await start();
  expect(view.get('[role="alert"]').text()).toContain('boucle');
  expect(view.findAll('.generation-tree [role="treeitem"]')).toHaveLength(4);
  expect(button('Enregistrer la frise').attributes('disabled')).toBeDefined();
});

it('keeps cancellation, visibility and saving in the header, with tree navigation beside the complete item list', async () => {
  await start();
  const header = view.get('.generation-heading');
  expect(header.get('h1').text()).toContain('Créer une frise');
  expect(header.get('a[title*="Annuler"]').exists()).toBe(true);
  expect(header.get('.generation-visibility').text()).toContain('Privée jusqu’à son rattachement');
  expect(header.findAll('button').some(element => element.text().includes('Enregistrer la frise'))).toBe(true);
  expect(view.find('.generation-save').exists()).toBe(false);
  expect(view.find('.generation-search').exists()).toBe(false);
  expect(view.find('.generation-notes').exists()).toBe(false);
  expect(view.find('.generation-navigation-heading').exists()).toBe(false);
  expect(header.get('.generation-heading-actions a[title*="Annuler"]').text()).toBe('Annuler');
  expect(header.get('.generation-heading-actions a[title*="Annuler"]').classes()).toContain('base-button--sm');
  expect(button('Enregistrer la frise').classes()).toContain('base-button--sm');
  expect(view.get('.generation-workspace > aside').attributes('aria-label')).toBe('Structure de la frise');
  expect(view.get('.generation-workspace > .generation-details').findAll('.generation-item')).toHaveLength(2);
  const scrollTo = vi.fn(); view.get('.generation-details').element.scrollTo = scrollTo;
  const scrollAncestors = vi.fn(); view.get('#generation-item-Q2').element.scrollIntoView = scrollAncestors;
  await view.get('.generation-event-link').trigger('click');
  expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  expect(scrollAncestors).not.toHaveBeenCalled();
  expect(view.get('#generation-item-Q2').classes()).toContain('generation-item--active');
  expect(view.findAll('.generation-item')).toHaveLength(2);
});

it('edits and saves the story description independently of catalogue item descriptions', async () => {
  await start();
  const description = view.get('.generation-overview textarea');
  expect(description.element.value).toBe('Un sujet');
  await description.setValue('Ma description\nAvec une deuxième ligne.');
  await button('Enregistrer la frise').trigger('click'); await flushPromises();
  expect(stories.createFromWikidata).toHaveBeenCalledWith('Q1', 'Révolution', [expect.objectContaining({ qid: 'Q2', description: 'Événement' })], false, 'Ma description\nAvec une deuxième ligne.');
});

it('restores the edited description across sign-in and still offers subject search before a topic is chosen', async () => {
  sessionStorage.setItem('wikidata-generation-draft', JSON.stringify({ ...fixture(), description: 'Description conservée' }));
  await start();
  expect(view.get('.generation-overview textarea').element.value).toBe('Description conservée');
  await router.push('/generate'); await flushPromises();
  expect(view.get('input[aria-label="Rechercher un sujet Wikidata"]').exists()).toBe(true);
});

it('saves a generated frise as a private draft, since it has no parent yet', async () => {
  await start();
  await button('Enregistrer la frise').trigger('click'); await flushPromises();
  expect(stories.createFromWikidata).toHaveBeenCalledWith('Q1', 'Révolution', expect.any(Array), false, 'Un sujet');
  expect(view.find('.generation-visibility input').exists()).toBe(false);
});

it('ignores a cached public visibility and clears a cached draft when cancelling', async () => {
  const previous = { ...fixture(), isPublic: true };
  sessionStorage.setItem('wikidata-generation-draft', JSON.stringify(previous));
  await start('/generate?wikidata=Q1', false);
  expect(view.get('.generation-visibility').text()).toContain('Privée');
  await view.get('.generation-heading a[title*="Annuler"]').trigger('click'); await flushPromises();
  expect(sessionStorage.getItem('wikidata-generation-draft')).toBeNull();
  expect(stories.createFromWikidata).not.toHaveBeenCalled();
});
