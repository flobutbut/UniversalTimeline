<template>
  <SidebarLayout menu-label="Administration" :items="menu" :active="section" class="admin-view" :class="{'admin-view--relations':section==='relations'||section==='timelines', 'admin-view--catalogue':section==='periods'||section==='events'}">
    <PeriodsView v-if="section==='periods'" />
    <EventsView v-else-if="section==='events'" />
    <AdminRelations v-else-if="section==='relations'" />
    <AdminTimelines v-else-if="section==='timelines'" />
    <AdminFeedback v-else-if="section==='feedback'" />
    <AdminUserDetail v-else-if="section === 'users' && userId" :key="userId" :user-id="userId" />
    <AdminUsers v-else-if="section === 'users'" />
    <AdminDashboard v-else />
    <template #menu-footer>
      <RouterLink class="admin-view__extra" :to="{ name: 'design-system' }">
        <Icon icon="mdi:palette-swatch-outline" width="18" height="18" aria-hidden="true" />{{ uiText("Design system") }} </RouterLink>
    </template>
  </SidebarLayout>
</template>

<script setup lang="ts">
import { uiText } from "@/i18n";
import { computed, defineAsyncComponent } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import SidebarLayout, { type SidebarItem } from '@/components/base/SidebarLayout.vue';
import AdminDashboard from './AdminDashboard.vue';
import AdminUsers from './AdminUsers.vue';
import AdminUserDetail from './AdminUserDetail.vue';
const AdminRelations = defineAsyncComponent(() => import('./AdminRelations.vue'));
const AdminTimelines = defineAsyncComponent(() => import('./AdminTimelines.vue'));
const AdminFeedback = defineAsyncComponent(() => import('./AdminFeedback.vue'));
const PeriodsView = defineAsyncComponent(() => import('@/views/GraphView/Periods.vue').then(module => module.default));
const EventsView = defineAsyncComponent(() => import('@/views/EventsView/EventsView.vue').then(module => module.default));

type Section = 'dashboard' | 'users' | 'relations' | 'timelines' | 'periods' | 'events' | 'feedback';
const menu: SidebarItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'mdi:view-dashboard-outline', to: { name: 'admin' } },
  { key: 'users', label: 'Utilisateurs', icon: 'mdi:account-group-outline', to: { name: 'admin', query: { section: 'users' } } },
  { key: 'feedback', label: 'Retours utilisateurs', icon: 'mdi:message-text-outline', to: { name: 'admin', query: { section: 'feedback' } } },
  { key: 'periods', label: 'Périodes', icon: 'mdi:chart-tree', to: { name: 'graph' } },
  { key: 'events', label: 'Événements', icon: 'mdi:calendar-clock', to: { name: 'events' } },
  { key:'relations',label:'Relations',icon:'mdi:graph-outline',to:{name:'admin',query:{section:'relations'}} },
  { key:'timelines',label:'Carte des frises',icon:'mdi:timeline-text-outline',to:{name:'admin',query:{section:'timelines'}} },
];
const route = useRoute();
const section = computed<Section>(() => route.name === 'graph' ? 'periods' : route.name === 'events' ? 'events' : route.query.section === 'feedback' ? 'feedback' : route.query.section === 'timelines' ? 'timelines' : route.query.section === 'relations' ? 'relations' : route.query.section === 'users' ? 'users' : 'dashboard');
const userId = computed(() => typeof route.query.user === 'string' ? route.query.user : null);
</script>

<style scoped>
.admin-view :deep(.sidebar-layout__main) { max-width: 1040px; }
.admin-view { max-width: 1320px; }
.admin-view--relations { max-width:1680px; }
.admin-view--relations :deep(.sidebar-layout__main) { max-width:none; }
.admin-view--catalogue { max-width: none; height: 100%; min-height: 0; overflow: hidden; }
.admin-view--catalogue :deep(.sidebar-layout__main) { max-width: none; min-height: 0; overflow: hidden; }
.admin-view__extra {
  display: flex; align-items: center; gap: var(--spacing-sm); margin-top: var(--spacing-md); padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--color-border-default); color: var(--color-text-secondary); font-size: var(--font-size-sm); text-decoration: none;
}
.admin-view__extra:hover, .admin-view__extra:focus-visible { color: var(--color-text-primary); }
</style>
