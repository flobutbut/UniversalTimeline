<template>
  <SidebarLayout menu-label="Administration" :items="menu" :active="section" class="admin-view">
    <AdminUserDetail v-if="section === 'users' && userId" :key="userId" :user-id="userId" />
    <AdminUsers v-else-if="section === 'users'" />
    <AdminDashboard v-else />
    <template #menu-footer>
      <RouterLink class="admin-view__extra" :to="{ name: 'design-system' }">
        <Icon icon="mdi:palette-swatch-outline" width="18" height="18" aria-hidden="true" />Design system
      </RouterLink>
    </template>
  </SidebarLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import SidebarLayout, { type SidebarItem } from '@/components/base/SidebarLayout.vue';
import AdminDashboard from './AdminDashboard.vue';
import AdminUsers from './AdminUsers.vue';
import AdminUserDetail from './AdminUserDetail.vue';

type Section = 'dashboard' | 'users';
const menu: SidebarItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'mdi:view-dashboard-outline', to: { name: 'admin' } },
  { key: 'users', label: 'Utilisateurs', icon: 'mdi:account-group-outline', to: { name: 'admin', query: { section: 'users' } } },
];
const route = useRoute();
const section = computed<Section>(() => route.query.section === 'users' ? 'users' : 'dashboard');
const userId = computed(() => typeof route.query.user === 'string' ? route.query.user : null);
</script>

<style scoped>
.admin-view :deep(.sidebar-layout__main) { max-width: 1040px; }
.admin-view { max-width: 1320px; }
.admin-view__extra {
  display: flex; align-items: center; gap: var(--spacing-sm); margin-top: var(--spacing-md); padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--color-border-default); color: var(--color-text-secondary); font-size: var(--font-size-sm); text-decoration: none;
}
.admin-view__extra:hover, .admin-view__extra:focus-visible { color: var(--color-text-primary); }
</style>
