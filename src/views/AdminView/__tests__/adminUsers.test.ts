import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import AdminUsers from '../AdminUsers.vue';
import { adminApi, type AdminUser } from '@/services/AdminApiService';
import { useUiStore } from '@/stores/useUiStore';
import { useAuthStore } from '@/stores/useAuthStore';
import CatalogueBulkBar from '@/components/catalogue/CatalogueBulkBar.vue';

const user = (id: string, username: string | null, stories: number, createdAt: string, lastSignInAt: string | null): AdminUser => ({
  id, username, stories, createdAt, lastSignInAt, email: `${id}@example.test`, avatarColor: null, avatarIcon: null,
  publicStories: 0, confirmed: true, suspended: false, isAdmin: false,
});
const users = [
  { ...user('zeta', 'Zeta', 0, '2023-01-01', null), suspended: true },
  { ...user('beta', 'Beta', 10, '2019-01-01', '2025-01-01'), isAdmin: true },
  { ...user('alpha', 'Alpha', 2, '2021-01-01', '2026-01-01'), isEditor: true },
  user('unknown', null, 1, 'invalid', 'invalid'),
];
let view: ReturnType<typeof mount>;
const router = () => createRouter({ history: createMemoryHistory(), routes: [{ path: '/admin', name: 'admin', component: AdminUsers }] });
let navigation: ReturnType<typeof router>;
const ids = () => view.findAll('.table-row .admin-users__email').map(cell => cell.text().split('@')[0]);
beforeEach(async () => {
  vi.spyOn(adminApi, 'users').mockResolvedValue(users);
  navigation = router(); await navigation.push('/admin'); await navigation.isReady();
  view = mount(AdminUsers, { global: { plugins: [createPinia(), navigation] } }); await flushPromises();
});
afterEach(() => { view.unmount(); navigation.options.history.destroy(); vi.restoreAllMocks(); });

it.each([
  ['utilisateur', ['alpha', 'beta', 'zeta', 'unknown'], ['zeta', 'beta', 'alpha', 'unknown']],
  ['inscription', ['beta', 'alpha', 'zeta', 'unknown'], ['zeta', 'alpha', 'beta', 'unknown']],
  ['dernière connexion', ['beta', 'alpha', 'zeta', 'unknown'], ['alpha', 'beta', 'zeta', 'unknown']],
  ['nombre de frises', ['zeta', 'unknown', 'alpha', 'beta'], ['beta', 'alpha', 'unknown', 'zeta']],
  ['statut', ['beta', 'alpha', 'unknown', 'zeta'], ['zeta', 'unknown', 'alpha', 'beta']],
])('sorts users by %s in both directions, with missing dates and names last', async (label, ascending, descending) => {
  const button = view.get(`button[aria-label="Trier par ${label}"]`);
  await button.trigger('click'); expect(ids()).toEqual(ascending);
  expect(button.element.closest('[role="columnheader"]')?.getAttribute('aria-sort')).toBe('ascending');
  await button.trigger('click'); expect(ids()).toEqual(descending);
  expect(button.element.closest('[role="columnheader"]')?.getAttribute('aria-sort')).toBe('descending');
  expect(users.map(user => user.id)).toEqual(['zeta', 'beta', 'alpha', 'unknown']);
});

it('keeps the selected sort while filtering and clearing the search', async () => {
  await view.get('button[aria-label="Trier par nombre de frises"]').trigger('click');
  const search = view.get('input[placeholder="Rechercher un nom ou une adresse"]');
  await search.setValue('alpha'); expect(ids()).toEqual(['alpha']);
  await search.setValue(''); expect(ids()).toEqual(['zeta', 'unknown', 'alpha', 'beta']);
});

it('excludes admins and the connected account from selection, including Select all', async () => {
  useAuthStore().account = { id: 'alpha', isAdmin: true }; await flushPromises();
  expect(view.get('[data-item-id="beta"] input').attributes('disabled')).toBeDefined();
  expect(view.get('[data-item-id="alpha"] input').attributes('disabled')).toBeDefined();
  await view.get('input[aria-label="Tout sélectionner dans les lignes affichées"]').setValue(true);
  expect(view.getComponent(CatalogueBulkBar).props('count')).toBe(2);
});

it('deletes selected accounts only after one confirmation and updates the list', async () => {
  const deletion = vi.spyOn(adminApi, 'deleteUser').mockResolvedValue(undefined);
  await view.get('[data-item-id="alpha"] input').setValue(true);
  view.getComponent(CatalogueBulkBar).vm.$emit('apply', 'delete'); await flushPromises();
  expect(deletion).not.toHaveBeenCalled();
  const ui = useUiStore(); expect(ui.confirmation?.message).toContain('frises');
  ui.settleConfirmation(ui.confirmation!.id, true); await flushPromises();
  expect(deletion).toHaveBeenCalledExactlyOnceWith('alpha'); expect(ids()).not.toContain('alpha');
});

it('suspends and reactivates the selected accounts without changing their roles', async () => {
  const suspend = vi.spyOn(adminApi, 'setSuspended').mockResolvedValue(undefined);
  for (const action of ['suspend', 'reactivate'] as const) {
    await view.get('[data-item-id="alpha"] input').setValue(true);
    view.getComponent(CatalogueBulkBar).vm.$emit('apply', action); await flushPromises();
    const ui = useUiStore(); ui.settleConfirmation(ui.confirmation!.id, true); await flushPromises();
    expect(suspend).toHaveBeenLastCalledWith('alpha', action === 'suspend');
  }
});
