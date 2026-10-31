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
  vi.spyOn(api, 'searchLocal'); vi.spyOn(api, 'searchWikidata');
  view = mount(GlobalSearch, { attachTo: document.body });
});
afterEach(() => { view?.unmount(); vi.useRealTimers(); vi.restoreAllMocks(); });

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
  pending.resolve([]); await flushPromises(); expect(view.text()).toContain('Aucune frise trouvée');
  vi.mocked(api.searchStories).mockRejectedValueOnce(new Error('Recherche indisponible')).mockResolvedValueOnce([story]);
  await search('Marshall'); expect(view.get('[role="alert"]').text()).toContain('Recherche indisponible');
  expect(view.text()).not.toContain('Aucune frise trouvée');
  await view.get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(view.text()).toContain('Guerre froide'); expect(view.find('[role="alert"]').exists()).toBe(false);
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
