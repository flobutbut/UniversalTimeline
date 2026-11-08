import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope, reactive, type EffectScope } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { useWikidataForm } from '@/composables/useWikidataForm';
import { useWikidataImport } from '@/composables/useWikidataImport';
import { WikidataQueryService } from '@/services/WikidataQueryService';
import { PeriodApiService } from '@/services/PeriodApiService';
import type { EditFormData } from '@/composables/useEditModal';

function deferred<T>() {
  let resolve!: (value: T) => void; let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { resolve, reject, promise };
}
const event = { label: 'Depuis Wikidata', date: '1944-06-06', description: { fr: 'Importée', en: '' } };
const period = { label: { fr: 'Période importée', en: '' }, temporalData: [{ startDate: 'M65', endDate: 'M8', location: 'Monde' }], children: [] };
let scope: EffectScope;
function setup(type: 'event' | 'period' = 'event') {
  const form = reactive<EditFormData>({ qid: 'Q123', title: { fr: 'Mon brouillon', en: '' }, description: { fr: '', en: '' }, date: 'M65', startDate: 'M100', endDate: 'NOW', tags: ['manual'], tagsLoaded: true, nonThematic: false, parentId: 'chosen', location: '', author: '', isPublic: false });
  const context = reactive({ open: true, type, mode: 'create', data: {} as unknown, busy: false });
  const count = vi.fn();
  const flow = scope.run(() => useWikidataForm({ form, context: () => ({ ...context }), tagIds: () => new Set(['manual']), onChildrenCount: count }))!;
  return { form, context, flow, count };
}
beforeEach(() => {
  scope = effectScope();
  vi.spyOn(WikidataQueryService.getInstance(), 'loadEvent').mockResolvedValue(event);
  vi.spyOn(WikidataQueryService.getInstance(), 'loadPeriod').mockResolvedValue(period as any);
  vi.spyOn(WikidataQueryService.getInstance(), 'getEntityClasses').mockResolvedValue([]);
  vi.spyOn(WikidataQueryService.getInstance(), 'getWikipediaTitles').mockResolvedValue(new Map());
  vi.spyOn(WikidataQueryService.getInstance(), 'getPartOfParentQid').mockResolvedValue(null);
  vi.spyOn(PeriodApiService.getInstance(), 'getPeriodByWikidataId').mockResolvedValue(null);
});
afterEach(() => { scope.stop(); vi.restoreAllMocks(); });

it('keeps the draft and original error after an import failure, then retries the same candidate', async () => {
  const load = vi.mocked(WikidataQueryService.getInstance().loadEvent).mockRejectedValueOnce(new Error('Wikidata hors ligne'));
  const { form, flow } = setup();
  await flow.pick({ id: 'Q456', label: 'Suggestion' });
  expect(flow.error.value).toBe('Wikidata hors ligne'); expect(form.qid).toBe('Q123'); expect(form.title.fr).toBe('Mon brouillon');
  await flow.retry();
  expect(load).toHaveBeenNthCalledWith(2, 'Q456', expect.objectContaining({force:true,signal:expect.any(AbortSignal)})); expect(form.qid).toBe('Q456'); expect(form.title.fr).toBe('Depuis Wikidata');
  expect(flow.error.value).toBeNull(); expect(flow.loading.value).toBe(false);
});

it('keeps loading until categories and parent enrichment finish, including a zero child count', async () => {
  const classes = deferred<string[]>();
  vi.mocked(WikidataQueryService.getInstance().getEntityClasses).mockReturnValue(classes.promise);
  const { form, flow, count } = setup('period');
  const importing = flow.importCurrent(); await flushPromises();
  expect(flow.loading.value).toBe(true); expect(form.title.fr).toBe('Mon brouillon');
  classes.resolve([]); await importing;
  expect(flow.loading.value).toBe(false); expect(form.title.fr).toBe('Période importée'); expect(count).toHaveBeenCalledWith(0);
});

it('displays optional enrichment failures without discarding the main data or manual categories', async () => {
  vi.mocked(WikidataQueryService.getInstance().getEntityClasses).mockRejectedValue(new Error('Catégories inaccessibles'));
  const { form, flow } = setup('period'); await flow.importCurrent();
  expect(form.title.fr).toBe('Période importée'); expect(form.tags).toEqual(['manual']); expect(form.parentId).toBe('chosen');
  expect(flow.notice.value).toContain('catégories'); expect(flow.error.value).toBeNull();
});

it('ignores an older import error while a newer import is loading', async () => {
  const first = deferred<any>(); const second = deferred<any>();
  vi.mocked(WikidataQueryService.getInstance().loadEvent).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const { form, flow } = setup();
  const a = flow.pick({ id: 'Q1', label: 'Ancienne' }); const b = flow.pick({ id: 'Q2', label: 'Nouvelle' });
  first.reject(new Error('Ancienne panne')); await a;
  expect(flow.error.value).toBeNull(); expect(flow.loading.value).toBe(true);
  second.resolve(event); await b; expect(form.qid).toBe('Q2'); expect(flow.loading.value).toBe(false);
});

it.each(['edit', 'close', 'context', 'dispose'] as const)('ignores a late import after %s', async action => {
  const pending = deferred<any>();
  vi.mocked(WikidataQueryService.getInstance().loadEvent).mockReturnValue(pending.promise);
  const { form, context, flow } = setup(); const importing = flow.importCurrent();
  if (action === 'edit') form.title.fr = 'Ma correction';
  if (action === 'close') context.open = false;
  if (action === 'context') context.data = { id: 'other' };
  if (action === 'dispose') scope.stop();
  pending.resolve(event); await importing;
  expect(form.title.fr).toBe(action === 'edit' ? 'Ma correction' : 'Mon brouillon');
  expect(flow.notice.value).toBeNull(); expect(flow.error.value).toBeNull(); expect(flow.loading.value).toBe(false);
});

it('propagates mandatory import errors and rejects invalid Q-ids before any request', async () => {
  const importer = scope.run(useWikidataImport)!;
  await expect(importer.importAndTransform('invalid', 'event')).rejects.toThrow('Q-id');
  expect(WikidataQueryService.getInstance().loadEvent).not.toHaveBeenCalled();
  vi.mocked(WikidataQueryService.getInstance().loadEvent).mockRejectedValue(new Error('Erreur originale'));
  await expect(importer.importAndTransform('Q123', 'event')).rejects.toThrow('Erreur originale');
  expect(importer.error.value).toBe('Erreur originale'); expect(importer.isLoading.value).toBe(false);
});

it('discards the old retry target when the modal switches to a different draft', async () => {
  vi.mocked(WikidataQueryService.getInstance().loadEvent).mockRejectedValueOnce(new Error('Ancienne panne'));
  const { form, context, flow } = setup();
  await flow.pick({ id: 'Q456', label: 'Ancienne sélection' });
  context.data = { id: 'new-draft' }; form.qid = 'Q789'; form.title.fr = 'Nouvelle saisie';
  await flow.retry();
  expect(WikidataQueryService.getInstance().loadEvent).toHaveBeenCalledOnce();
  expect(form.qid).toBe('Q789'); expect(form.title.fr).toBe('Nouvelle saisie');
});
it('preserves categories and sets an unknown child count, offering a fresh retry for optional failures',async()=>{
  vi.mocked(WikidataQueryService.getInstance().loadPeriod).mockResolvedValueOnce({...period,childrenPreloaded:false,warnings:['Nombre de sous-périodes indéterminé']} as any);
  const {form,flow,count}=setup('period');await flow.importCurrent();expect(count).toHaveBeenCalledWith(null);expect(form.tags).toEqual(['manual']);expect(flow.retryAvailable.value).toBe(true);expect(flow.error.value).toBeNull();
  await flow.retry();expect(count).toHaveBeenLastCalledWith(0);expect(flow.retryAvailable.value).toBe(false);
  expect(WikidataQueryService.getInstance().loadPeriod).toHaveBeenLastCalledWith('Q123',expect.objectContaining({force:true}));
});
it.each(['edit','close','dispose'] as const)('aborts an import signal after %s without changing the draft',async action=>{
  const pending=deferred<any>();const load=vi.mocked(WikidataQueryService.getInstance().loadEvent).mockReturnValue(pending.promise);const {form,context,flow}=setup();const importing=flow.importCurrent();
  const signal=load.mock.calls[0][1]!.signal!;expect(signal.aborted).toBe(false);
  if(action==='edit') form.title.fr='Ma saisie';if(action==='close') context.open=false;if(action==='dispose') scope.stop();
  expect(signal.aborted).toBe(true);pending.resolve(event);await importing;expect(form.title.fr).toBe(action==='edit'?'Ma saisie':'Mon brouillon');
});

it('imports shared facts without reading or overwriting a frise placement', async () => {
  const {form,flow}=setup('period'); await flow.importCurrent();
  expect(form.parentId).toBe('chosen'); expect(form.title.fr).toBe('Période importée');
  expect(WikidataQueryService.getInstance().getPartOfParentQid).not.toHaveBeenCalled();
  expect(PeriodApiService.getInstance().getPeriodByWikidataId).not.toHaveBeenCalled();
});