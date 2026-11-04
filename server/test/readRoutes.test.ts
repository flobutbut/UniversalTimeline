// @vitest-environment node
import { expect, it, vi, beforeEach } from 'vitest';
import { query } from '../src/api/database';
import router from '../src/api/routes';
vi.mock('../src/api/database', () => ({ query: vi.fn(), withTransaction: vi.fn() }));
const db = vi.mocked(query);
beforeEach(() => vi.clearAllMocks());
const timestamp = '2026-01-01T00:00:00.000Z';
const period = {
  id: 'legacy-period', wikidata_id: 'Q123', label_fr: 'Période', label_en: null,
  description_fr: 'Description', description_en: '', start_date: 'M65', end_date: 'NOW',
  parent_id: null, start_years_bp: '65000000', end_years_bp: '0', has_children: true,
  created_at: timestamp, updated_at: timestamp,
};
const event = {
  id: 'legacy-event', wikidata_id: null, label_fr: 'Événement', label_en: '',
  description_fr: null, description_en: null, date: 'M54', date_years_bp: '54000000',
  created_at: timestamp, updated_at: timestamp,
};
const story = {
  id: 7, title_fr: 'Histoire', title_en: null, description_fr: 'Résumé', description_en: null,
  author: 'Auteur', is_public: true, owner_user_id: 'owner', created_at: timestamp, updated_at: timestamp,
};
const category = { category_id: 'old-category', category_label_fr: 'Catégorie', category_label_en: null };
const noCategory = { category_id: null, category_label_fr: null, category_label_en: null };
const categories = [{ id: 'old-category', label: { fr: 'Catégorie', en: 'Catégorie' } }];
function rows(...results: unknown[][]) { for (const result of results) db.mockResolvedValueOnce({ rows: result } as never); }
async function get(path: string, params = {}, query = {}) {
  const route = router.stack.find((layer: any) => layer.route?.path === path && layer.route.methods.get).route;
  const res = { status: vi.fn(), json: vi.fn() }; res.status.mockReturnValue(res);
  await route.stack[0].handle({ params, query }, res);
  return { status: res.status.mock.calls[0]?.[0] ?? 200, body: res.json.mock.calls[0]?.[0] };
}
it.each(['/periods'])('folds categories into one period and keeps the list contract: %s', async path => {
  rows([{ ...period, ...category }, { ...period, category_id: 'other', category_label_fr: 'Autre', category_label_en: 'Other' }]);
  const { body, status } = await get(path, { id: 'parent' });
  expect(status).toBe(200); expect(body).toEqual([{
    id: 'legacy-period', wikidata_id: 'Q123', label_fr: 'Période', label_en: null,
    description_fr: 'Description', description_en: '', start_date: 'M65', end_date: 'NOW',
    parent_id: null, start_years_bp: '65000000', end_years_bp: '0', has_children: true,
    categories: [...categories, { id: 'other', label: { fr: 'Autre', en: 'Other' } }],
  }]);
  expect(db).toHaveBeenCalledOnce();
  expect(db.mock.calls[0][1]).toEqual(path === '/periods' ? [] : ['parent']);
});
it('keeps a period without category and does not create a phantom category', async () => {
  rows([{ ...period, ...noCategory }]);
  expect((await get('/periods')).body[0].categories).toEqual([]);
});
it.each(['/periods/:id', '/periods/wikidata/:wikidataId'])('returns the same localized detail for ID and Q-id: %s', async path => {
  rows([period], [{ id: 'old-category', label_fr: 'Catégorie', label_en: null, description_fr: 'Texte', description_en: null }]);
  expect(await get(path, { id: 'legacy-period', wikidataId: 'q123' })).toEqual({ status: 200, body: {
    id: 'legacy-period', wikidata_id: 'Q123', label: { fr: 'Période', en: 'Période' },
    description: { fr: 'Description', en: 'Description' }, startDate: 'M65', endDate: 'NOW',
    parentId: null, hasChildren: true, startYearsBP: 65000000, endYearsBP: 0,
    categories: [{ ...categories[0], description: { fr: 'Texte', en: 'Texte' } }], createdAt: timestamp, updatedAt: timestamp,
  } });
  expect(db.mock.calls[1][1]).toEqual(['legacy-period']);
});
it('preserves event list field names, nullable descriptions and stored numerical text', async () => {
  rows([{ ...event, ...category }]);
  expect((await get('/events')).body).toEqual([{
    id: 'legacy-event', wikidata_id: null, label: { fr: 'Événement', en: 'Événement' },
    description: undefined, date: 'M54', date_years_bp: '54000000', categories,
    createdAt: timestamp, updatedAt: timestamp,
  }]);
});
it('lists event memberships only through readable stories, as string story IDs', async () => {
  rows([{ event_id: 'legacy-event', story_id: '7' }, { event_id: 'legacy-event', story_id: '12' }]);
  expect(await get('/events/story-links')).toEqual({ status: 200, body: [
    { event_id: 'legacy-event', story_id: '7' }, { event_id: 'legacy-event', story_id: '12' },
  ] });
  expect(db).toHaveBeenCalledOnce();
  expect(db.mock.calls[0][0]).toMatch(/FROM public\.story_events link\s+JOIN public\.stories s ON s\.id = link\.story_id/);
});
it('lists period memberships through readable stories before the /periods/:id route can capture the path', async () => {
  rows([{ period_id: 'legacy-period', story_id: '7' }]);
  expect(await get('/periods/story-links')).toEqual({ status: 200, body: [{ period_id: 'legacy-period', story_id: '7' }] });
  expect(db.mock.calls[0][0]).toMatch(/FROM public\.story_periods link\s+JOIN public\.stories s ON s\.id = link\.story_id/);
  const paths = router.stack.filter((layer: any) => layer.route?.methods.get).map((layer: any) => layer.route.path);
  expect(paths.indexOf('/periods/story-links')).toBeLessThan(paths.indexOf('/periods/:id'));
});
it('includes every event category on the story timeline without duplicating events or changing legacy fields', async () => {
  const other = { ...event, id: 'uncategorized' };
  rows([
    { ...event, ...category },
    { ...event, category_id: 'second', category_label_fr: 'Biologie', category_label_en: 'Biology' },
    { ...other, ...noCategory },
  ]);
  expect(await get('/stories/:storyId/events', { storyId: '7' })).toEqual({ status: 200, body: [
    { ...event, categories: [...categories, { id: 'second', label: { fr: 'Biologie', en: 'Biology' } }] },
    { ...other, categories: [] },
  ] });
  expect(db).toHaveBeenCalledOnce(); expect(db.mock.calls[0][1]).toEqual(['7']);
});
it('returns an empty event list for a story with no visible event', async () => {
  rows([]);
  expect(await get('/stories/:storyId/events', { storyId: '7' })).toEqual({ status: 200, body: [] });
});
it('preserves story ownership and public visibility on the list while aggregating date candidates', async () => {
  rows([{ ...story, ...category, preview_periods: [period] }]);
  expect((await get('/stories')).body).toEqual([{ ...story, parent_story_id: null, start_date: 'M65', end_date: 'NOW', categories, preview_periods: [period], preview_events: [] }]);
  expect(db).toHaveBeenCalledOnce();
});
it('keeps the detail contract for stories, periods, events, child IDs and anchors', async () => {
  rows([{ ...story, categories: [], periods: [{ ...period, story_parent_id: 'frise-parent', ...category }], events: [{ ...event, ...noCategory }], child_stories: [
    { id: 8, title_fr: 'Enfant', title_en: null, anchors: [{ type: 'period', id: 'legacy-period' }] },
    { id: 9, title_fr: 'Autre', title_en: 'Other', anchors: null },
  ], related_stories: [] }]);
  expect((await get('/stories/:id', { id: '7' })).body).toEqual({
    id: 7, title: { fr: 'Histoire', en: 'Histoire' }, description: { fr: 'Résumé', en: 'Résumé' },
    author: 'Auteur', isPublic: true, ownerUserId: 'owner', created_at: timestamp, parent_story_id: null, categories: [],
    periods: [{
      id: 'legacy-period', wikidata_id: 'Q123', storyParentId: 'frise-parent', label: { fr: 'Période', en: 'Période' }, description: { fr: 'Description', en: 'Description' },
      startDate: 'M65', endDate: 'NOW', parentId: null, hasChildren: true, startYearsBP: 65000000, endYearsBP: 0,
      categories, createdAt: timestamp, updatedAt: timestamp,
    }],
    events: [{ id: 'legacy-event', wikidata_id: null, label: { fr: 'Événement', en: 'Événement' }, description: undefined, date: 'M54', dateYearsBP: 54000000, categories: [], createdAt: timestamp, updatedAt: timestamp }],
    childStories: [
      { id: '8', title: { fr: 'Enfant', en: 'Enfant' }, anchors: [{ type: 'period', id: 'legacy-period' }],atRoot:false },
      { id: '9', title: { fr: 'Autre', en: 'Other' }, anchors: [],atRoot:false },
    ], parentStories: [], relatedStories: [], navigationContexts: [], createdAt: timestamp, updatedAt: timestamp,
  });
  expect(db).toHaveBeenCalledOnce();
});
it.each([
  ['/periods/:id', { id: 'missing' }, 'Période non trouvée'],
  ['/periods/wikidata/:wikidataId', { wikidataId: 'Q999' }, 'Période non trouvée'],
  ['/stories/:id', { id: '999' }, 'Frise non trouvée'],
] as const)('returns 404 before loading related data for %s', async (path, params, error) => {
  rows([]); expect(await get(path, params)).toEqual({ status: 404, body: { error } });
  expect(db).toHaveBeenCalledOnce();
});
it.each(['periods', 'events'])('searches only the requested catalogue: %s', async only => {
  rows([]); expect((await get('/search', {}, { q: ' texte ', only })).body).toEqual({ periods: [], events: [] });
  expect(db).toHaveBeenCalledOnce(); expect(db.mock.calls[0][0]).toContain(`FROM public.${only}`);
  expect(db.mock.calls[0][0]).toContain('LIMIT 300'); expect(db.mock.calls[0][1]).toEqual(['texte']);
});
it('does not query suggestions when neither periods nor events were selected', async () => {
  expect(await get('/stories/suggestions', {}, { story_id: '7' })).toEqual({ status: 200, body: [] });
  expect(db).not.toHaveBeenCalled();
});
it('resolves semantic IDs in one scoped catalogue query with bound parameters', async () => {
  rows([]);
  expect((await get('/search/by-wikidata', {}, { ids: 'Q43653,Q1085', only: 'events' })).body).toEqual({ periods: [], events: [] });
  expect(db).toHaveBeenCalledOnce(); expect(db.mock.calls[0][1]).toEqual(['', ['Q43653','Q1085']]);
  // Historical internal IDs can look like Q-ids: only the stored Wikidata link may match.
  expect(db.mock.calls[0][0]).toMatch(/WHERE e\.wikidata_id=ANY\(\$2::text\[\]\)/);
  expect(db.mock.calls[0][0]).not.toMatch(/id::text=ANY/);
});
it('rejects invalid semantic identifiers before any catalogue query', async () => {
  expect((await get('/search/by-wikidata', {}, { ids: 'bad-id', only: 'events' })).status).toBe(400);
  expect(db).not.toHaveBeenCalled();
});

it('retires global children reads and never queries the database for them', async () => {
  expect((await get('/periods/:id/children',{id:'parent'})).status).toBe(410); expect(db).not.toHaveBeenCalled();
});
