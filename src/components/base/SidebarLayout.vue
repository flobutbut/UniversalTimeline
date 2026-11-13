<template>
  <div class="sidebar-layout">
    <nav class="sidebar-layout__menu" :aria-label="uiText(menuLabel)">
      <RouterLink v-for="item in items" :key="item.key" :to="item.to" class="sidebar-layout__link"
        :class="{ 'sidebar-layout__link--active': item.key === active }" :aria-current="item.key === active ? 'page' : undefined">
        <Icon v-if="item.icon" :icon="item.icon" width="18" height="18" aria-hidden="true" />{{ uiText(item.label) }}
      </RouterLink>
      <slot name="menu-footer" />
    </nav>
    <div class="sidebar-layout__main"><slot /></div>
  </div>
</template>

<script setup lang="ts">
import { uiText } from "@/i18n";
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import { Icon } from '@iconify/vue';

export interface SidebarItem { key: string; label: string; to: RouteLocationRaw; icon?: string }
defineProps<{ menuLabel: string; items: SidebarItem[]; active: string }>();
</script>

<style scoped>
/* Menu à gauche, contenu dans une colonne principale ; le menu passe au-dessus sur petit écran. */
.sidebar-layout {
  display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: var(--spacing-xl);
  width: 100%; max-width: 1040px; margin: 0 auto; padding: var(--spacing-xl) var(--spacing-lg); box-sizing: border-box; overflow: auto;
}
.sidebar-layout__menu { display: flex; flex-direction: column; gap: var(--spacing-xs); align-self: start; position: sticky; top: 0; }
.sidebar-layout__link {
  display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md); color: var(--color-text-secondary); font-size: var(--font-size-sm); text-decoration: none;
}
.sidebar-layout__link:hover { background: var(--color-interaction-hover); color: var(--color-text-primary); }
.sidebar-layout__link--active { background: var(--color-surface-default); color: var(--color-text-link); font-weight: var(--font-weight-semibold); }
.sidebar-layout__main { display: flex; flex-direction: column; gap: var(--spacing-lg); min-width: 0; max-width: 720px; }
@media (max-width: 720px) {
  .sidebar-layout { grid-template-columns: minmax(0, 1fr); gap: var(--spacing-lg); padding: var(--spacing-lg) var(--spacing-md); }
  .sidebar-layout__menu { flex-direction: row; flex-wrap: wrap; position: static; }
}
</style>
