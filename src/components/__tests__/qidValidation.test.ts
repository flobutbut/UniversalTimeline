import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import EditModal from '@/views/DatabaseView/EditModal.vue';
import { TagService } from '@/services/TagService';
import { ConflictResolutionService } from '@/services/ConflictResolutionService';
import { validateEntityQid } from '@/services/validateEntityQid';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
let view: ReturnType<typeof mount>;
const data = { id: 'self', wikidata_id: 'Q123', label: { fr: 'Terre', en: '' }, startDate: 'M65', endDate: 'NOW', categories: [], hasChildren: true, children: [] };
beforeEach(() => { setActivePinia(createPinia()); vi.spyOn(TagService.getInstance(), 'getTags').mockResolvedValue([]); });
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); });

it('rejects invalid Q-ids before any existence lookup', async () => {
  const lookup = vi.spyOn(ConflictResolutionService.getInstance(), 'detectConflict');
  for (const value of ['123', 'Q-1']) expect(await validateEntityQid(value, 'period')).toMatchObject({ isValid: false, exists: false });
  expect(lookup).not.toHaveBeenCalled();
});

it('validates an edit against its own identifier without a false duplicate error', async () => {
  const lookup = vi.spyOn(ConflictResolutionService.getInstance(), 'detectConflict').mockResolvedValue({ hasConflict: false, existingItem: data as any, conflictType: 'period', message: '' });
  view = mount(EditModal, { props: { isOpen: true, type: 'period', mode: 'edit', data } }); await flushPromises();
  await view.get('input[placeholder="Q12345"]').trigger('blur'); await flushPromises();
  expect(lookup).toHaveBeenCalledExactlyOnceWith('Q123', 'period', 'self');
  expect(view.text()).not.toContain('Ce Q-id existe déjà');
});

it('ignores an old validation when the draft changes even if the Q-id stays the same', async () => {
  let resolve!: (value: any) => void;
  vi.spyOn(ConflictResolutionService.getInstance(), 'detectConflict').mockReturnValue(new Promise(yes => { resolve = yes; }));
  view = mount(EditModal, { props: { isOpen: true, type: 'period', mode: 'edit', data } }); await flushPromises();
  await view.get('input[placeholder="Q12345"]').trigger('blur');
  await view.setProps({ data: { ...data, id: 'new-draft' } });
  resolve({ hasConflict: true, existingItem: data, conflictType: 'period', message: 'Ancien conflit' }); await flushPromises();
  expect(view.text()).not.toContain('Ce Q-id existe déjà');
});

it.each([true, false, undefined])('does not turn an unknown child count into zero (hasChildren=%s)', async hasChildren => {
  view = mount(EditModal, { props: { isOpen: true, type: 'period', mode: 'edit', data: { ...data, hasChildren } } }); await flushPromises();
  expect(view.get('.children-count').text()).toBe(hasChildren === true ? 'Contient des sous-périodes' : hasChildren === false ? '0 sous-périodes' : 'Nombre de sous-périodes inconnu');
});
