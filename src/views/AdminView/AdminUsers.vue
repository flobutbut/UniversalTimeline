<template>
  <section class="admin-users" aria-labelledby="admin-users-title">
    <header class="admin-users__header">
      <h2 id="admin-users-title">Utilisateurs</h2>
      <p v-if="users" class="admin-users__meta" role="status">{{ visible.length }} compte(s) affiché(s) sur {{ users.length }}</p>
    </header>
    <div class="admin-users__filters">
      <SearchInput v-model="query" placeholder="Rechercher un nom ou une adresse" class="admin-users__search" />
      <Select v-model="filter" label="Afficher" :options="filterOptions" class="admin-users__filter" />
    </div>
    <FeedbackState v-if="loading && !users" kind="loading" layout="inline" />
    <FeedbackState v-else-if="error && !users" kind="error" layout="inline" :message="error" retryable @retry="load" />
    <FeedbackState v-else-if="users && !visible.length" kind="empty" layout="inline" message="Aucun compte ne correspond." />
    <div v-else-if="users" class="admin-users__scroll" role="region" aria-label="Liste des utilisateurs" tabindex="0">
      <table class="admin-users__table">
        <thead>
          <tr><th scope="col">Utilisateur</th><th scope="col">Inscription</th><th scope="col">Dernière connexion</th><th scope="col">Frises</th><th scope="col">Statut</th></tr>
        </thead>
        <tbody>
          <tr v-for="user in visible" :key="user.id">
            <th scope="row">
              <RouterLink class="admin-users__identity" :to="{ name: 'admin', query: { section: 'users', user: user.id } }">
                <UserAvatar :username="user.username" :color="user.avatarColor ?? undefined" :icon="user.avatarIcon ?? undefined" size="sm" />
                <span><span class="admin-users__name">{{ user.username ?? 'Sans nom d’utilisateur' }}</span><span class="admin-users__email">{{ user.email ?? '—' }}</span></span>
              </RouterLink>
            </th>
            <td>{{ formatAdminDate(user.createdAt) }}</td>
            <td>{{ formatAdminDate(user.lastSignInAt) }}</td>
            <td>{{ user.stories }}<span v-if="user.stories" class="admin-users__muted"> ({{ user.publicStories }} publiques)</span></td>
            <td><span class="admin-users__tags"><Tag v-for="status in statuses(user)" :key="status" :label="status" :variant="status === 'Admin' ? 'accent' : 'neutral'" /></span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import FeedbackState from '@/components/base/FeedbackState.vue';
import SearchInput from '@/components/base/SearchInput.vue';
import Select from '@/components/base/Select.vue';
import Tag from '@/components/base/Tag.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import { adminApi, type AdminUser } from '@/services/AdminApiService';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import type { SelectValue } from '@/lib/selectOptions';
import { formatAdminDate } from './adminFormat';

type Filter = 'all' | 'admins' | 'editors' | 'creators' | 'unconfirmed' | 'suspended' | 'no-profile';
const filterOptions: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous les comptes' }, { value: 'creators', label: 'Avec des frises' }, { value: 'admins', label: 'Administrateurs' },
  { value: 'editors', label: 'Éditeurs' },
  { value: 'unconfirmed', label: 'Adresse non confirmée' }, { value: 'suspended', label: 'Suspendus' }, { value: 'no-profile', label: 'Sans nom d’utilisateur' },
];
const users = ref<AdminUser[] | null>(null); const loading = ref(false); const error = ref('');
const query = ref(''); const filter = ref<SelectValue>('all');
let request = 0;
onBeforeUnmount(() => { request++; });
async function load() {
  const current = ++request; loading.value = true; error.value = '';
  try { const next = await adminApi.users(); if (current === request) users.value = next; }
  catch (cause) { if (current === request) error.value = mutationErrorMessage(cause, 'Lecture des utilisateurs impossible.'); }
  finally { if (current === request) loading.value = false; }
}
onMounted(load);

const matchesFilter: Record<Filter, (user: AdminUser) => boolean> = {
  all: () => true, admins: user => user.isAdmin, editors: user => user.isEditor === true, creators: user => user.stories > 0,
  unconfirmed: user => !user.confirmed, suspended: user => user.suspended, 'no-profile': user => !user.username,
};
const visible = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase('fr');
  const keep = matchesFilter[(filter.value as Filter) ?? 'all'] ?? matchesFilter.all;
  return (users.value ?? []).filter(user => keep(user)
    && (!needle || [user.username, user.email].some(value => value?.toLocaleLowerCase('fr').includes(needle))));
});
function statuses(user: AdminUser): string[] {
  return [user.isAdmin && 'Admin', user.isEditor && 'Éditeur', user.suspended && 'Suspendu', !user.confirmed && 'Non confirmé', !user.username && 'Sans profil']
    .filter((value): value is string => !!value);
}
</script>

<style scoped>
.admin-users { display: flex; flex-direction: column; gap: var(--spacing-lg); min-width: 0; }
.admin-users h2 { margin: 0; font-size: var(--font-size-2xl); }
.admin-users__header { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.admin-users__meta, .admin-users__muted, .admin-users__email { color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.admin-users__meta { margin: 0; }
.admin-users__filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--spacing-md); }
.admin-users__search { flex: 1 1 240px; }
.admin-users__filter { flex: 0 1 240px; }
.admin-users__scroll { overflow-x: auto; border: 1px solid var(--color-border-default); border-radius: var(--radius-md); background: var(--color-surface-default); }
.admin-users__scroll:focus-visible { outline: 2px solid var(--color-text-link); outline-offset: 2px; }
.admin-users__table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.admin-users__table th, .admin-users__table td { padding: var(--spacing-sm) var(--spacing-md); border-bottom: 1px solid var(--color-border-default); text-align: left; vertical-align: middle; white-space: nowrap; }
.admin-users__table thead th { color: var(--color-text-secondary); font-weight: var(--font-weight-semibold); }
.admin-users__table tbody tr:last-child > * { border-bottom: 0; }
.admin-users__table tbody th { font-weight: normal; }
.admin-users__identity { display: flex; align-items: center; gap: var(--spacing-sm); text-decoration: none; color: inherit; }
.admin-users__identity > span { display: flex; flex-direction: column; }
.admin-users__name { color: var(--color-text-link); font-weight: var(--font-weight-semibold); }
.admin-users__identity:hover .admin-users__name, .admin-users__identity:focus-visible .admin-users__name { text-decoration: underline; }
.admin-users__tags { display: inline-flex; flex-wrap: wrap; gap: var(--spacing-xs); }
</style>
