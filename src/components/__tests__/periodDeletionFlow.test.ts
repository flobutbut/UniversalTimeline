import { useUiStore } from '@/stores/useUiStore';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PeriodsView from '@/views/GraphView/Periods.vue';
import EditModal from '@/views/DatabaseView/EditModal.vue';
import UiFeedbackHost from '@/components/UiFeedbackHost.vue';
import { apiClient } from '@/services/ApiClient';
import { CategoryService } from '@/services/CategoryService';
import { WikidataQueryService } from '@/services/WikidataQueryService';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn(), delete: vi.fn() } }));
const toast = { show: vi.fn(), hide: vi.fn() };
let view: ReturnType<typeof mount>;
let confirm: ReturnType<typeof mount>;

beforeEach(async () => {
  vi.resetAllMocks(); setActivePinia(createPinia()); vi.spyOn(useUiStore(), 'notify').mockImplementation((toast).show); vi.spyOn(useUiStore(), 'hideNotification').mockImplementation((toast).hide);
  vi.spyOn(CategoryService.getInstance(), 'getCategories').mockResolvedValue([]);
  vi.spyOn(WikidataQueryService.getInstance(), 'loadPeriodChildrenByWikidataId').mockResolvedValue([]);
  vi.mocked(apiClient.get).mockImplementation(async url => {
    if (url === '/periods/leaf/children') return [] as any;
    if (url === '/periods/leaf') return { id: 'leaf', wikidata_id: 'Q123', label_fr: 'Période de test', start_date: 'M65', end_date: 'NOW', parent_id: null, categories: [] } as any;
    if (url === '/periods') return [{ id: 'leaf', wikidata_id: 'Q123', label_fr: 'Période de test', start_date: 'M65', end_date: 'NOW', parent_id: null, categories: [] }] as any;
    throw new Error(`Unexpected API request ${url}`);
  });
  confirm = mount(UiFeedbackHost, { attachTo: document.body });
  view = mount(PeriodsView, { attachTo: document.body });
  await flushPromises();
  await view.get('.table-row').trigger('mouseenter');
  await view.findAll('button').find(button => button.text() === 'Modifier')!.trigger('click');
  await flushPromises();
});
afterEach(() => { view?.unmount(); confirm?.unmount(); vi.restoreAllMocks(); });

async function requestDeletion() {
  await view.getComponent(EditModal).findAll('button').find(button => button.text() === 'Supprimer')!.trigger('click');
  await flushPromises();
  expect(new DOMWrapper(document.body).get('[role="alertdialog"]').text()).toContain('Confirmation de suppression');
}

it('opens the real confirmation from Graph > Edit > Supprimer and cancels without a request', async () => {
  await requestDeletion();
  await new DOMWrapper(document.body).get('[role="alertdialog"]').findAll('button').find(button => button.text() === 'Annuler')!.trigger('click');
  await flushPromises();
  expect(apiClient.delete).not.toHaveBeenCalled();
  expect(view.findComponent(EditModal).exists()).toBe(true);
  expect(view.get('.table-row').text()).toContain('Période de test');
});

it('keeps the edit form and graph intact when the API refuses a linked period', async () => {
  vi.mocked(apiClient.delete).mockRejectedValue({ response: { status: 409, data: { error: 'Cette période possède 1 sous-période.' } } });
  await requestDeletion();
  await new DOMWrapper(document.body).get('[role="alertdialog"]').findAll('button').find(button => button.text() === 'Confirmer')!.trigger('click');
  await flushPromises();
  expect(toast.show).toHaveBeenLastCalledWith('Cette période possède 1 sous-période.', 'error', undefined);
  expect(view.findComponent(EditModal).exists()).toBe(true);
  expect(view.get('.table-row').text()).toContain('Période de test');
});

it('closes the edit form and removes the row and obsolete selection columns after success', async () => {
  vi.mocked(apiClient.delete).mockResolvedValue({ id: 'leaf', parent: null });
  expect(view.findAll('[role="table"]')).toHaveLength(1);
  await requestDeletion();
  await new DOMWrapper(document.body).get('[role="alertdialog"]').findAll('button').find(button => button.text() === 'Confirmer')!.trigger('click');
  await flushPromises();
  expect(apiClient.delete).toHaveBeenCalledWith('/periods/leaf');
  expect(view.findComponent(EditModal).exists()).toBe(false);
  expect(view.findAll('.table-row')).toHaveLength(0);
  expect(view.findAll('[role="table"]')).toHaveLength(1);
  expect(toast.show).toHaveBeenLastCalledWith('Élément supprimé avec succès', 'success', undefined);
});

it('disables destructive and save actions while confirmation is pending', async () => {
  await requestDeletion();
  const modal = view.getComponent(EditModal);
  expect(modal.findAll('button').find(button => button.text() === 'Supprimer')!.attributes('disabled')).toBeDefined();
  expect(modal.findAll('button').find(button => button.text() === 'Mettre à jour')!.attributes('disabled')).toBeDefined();
  await new DOMWrapper(document.body).get('[role="alertdialog"]').findAll('button').find(button => button.text() === 'Annuler')!.trigger('click');
  await flushPromises();
});
