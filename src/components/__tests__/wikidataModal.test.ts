import { useUiStore } from '@/stores/useUiStore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import EditModal from '@/views/DatabaseView/EditModal.vue';
import { CategoryService } from '@/services/CategoryService';
import { WikidataQueryService } from '@/services/WikidataQueryService';
import { SearchApiService } from '@/services/SearchApiService';
import { apiClient } from '@/services/ApiClient';
import { ConflictResolutionService } from '@/services/ConflictResolutionService';
vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
let view: ReturnType<typeof mount>;
const draft = { id: 'draft', wikidata_id: 'Q123', label: { fr: 'Brouillon conservé', en: '' }, date: 'M65' };
const imported = { label: 'Import réussi', date: '1944-06-06' };
const button = (label: string) => view.findAll('button').find(node => node.text() === label)!;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { resolve, promise }; }
async function start() {
  view = mount(EditModal, { props: { isOpen: true, type: 'event', mode: 'create', data: draft }, attachTo: document.body }); await flushPromises();
}
beforeEach(() => {
  setActivePinia(createPinia()); vi.spyOn(useUiStore(), 'notify').mockImplementation(({ show: vi.fn(), hide: vi.fn() }).show); vi.spyOn(useUiStore(), 'hideNotification').mockImplementation(({ show: vi.fn(), hide: vi.fn() }).hide);
  vi.mocked(apiClient.get).mockResolvedValue([]);
  vi.spyOn(CategoryService.getInstance(), 'getCategories').mockResolvedValue([]);
  vi.spyOn(WikidataQueryService.getInstance(), 'loadEvent').mockResolvedValue(imported);
  vi.spyOn(WikidataQueryService.getInstance(), 'getEntityClasses').mockResolvedValue([]);
  vi.spyOn(WikidataQueryService.getInstance(), 'getWikipediaTitles').mockResolvedValue(new Map());
});
afterEach(() => { view?.unmount(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('shows the import failure in the form, preserves its fields and provides a working retry', async () => {
  vi.mocked(WikidataQueryService.getInstance().loadEvent).mockRejectedValueOnce(new Error('Import hors ligne'));
  await start(); await button('Remplir avec Wikidata').trigger('click'); await flushPromises();
  expect(view.get('[role="alert"]').text()).toContain('Import hors ligne');
  expect((view.get('input[placeholder="Titre en français"]').element as HTMLInputElement).value).toBe('Brouillon conservé');
  await button('Réessayer l’import').trigger('click'); await flushPromises();
  expect(view.find('[role="alert"]').exists()).toBe(false);
  expect((view.get('input[placeholder="Titre en français"]').element as HTMLInputElement).value).toBe('Import réussi');
  expect(view.emitted('submit')).toBeUndefined();
});

it('blocks saving a pending import and lets cancellation dismiss it without a late update', async () => {
  const pending = deferred<any>(); vi.mocked(WikidataQueryService.getInstance().loadEvent).mockReturnValue(pending.promise);
  await start(); await button('Remplir avec Wikidata').trigger('click');
  expect(button('Créer').attributes('disabled')).toBeDefined();
  await view.get('form').trigger('submit'); expect(view.emitted('submit')).toBeUndefined();
  await button('Annuler').trigger('click'); expect(view.emitted('close')).toHaveLength(1);
  pending.resolve(imported); await flushPromises();
  expect((view.get('input[placeholder="Titre en français"]').element as HTMLInputElement).value).toBe('Brouillon conservé');
});

it('does not overwrite a new modal draft when an earlier import completes', async () => {
  const pending = deferred<any>(); vi.mocked(WikidataQueryService.getInstance().loadEvent).mockReturnValue(pending.promise);
  await start(); await button('Remplir avec Wikidata').trigger('click');
  await view.setProps({ data: { ...draft, id: 'new', wikidata_id: 'Q456', label: { fr: 'Nouveau brouillon', en: '' } } });
  pending.resolve(imported); await flushPromises();
  expect((view.get('input[placeholder="Titre en français"]').element as HTMLInputElement).value).toBe('Nouveau brouillon');
  expect((view.get('input[placeholder="Q12345"]').element as HTMLInputElement).value).toBe('Q456');
});

it('shows a label-search failure in its dropdown and retries without reporting it as empty', async () => {
  vi.spyOn(SearchApiService.getInstance(), 'searchWikidataEntityLabels').mockRejectedValueOnce(new Error('Recherche indisponible')).mockResolvedValueOnce([{ id: 'Q123', label: 'Résultat chargé' }]);
  await start(); vi.useFakeTimers();
  const input = view.get('input[aria-label="Recherche Wikidata"]');
  await input.trigger('focusin'); await input.setValue('Terre');
  await vi.advanceTimersByTimeAsync(280); await flushPromises();
  const dropdown = document.body.querySelector('.edit-modal-wd-dd')!;
  expect(dropdown.textContent).toContain('Recherche indisponible'); expect(dropdown.textContent).not.toContain('Aucun résultat');
  const retry = dropdown.querySelector('button')!; retry.click(); await flushPromises();
  expect(dropdown.textContent).toContain('Résultat chargé'); expect(dropdown.textContent).not.toContain('Recherche indisponible');
});

it('keeps the imported period usable with an unknown count and refreshes missing complements on retry', async () => {
  const period = { id: 'Q123', label: { fr: 'Période importée', en: '' }, temporalData: [{ startDate: 'M65', endDate: 'M8', location: '' }], children: [] };
  vi.spyOn(WikidataQueryService.getInstance(), 'loadPeriod').mockResolvedValueOnce({ ...period, childrenPreloaded: false, warnings: ['Nombre de sous-périodes indéterminé.'] } as any)
    .mockResolvedValueOnce({ ...period, childrenPreloaded: true } as any);
  vi.spyOn(WikidataQueryService.getInstance(), 'getPartOfParentQid').mockResolvedValue(null);
  view = mount(EditModal, { props: { isOpen: true, type: 'period', mode: 'create', data: { ...draft, start_date: 'M65' } }, attachTo: document.body });
  await flushPromises(); await button('Remplir avec Wikidata').trigger('click'); await flushPromises();
  expect(view.text()).toContain('Nombre de sous-périodes inconnu');
  expect(view.text()).not.toContain('0 sous-périodes');
  expect((view.get('input[placeholder="Titre en français"]').element as HTMLInputElement).value).toBe('Période importée');
  await button('Réessayer les compléments').trigger('click'); await flushPromises();
  expect(WikidataQueryService.getInstance().loadPeriod).toHaveBeenLastCalledWith('Q123', expect.objectContaining({ force: true }));
  expect(view.text()).toContain('0 sous-périodes');
  expect(view.text()).not.toContain('Réessayer les compléments');
  expect(view.emitted('submit')).toBeUndefined();
});

it('keeps suggestions inside the modal and imports with arrows/Enter without submitting the form', async () => {
  vi.spyOn(SearchApiService.getInstance(), 'searchWikidataEntityLabels').mockResolvedValue([{ id: 'Q456', label: 'Terre' }]);
  await start(); vi.useFakeTimers();
  const input = view.get('input[aria-label="Recherche Wikidata"]'); input.element.focus(); await input.setValue('Terre');
  await vi.advanceTimersByTimeAsync(280); await flushPromises();
  const list = view.get('[role="listbox"]');
  expect(list.element.closest('[role="dialog"]')).toBe(view.get('[role="dialog"]').element);
  expect(input.attributes('aria-controls')).toBe(list.attributes('id'));
  await input.trigger('keydown', { key: 'ArrowDown' });
  expect(document.getElementById(input.attributes('aria-activedescendant')!)?.textContent).toContain('Terre');
  expect(document.activeElement).toBe(input.element);
  await input.trigger('keydown', { key: 'Enter' }); await flushPromises();
  expect(WikidataQueryService.getInstance().loadEvent).toHaveBeenCalledWith('Q456', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(view.emitted('submit')).toBeUndefined();
  expect(view.find('[role="listbox"]').exists()).toBe(false);
});

it('closes suggestions first, then the modal on the next Escape', async () => {
  vi.spyOn(SearchApiService.getInstance(), 'searchWikidataEntityLabels').mockResolvedValue([{ id: 'Q456', label: 'Terre' }]);
  await start(); vi.useFakeTimers(); const input = view.get('input[aria-label="Recherche Wikidata"]');
  input.element.focus(); await input.setValue('Terre'); await vi.advanceTimersByTimeAsync(280); await flushPromises();
  await input.trigger('keydown', { key: 'Escape' });
  expect(view.find('[role="listbox"]').exists()).toBe(false); expect(view.emitted('close')).toBeUndefined();
  await input.trigger('keydown', { key: 'Escape' }); expect(view.emitted('close')).toHaveLength(1);
});

it('places period search below the title and reuses a local period only after confirmation, even when Wikidata fails', async () => {
  vi.spyOn(SearchApiService.getInstance(), 'searchLocal').mockResolvedValue([{ id: 'local-period', type: 'period', label: { fr: 'Jurassique', en: '' }, dateLabel: 'M201 → M145', fromWikidata: false }]);
  vi.spyOn(SearchApiService.getInstance(), 'searchWikidataEntityLabels').mockRejectedValue(new Error('Wikidata indisponible'));
  view = mount(EditModal, { props: { isOpen: true, type: 'period', mode: 'create', allowExistingPeriods: true }, attachTo: document.body }); await flushPromises();
  vi.useFakeTimers();
  const input = view.get('input[aria-label="Rechercher une période"]');
  expect(input.element.closest('.modal-header-bottom')).not.toBeNull();
  expect(view.find('.modal-header__right').exists()).toBe(false);
  input.element.focus(); await input.setValue('Jurassique'); await vi.advanceTimersByTimeAsync(280); await flushPromises();
  expect(SearchApiService.getInstance().searchLocal).toHaveBeenCalledWith('Jurassique', { onlyPeriods: true, signal: expect.any(AbortSignal) });
  expect(view.get('[role="listbox"]').text()).toContain('Période existante');
  expect(view.text()).toContain('Wikidata indisponible');
  await input.trigger('keydown', { key: 'ArrowDown' }); await input.trigger('keydown', { key: 'Enter' }); await flushPromises();
  expect(view.find('form').exists()).toBe(false); expect(view.text()).toContain('Jurassique');
  expect(view.emitted('select-period')).toBeUndefined(); expect(view.emitted('submit')).toBeUndefined();
  await button('Ajouter à la frise').trigger('click');
  expect(view.emitted('select-period')).toEqual([['local-period']]); expect(view.emitted('submit')).toBeUndefined();
});

it('deduplicates Wikidata results already in the catalogue and excludes incompatible placements', async () => {
  vi.spyOn(SearchApiService.getInstance(), 'searchLocal').mockResolvedValue([
    { id: 'ancestor', wikidataId: 'Q1', type: 'period', label: { fr: 'Ancêtre', en: '' }, dateLabel: '', fromWikidata: false },
    { id: 'local', wikidataId: 'Q2', type: 'period', label: { fr: 'Période locale', en: '' }, dateLabel: '', fromWikidata: false },
  ]);
  vi.spyOn(SearchApiService.getInstance(), 'searchWikidataEntityLabels').mockResolvedValue([{ id: 'Q1', label: 'Ancêtre' }, { id: 'Q2', label: 'Période locale' }, { id: 'Q3', label: 'Autre résultat' }]);
  view = mount(EditModal, { props: { isOpen: true, type: 'period', mode: 'create', allowExistingPeriods: true, excludedPeriodIds: ['ancestor'] }, attachTo: document.body }); await flushPromises();
  vi.useFakeTimers(); const input = view.get('input[aria-label="Rechercher une période"]');
  await input.trigger('focusin'); await input.setValue('période'); await vi.advanceTimersByTimeAsync(280); await flushPromises();
  const options = view.findAll('[role="option"]');
  expect(options).toHaveLength(2); expect(options[0].text()).toContain('Période locale'); expect(options[1].text()).toContain('Autre résultat');
});

it('uses the shared event form with local and Wikidata search below the title and confirms reuse separately', async () => {
  vi.spyOn(SearchApiService.getInstance(), 'searchLocal').mockResolvedValue([
    { id: 'already-added', wikidataId: 'Q1', type: 'event', label: { fr: 'Déjà ajouté', en: '' }, dateLabel: '1940', fromWikidata: false },
    { id: 'event-local', wikidataId: 'Q2', type: 'event', label: { fr: 'Débarquement', en: '' }, dateLabel: '6 juin 1944', fromWikidata: false },
  ]);
  vi.spyOn(SearchApiService.getInstance(), 'searchWikidataEntityLabels').mockResolvedValue([{ id: 'Q1', label: 'Déjà ajouté' }, { id: 'Q2', label: 'Débarquement' }, { id: 'Q3', label: 'Autre événement' }]);
  view = mount(EditModal, { props: { isOpen: true, type: 'event', mode: 'create', allowExistingEvents: true, excludedEventIds: ['already-added'] }, attachTo: document.body }); await flushPromises();
  vi.useFakeTimers(); const input = view.get('input[aria-label="Rechercher un événement"]');
  expect(input.element.closest('.modal-header-bottom')).not.toBeNull();
  input.element.focus(); await input.setValue('Débarquement'); await vi.advanceTimersByTimeAsync(280); await flushPromises();
  expect(SearchApiService.getInstance().searchLocal).toHaveBeenCalledWith('Débarquement', { onlyEvents: true, signal: expect.any(AbortSignal) });
  expect(view.findAll('[role="option"]')).toHaveLength(2);
  expect(view.get('[role="listbox"]').attributes('aria-label')).toBe('Événements existants et Wikidata');
  await input.trigger('keydown', { key: 'ArrowDown' }); await input.trigger('keydown', { key: 'Enter' }); await flushPromises();
  expect(view.text()).toContain('Événement existant'); expect(view.text()).toContain('Débarquement');
  expect(view.find('form').exists()).toBe(false); expect(view.emitted('select-event')).toBeUndefined();
  await button('Ajouter à la frise').trigger('click');
  expect(view.emitted('select-event')).toEqual([['event-local']]); expect(view.emitted('submit')).toBeUndefined();
});

it('finds an existing event through its semantic QID despite no keyword match and a failed strict classifier', async () => {
  vi.spyOn(SearchApiService.getInstance(), 'searchLocal').mockResolvedValue([]);
  vi.spyOn(SearchApiService.getInstance(), 'searchWikidataEntityLabels').mockRejectedValue(new Error('Classification trop complexe'));
  vi.spyOn(SearchApiService.getInstance(), 'searchWikidataByMeaning').mockResolvedValue([{ id: 'Q43653', label: 'Apollo 11', searchOrigin: 'semantic', startDate: '1969-07-21' }]);
  vi.spyOn(SearchApiService.getInstance(), 'searchLocalByWikidataIds').mockResolvedValue([{ id: 'moon-event', wikidataId: 'Q43653', type: 'event', label: { fr: 'Premiers pas sur la Lune', en: '' }, date: '1969-07-21', dateLabel: '21 juillet 1969', fromWikidata: false }]);
  view = mount(EditModal, { props: { isOpen: true, type: 'event', mode: 'create', allowExistingEvents: true }, attachTo: document.body }); await flushPromises();
  vi.useFakeTimers(); const input = view.get('input[aria-label="Rechercher un événement"]');
  input.element.focus(); await input.setValue('premier homme à marcher sur la lune'); await vi.advanceTimersByTimeAsync(650); await flushPromises();
  const options = view.findAll('[role="option"]'); expect(options).toHaveLength(1);
  expect(options[0].text()).toContain('Premiers pas sur la Lune'); expect(options[0].text()).toContain('Événement existant');
  expect(view.text()).not.toContain('Classification trop complexe');
  await options[0].trigger('click'); await button('Ajouter à la frise').trigger('click');
  expect(view.emitted('select-event')).toEqual([['moon-event']]); expect(view.emitted('submit')).toBeUndefined();
});

describe('an event already in the base under another label', () => {
  const existing = { id: 'existing-event', wikidata_id: 'Q9', label: { fr: 'Débarquement de Normandie', en: '' }, date: '1944-06-06' };
  async function pickWikidataHit(excluded: string[] = []) {
    vi.spyOn(SearchApiService.getInstance(), 'searchLocal').mockResolvedValue([]);
    vi.spyOn(SearchApiService.getInstance(), 'searchWikidataEntityLabels').mockResolvedValue([{ id: 'Q9', label: 'Opération Overlord' }]);
    vi.spyOn(ConflictResolutionService.getInstance(), 'detectConflict').mockResolvedValue({ hasConflict: true, existingItem: existing } as never);
    view = mount(EditModal, { props: { isOpen: true, type: 'event', mode: 'create', allowExistingEvents: true, excludedEventIds: excluded }, attachTo: document.body }); await flushPromises();
    vi.useFakeTimers(); const input = view.get('input[aria-label="Rechercher un événement"]');
    input.element.focus(); await input.setValue('Overlord'); await vi.advanceTimersByTimeAsync(650); await flushPromises();
    await view.get('[role="option"]').trigger('click'); await flushPromises();
  }
  it('offers to add the existing event instead of importing a duplicate from Wikidata', async () => {
    await pickWikidataHit();
    expect(WikidataQueryService.getInstance().loadEvent).not.toHaveBeenCalled();
    expect(view.text()).toContain('Événement existant'); expect(view.text()).toContain('Débarquement de Normandie');
    await button('Ajouter à la frise').trigger('click');
    expect(view.emitted('select-event')).toEqual([['existing-event']]); expect(view.emitted('submit')).toBeUndefined();
  });
  it('says the event is already in the frise rather than proposing it again', async () => {
    await pickWikidataHit(['existing-event']);
    expect(view.get('.edit-modal__existing-notice').text()).toBe('Cet événement est déjà dans la frise.');
    expect(view.text()).not.toContain('Ajouter à la frise');
    expect(WikidataQueryService.getInstance().loadEvent).not.toHaveBeenCalled();
  });
  it('lets a manually typed duplicate Q-id switch to the existing event', async () => {
    vi.spyOn(ConflictResolutionService.getInstance(), 'detectConflict').mockResolvedValue({ hasConflict: true, existingItem: existing } as never);
    view = mount(EditModal, { props: { isOpen: true, type: 'event', mode: 'create', allowExistingEvents: true }, attachTo: document.body }); await flushPromises();
    const qid = view.get('input[placeholder="Q12345"]'); await qid.setValue('Q9'); await qid.trigger('blur'); await flushPromises();
    expect(view.text()).toContain('Ce Q-id existe déjà dans la base');
    await button('Utiliser l’événement existant').trigger('click');
    await button('Ajouter à la frise').trigger('click');
    expect(view.emitted('select-event')).toEqual([['existing-event']]);
  });
  it('keeps the duplicate error without a reuse action outside a frise', async () => {
    vi.spyOn(ConflictResolutionService.getInstance(), 'detectConflict').mockResolvedValue({ hasConflict: true, existingItem: existing } as never);
    view = mount(EditModal, { props: { isOpen: true, type: 'event', mode: 'create' }, attachTo: document.body }); await flushPromises();
    const qid = view.get('input[placeholder="Q12345"]'); await qid.setValue('Q9'); await qid.trigger('blur'); await flushPromises();
    expect(view.text()).toContain('Ce Q-id existe déjà dans la base');
    expect(button('Utiliser l’événement existant')).toBeUndefined();
  });
});

it('shows the date and keeps the description of existing items, and dates Wikidata results', async () => {
  vi.spyOn(SearchApiService.getInstance(), 'searchLocal').mockResolvedValue([
    { id: 'event-local', wikidataId: 'Q2', type: 'event', label: { fr: 'Débarquement', en: '' }, dateLabel: '6 juin 1944', description: 'Opération alliée en Normandie', fromWikidata: false },
  ]);
  vi.spyOn(SearchApiService.getInstance(), 'searchWikidataEntityLabels').mockResolvedValue([{ id: 'Q39671', label: 'Stonehenge', description: 'monument mégalithique', startDate: '-3000' }]);
  view = mount(EditModal, { props: { isOpen: true, type: 'event', mode: 'create', allowExistingEvents: true }, attachTo: document.body }); await flushPromises();
  vi.useFakeTimers(); const input = view.get('input[aria-label="Rechercher un événement"]');
  input.element.focus(); await input.setValue('Débarquement'); await vi.advanceTimersByTimeAsync(280); await flushPromises();
  const [local, remote] = view.findAll('[role="option"]');
  expect(local.get('.edit-modal-wd-dd__date').text()).toBe('6 juin 1944');
  expect(local.get('.edit-modal-wd-dd__desc').text()).toBe('Opération alliée en Normandie');
  expect(remote.get('.edit-modal-wd-dd__date').text()).not.toBe('');
  expect(remote.get('.edit-modal-wd-dd__desc').text()).toBe('monument mégalithique');
  await local.trigger('click');
  expect(view.get('.edit-modal__existing-date').text()).toBe('6 juin 1944');
  expect(view.text()).toContain('Opération alliée en Normandie');
});
