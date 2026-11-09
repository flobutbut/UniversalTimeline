import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import GlobalSearch from '@/components/GlobalSearch.vue';
import { SearchApiService, type StorySearchResult } from '@/services/SearchApiService';
const api = SearchApiService.getInstance();
const story: StorySearchResult = { id: '7', label: { fr: 'Guerre froide', en: '' }, description: { fr: 'De 1947 à 1991', en: '' }, matchedOn: 'content', match: { type: 'event', label: { fr: 'plan Marshall', en: '' } } };
let view: ReturnType<typeof mount>;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { resolve, promise }; }
async function search(q: string) {
  const input = view.get('input'); await input.trigger('focus'); await input.setValue(q);
  await vi.advanceTimersByTimeAsync(250); await flushPromises();
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(api, 'searchStories').mockResolvedValue([]);
  vi.spyOn(api, 'searchStoryEvents').mockResolvedValue([]);
  vi.spyOn(api, 'searchWikidataEntityLabels').mockResolvedValue([]);
  vi.spyOn(api, 'searchLocal'); vi.spyOn(api, 'searchWikidata');
  view = mount(GlobalSearch, { attachTo: document.body });
});
afterEach(() => { view?.unmount(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('activates only on click or keyboard focus, stays active when the pointer leaves and dismisses with Escape', async () => {
  const input = view.get('input');
  expect(view.classes()).not.toContain('gs--active');
  await view.trigger('mouseenter');
  expect(view.classes()).not.toContain('gs--active');
  expect(api.searchStories).not.toHaveBeenCalled();

  await view.get('.search-input-wrap__icon').trigger('click');
  expect(document.activeElement).toBe(input.element);
  expect(view.classes()).toContain('gs--active');
  await view.trigger('mouseleave');
  expect(view.classes()).toContain('gs--active');

  await input.trigger('keydown', { key: 'Escape' });
  expect(view.classes()).not.toContain('gs--active');
  expect(document.activeElement).not.toBe(input.element);
  input.element.focus(); await flushPromises();
  expect(view.classes()).toContain('gs--active');
});

it('offers stories with their description and explains a match through associated content', async () => {
  vi.mocked(api.searchStories).mockResolvedValue([story]);
  await search('Marshall');
  expect(view.get('[role="option"]').text()).toContain('Guerre froide');
  expect(view.text()).toContain('De 1947 à 1991'); expect(view.text()).toContain('Événement'); expect(view.text()).toContain('plan Marshall');
  expect(api.searchLocal).not.toHaveBeenCalled(); expect(api.searchWikidata).not.toHaveBeenCalled();
});
it('distinguishes a pending search, an error and an empty result', async () => {
  const pending = deferred<StorySearchResult[]>(); vi.mocked(api.searchStories).mockReturnValueOnce(pending.promise);
  await search('Terre'); expect(view.text()).toContain('Recherche de frises'); expect(view.text()).not.toContain('Aucune frise');
  pending.resolve([]); await vi.advanceTimersByTimeAsync(600); await flushPromises(); expect(view.text()).toContain('Aucune frise, aucun événement ni sujet Wikidata trouvé');
  vi.mocked(api.searchStories).mockRejectedValueOnce(new Error('Recherche indisponible')).mockResolvedValueOnce([story]);
  await search('Marshall'); expect(view.get('[role="alert"]').text()).toContain('Recherche indisponible');
  expect(view.text()).not.toContain('Aucune frise trouvée');
  await view.get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(view.text()).toContain('Guerre froide'); expect(view.find('[role="alert"]').exists()).toBe(false);
});

it('offers undated Wikidata subjects alongside stories and selects a generation subject with the keyboard', async () => {
  vi.mocked(api.searchStories).mockResolvedValue([story]);
  vi.mocked(api.searchWikidataEntityLabels).mockResolvedValue([{ id: 'Q1', label: 'Univers', description: 'Sujet sans date directe' }]);
  await search('Univers'); await vi.advanceTimersByTimeAsync(350); await flushPromises();
  expect(view.findAll('[role="option"]')).toHaveLength(2);
  const input = view.get('input');
  await input.trigger('keydown', { key: 'ArrowDown' }); await input.trigger('keydown', { key: 'ArrowDown' }); await input.trigger('keydown', { key: 'Enter' });
  expect(view.emitted('select')?.[0]).toEqual([expect.objectContaining({ id: 'Q1', fromWikidata: true })]);
});

it('keeps stories usable when Wikidata fails and retries only the failed source', async () => {
  vi.mocked(api.searchStories).mockResolvedValue([story]);
  vi.mocked(api.searchWikidataEntityLabels).mockRejectedValueOnce(new Error('Wikidata indisponible')).mockResolvedValueOnce([{ id: 'Q1', label: 'Univers' }]);
  await search('Univers'); await vi.advanceTimersByTimeAsync(350); await flushPromises();
  expect(view.get('[role="option"]').text()).toContain('Guerre froide');
  expect(view.get('[role="alert"]').text()).toContain('Wikidata indisponible');
  await view.get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(view.findAll('[role="option"]')).toHaveLength(2);
  expect(api.searchStories).toHaveBeenCalledOnce();
});
it('ignores a previous query after a newer one has completed', async () => {
  const old = deferred<StorySearchResult[]>();
  vi.mocked(api.searchStories).mockReturnValueOnce(old.promise).mockResolvedValueOnce([story]);
  await search('ancien'); const signal = vi.mocked(api.searchStories).mock.calls[0][1]?.signal;
  await search('Marshall'); old.resolve([{ ...story, label: { fr: 'Ancienne réponse', en: '' } }]); await flushPromises();
  expect(signal?.aborted).toBe(true); expect(view.text()).not.toContain('Ancienne réponse'); expect(view.text()).toContain('Guerre froide');
});
it.each(['clear', 'dispose'] as const)('cancels reads and discards a late response on %s', async action => {
  const pending = deferred<StorySearchResult[]>(); vi.mocked(api.searchStories).mockReturnValue(pending.promise);
  await search('Terre'); const signal = vi.mocked(api.searchStories).mock.calls[0][1]?.signal;
  if (action === 'clear') await view.get('input').trigger('keydown', { key: 'Escape' }); else view.unmount();
  pending.resolve([story]); await flushPromises();
  expect(signal?.aborted).toBe(true); expect(view.text()).not.toContain('Guerre froide'); expect(view.emitted('select')).toBeUndefined();
});
it('times out an uncooperative request and allows a fresh retry', async () => {
  const pending = deferred<StorySearchResult[]>(); vi.mocked(api.searchStories).mockReturnValueOnce(pending.promise).mockResolvedValueOnce([story]);
  await search('Terre'); await vi.advanceTimersByTimeAsync(15000);
  expect(view.get('[role="alert"]').text()).toContain('trop de temps');
  await view.get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(view.text()).toContain('Guerre froide');
});
it('selects a story with Enter while keeping the combobox focus and announcing its active option', async () => {
  vi.mocked(api.searchStories).mockResolvedValue([story]);
  await search('Marshall'); const input = view.get('input'); input.element.focus();
  expect(input.attributes('aria-expanded')).toBe('true');
  await input.trigger('keydown', { key: 'ArrowDown' });
  expect(document.getElementById(input.attributes('aria-activedescendant')!)?.textContent).toContain('Guerre froide');
  await input.trigger('keydown', { key: 'Enter' });
  expect(view.emitted('select')?.[0]).toEqual([story]); expect(document.activeElement).toBe(input.element);
});

it.each(['event', 'period'] as const)('shows the precise %s match using the shared summary', async type => {
  vi.mocked(api.searchStories).mockResolvedValue([{ ...story, match: { type, label: { fr: 'Correspondance', en: '' } } }]);
  await search('Correspondance');
  const result = view.get('[role="option"]');
  expect(result.find('.item-summary').exists()).toBe(true);
  expect(result.get('.gs__match-type').text()).toBe(type === 'event' ? 'Événement' : 'Période');
  expect(result.get('.gs__match-label').text()).toBe('Correspondance');
});
it('does not invent a content match for a title-only result', async () => {
  vi.mocked(api.searchStories).mockResolvedValue([{ ...story, matchedOn: 'title', match: null }]);
  await search('Guerre');
  expect(view.find('.gs__match').exists()).toBe(false);
  expect(view.text()).not.toMatch(/story|stories/i);
});

it('lists events between frises and Wikidata, with their date and frise', async () => {
  vi.mocked(api.searchStories).mockResolvedValue([{ ...story, match: null }]);
  vi.mocked(api.searchStoryEvents).mockResolvedValue([{ id: 'waterloo', label: { fr: 'Bataille de Waterloo', en: '' }, description: { fr: '', en: '' }, date: '1815-06-18', dateLabel: '18 juin 1815', storyId: '27', storyLabel: { fr: 'L’âge des révolutions', en: '' } }]);
  vi.mocked(api.searchWikidataEntityLabels).mockResolvedValue([{ id: 'Q48314', label: 'Waterloo' }]);
  await search('waterloo'); await vi.advanceTimersByTimeAsync(600); await flushPromises();
  expect(view.findAll('.gs__section').map(row => row.text())).toEqual(['Frises', 'Événements', 'Wikidata · générer une frise']);
  expect(view.findAll('[role=option]')[1].text()).toContain('18 juin 1815');
  expect(view.findAll('[role=option]')[1].text()).toContain('L’âge des révolutions');
  await view.findAll('[role=option]')[1].trigger('click');
  expect(view.emitted('select')?.[0]?.[0]).toMatchObject({ id: 'waterloo', storyId: '27' });
});

it('keeps frises usable when the event search fails, and can retry it', async () => {
  vi.mocked(api.searchStories).mockResolvedValue([{ ...story, match: null }]);
  vi.mocked(api.searchStoryEvents).mockRejectedValueOnce(new Error('Événements indisponibles')).mockResolvedValueOnce([]);
  await search('guerre');
  expect(view.text()).toContain('Événements indisponibles');
  expect(view.findAll('[role=option]')).toHaveLength(1);
  await view.findAll('button').find(button => button.text() === 'Réessayer')!.trigger('click'); await flushPromises();
  expect(view.text()).not.toContain('Événements indisponibles');
});
