<template>
  <section class="admin-users" aria-labelledby="admin-users-title">
    <header class="admin-users__header">
      <h2 id="admin-users-title">{{ uiText("Utilisateurs") }}</h2>
      <p v-if="users" class="admin-users__meta" role="status">{{ visible.length }} {{ uiText("compte(s) affiché(s) sur") }} {{ users.length }}</p>
    </header>
    <div class="admin-users__filters">
      <SearchInput v-model="query" :placeholder="uiText('Rechercher un nom ou une adresse')" class="admin-users__search" />
      <Select v-model="filter" :label="uiText('Afficher')" :options="filterOptions" class="admin-users__filter" />
    </div>
    <FeedbackState v-if="loading && !users" kind="loading" layout="inline" />
    <FeedbackState v-else-if="error && !users" kind="error" layout="inline" :message="uiText(error)" retryable @retry="load" />
    <template v-else-if="users">
      <CatalogueBulkBar :count="bulk.selected.value.length" :actions="bulkActions" :busy="bulk.busy.value" :message="uiText(bulk.message.value)" :failures="bulk.failures.value" :uncertain="bulk.uncertain.value" @apply="bulk.run" @clear="bulk.selectedIds.value = []" @reload="bulk.reload" />
      <p class="admin-users__meta">{{ uiText("Les administrateurs et votre propre compte sont exclus des actions groupées.") }}</p>
      <CatalogueTable v-model:selected-ids="bulk.selectedIds.value" :label="uiText('Utilisateurs')" :columns="columns" :items="visible" empty-text="Aucun compte ne correspond." selectable :can-select="canSelectUser" :item-label="user => user.username || user.email || user.id" :selection-disabled="bulk.busy.value || bulk.uncertain.value" :sort-column="sortColumn" :sort-dir="sortDir" @sort="toggleSort($event as SortColumn)">
        <template #row="{ item: user }">
          <span role="cell">
            <RouterLink class="admin-users__identity" :to="{ name: 'admin', query: { section: 'users', user: user.id } }">
              <UserAvatar :username="user.username" :color="user.avatarColor ?? undefined" :icon="user.avatarIcon ?? undefined" size="sm" />
              <span><span class="admin-users__name">{{ uiText(user.username ?? 'Sans nom d’utilisateur') }}</span><span class="admin-users__email">{{ uiText(user.email ?? '—') }}</span></span>
            </RouterLink>
          </span>
          <span role="cell">{{ formatAdminDate(user.createdAt) }}</span>
          <span role="cell">{{ formatAdminDate(user.lastSignInAt) }}</span>
          <span role="cell">{{ user.stories }}<span v-if="user.stories" class="admin-users__muted"> ({{ user.publicStories }} {{ uiText("publiques)") }}</span></span>
          <span role="cell" class="admin-users__tags"><Tag v-for="status in statuses(user)" :key="status" :label="uiText(status)" :variant="status === 'Admin' ? 'accent' : 'neutral'" /></span>
        </template>
      </CatalogueTable>
    </template>
  </section>
</template>

<script setup lang="ts">
import { language, uiText } from '@/i18n';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import CatalogueTable from '@/components/catalogue/CatalogueTable.vue';
import CatalogueBulkBar from '@/components/catalogue/CatalogueBulkBar.vue';
import type { CatalogueColumn } from '@/components/catalogue/columns';
import { useCatalogueBulkActions, type CatalogueBulkAction } from '@/composables/useCatalogueBulkActions';
import { useAuthStore } from '@/stores/useAuthStore';
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
type SortColumn = 'username' | 'createdAt' | 'lastSignInAt' | 'stories' | 'status';
const columns: (CatalogueColumn & { key: SortColumn })[] = [
  { key: 'username', label: 'Utilisateur', sortLabel: 'Trier par utilisateur', width: 260, minWidth: 160 },
  { key: 'createdAt', label: 'Inscription', sortLabel: 'Trier par inscription', width: 140 },
  { key: 'lastSignInAt', label: 'Dernière connexion', sortLabel: 'Trier par dernière connexion', width: 170 },
  { key: 'stories', label: 'Frises', sortLabel: 'Trier par nombre de frises', width: 150 },
  { key: 'status', label: 'Statut', sortLabel: 'Trier par statut', width: 180 },
];
const sortColumn = ref<SortColumn | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');
function toggleSort(column: SortColumn) {
  sortDir.value = sortColumn.value === column && sortDir.value === 'asc' ? 'desc' : 'asc';
  sortColumn.value = column;
}
function sortValue(user: AdminUser, column: SortColumn): string | number | null {
  if (column === 'status') return statuses(user).join(', ');
  if (column === 'createdAt' || column === 'lastSignInAt') {
    const raw = user[column];
    const value = raw ? Date.parse(raw) : NaN;
    return Number.isFinite(value) ? value : null;
  }
  return user[column];
}
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
  const needle = query.value.trim().toLocaleLowerCase(language.value);
  const keep = matchesFilter[(filter.value as Filter) ?? 'all'] ?? matchesFilter.all;
  const rows = (users.value ?? []).filter(user => keep(user)
    && (!needle || [user.username, user.email].some(value => value?.toLocaleLowerCase(language.value).includes(needle))));
  const column = sortColumn.value;
  if (!column) return rows;
  return rows.sort((a, b) => {
    const left = sortValue(a, column), right = sortValue(b, column);
    if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
    const comparison = typeof left === 'number' && typeof right === 'number'
      ? left - right : String(left).localeCompare(String(right), language.value, { sensitivity: 'base', numeric: true });
    return sortDir.value === 'asc' ? comparison : -comparison;
  });
});
const auth = useAuthStore();
const canSelectUser = (user: AdminUser) => !user.isAdmin && user.id !== auth.account?.id;
const bulkActions: { value: CatalogueBulkAction; label: string }[] = [
  { value: 'suspend', label: 'Suspendre les comptes' }, { value: 'reactivate', label: 'Réactiver les comptes' },
  { value: 'export', label: 'Exporter en CSV' }, { value: 'delete', label: 'Supprimer les comptes' },
];
const bulk = useCatalogueBulkActions({
  items: () => visible.value, label: 'Utilisateurs', itemLabel: user => user.username || user.email || user.id, canSelect: canSelectUser,
  deleteItem: async user => { await adminApi.deleteUser(user.id); users.value = users.value?.filter(row => row.id !== user.id) ?? []; },
  suspend: async (user, suspended) => { await adminApi.setSuspended(user.id, suspended); users.value = users.value?.map(row => row.id === user.id ? { ...row, suspended } : row) ?? []; },
  reload: async () => { const next = await adminApi.users(); users.value = next; },
  csvRow: user => ({ ID: user.id, Utilisateur: user.username, Email: user.email, Inscription: user.createdAt, 'Dernière connexion': user.lastSignInAt, Frises: user.stories, Statut: statuses(user).join(', ') }),
});

function statuses(user: AdminUser): string[] {
  return [user.isAdmin && 'Admin', user.isEditor && 'Éditeur', user.suspended && 'Suspendu', !user.confirmed && 'Non confirmé', !user.username && 'Sans profil']
    .filter((value): value is string => !!value);
}
</script>

<style scoped>
.admin-users { display: flex; flex-direction: column; gap: var(--spacing-lg); min-width: 0; }
.admin-users :deep(.table-wrap) { flex: 0 0 auto; min-height: 200px; max-height: 65vh; }
.admin-users h2 { margin: 0; font-size: var(--font-size-2xl); }
.admin-users__header { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.admin-users__meta, .admin-users__muted, .admin-users__email { color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.admin-users__meta { margin: 0; }
.admin-users__filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--spacing-md); }
.admin-users__search { flex: 1 1 240px; }
.admin-users__filter { flex: 0 1 240px; }
.admin-users__identity { display: flex; align-items: center; gap: var(--spacing-sm); text-decoration: none; color: inherit; }
.admin-users__identity > span { display: flex; flex-direction: column; min-width: 0; }
.admin-users__name, .admin-users__email { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.admin-users__name { color: var(--color-text-link); font-weight: var(--font-weight-semibold); }
.admin-users__identity:hover .admin-users__name, .admin-users__identity:focus-visible .admin-users__name { text-decoration: underline; }
.admin-users__tags { display: inline-flex; flex-wrap: wrap; gap: var(--spacing-xs); }
</style>
