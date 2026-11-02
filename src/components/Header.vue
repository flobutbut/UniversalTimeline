<template>
  <header class="header">
    <div
      ref="contentRef"
      class="header-content"
      :class="{ 'header-content--no-search': currentView !== 'timeline' }"
    >
      <div ref="brandRef" class="header-brand">
        <RouterLink to="/" class="header-title header-title--wordmark" aria-label="Universal Timeline — accueil"><span class="header-title-full">Universal Timeline</span><span class="header-title-short" aria-hidden="true">UT</span></RouterLink>
      </div>
      <div v-if="currentView === 'timeline'" class="header-search-wrap">
        <GlobalSearch :key="auth.identityVersion" @select="emit('select-search', $event)" />
      </div>
      <div class="header-right">
        <div v-if="tabs.length" class="header-nav-wrap" :class="{ 'header-nav-wrap--collapsed': navCollapsed }" :inert="navCollapsed ? true : undefined" :aria-hidden="navCollapsed || undefined">
          <nav ref="navRef" class="header-nav" aria-label="Navigation principale">
            <RouterLink v-for="tab in tabs" :key="tab.value" :to="tab.value === 'timeline' && timelineDestination ? timelineDestination : { name: tab.value }" custom v-slot="{ href }">
              <a :href="href" class="header-nav-link" :class="{ 'tab-button--active': currentView === tab.value }" :aria-current="currentView === tab.value ? 'page' : undefined" @click="changeView($event, tab.value)">
                <DesignIcon v-if="tab.value === 'timeline' || tab.value === 'database'" :name="tab.value === 'database' ? 'frises' : 'timeline'" /><Icon v-else-if="tab.icon" :icon="tab.icon" aria-hidden="true" />{{ tab.label }}
              </a>
            </RouterLink>
          </nav>
        </div>
        <Select v-if="tabs.length && navCollapsed" class="header-nav-select" :model-value="currentView" :options="tabs" placeholder="Navigation principale" :searchable="false" compact @update:model-value="selectView" />
        <div ref="controlsRef" class="header-controls">
          <div v-if="!canUseWorkspace(auth)" class="header-account-actions">
            <Button :to="accountLocation(false)" variant="secondary" size="sm" aria-label="Se connecter" title="Se connecter"><span class="header-account-label">Se connecter</span><Icon class="header-account-icon" icon="mdi:login" width="18" height="18" aria-hidden="true" /></Button>
            <Button :to="accountLocation(true)" size="sm" aria-label="Créer un compte" title="Créer un compte"><span class="header-account-label">Créer un compte</span><Icon class="header-account-icon" icon="mdi:account-plus-outline" width="18" height="18" aria-hidden="true" /></Button>
          </div>
          <UserMenu v-else />
          <ThemeToggle variant="ghost" />
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import GlobalSearch from './GlobalSearch.vue';
import ThemeToggle from './ThemeToggle.vue';
import UserMenu from './UserMenu.vue';
import { Icon } from '@iconify/vue';
import Button from './base/Button.vue';
import DesignIcon from './base/DesignIcon.vue';
import Select from './base/Select.vue';
import type { SelectValue } from '@/lib/selectOptions';
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import { RouterLink, useRoute, type RouteLocationRaw } from 'vue-router';
import { useAuthStore } from '@/stores/useAuthStore';

import { navigationTabs, type NavigationView } from '@/router/navigation';
import { canUseWorkspace, safeReturnPath } from '@/router/access';
import type { StorySearchResult } from '@/services/SearchApiService';

const auth = useAuthStore(); const route = useRoute();
const tabs = computed(() => canUseWorkspace(auth) ? navigationTabs.filter(tab => tab.value !== 'design-system' || auth.isAdmin) : []);
function accountLocation(signup: boolean) {
  return { name: 'login', query: { ...(signup ? { mode: 'signup' } : {}), ...(route.query.redirect ? { redirect: safeReturnPath(route.query.redirect) } : {}) } };
}

const props = defineProps<{ currentView: NavigationView | ''; timelineDestination?: RouteLocationRaw }>();
const emit = defineEmits<{ (e: 'change-view', view: NavigationView): void; (e: 'select-search', hit: StorySearchResult): void }>();
const contentRef = ref<HTMLElement | null>(null);
const brandRef = ref<HTMLElement | null>(null);
const navRef = ref<HTMLElement | null>(null);
const controlsRef = ref<HTMLElement | null>(null);
const navCollapsed = ref(false);
let resizeObserver: ResizeObserver | undefined;

function updateNavigationLayout() {
  const content = contentRef.value;
  if (!content || !navRef.value || !brandRef.value || !controlsRef.value) return;
  const style = getComputedStyle(content);
  const gap = parseFloat(style.columnGap) || 0;
  const available = content.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
  // Conserver une recherche confortable avant de replier les onglets. Le nav
  // garde sa largeur intrinsèque, même masqué, pour pouvoir aussi se déplier.
  const hasSearch = props.currentView === 'timeline';
  const required = brandRef.value.offsetWidth + navRef.value.offsetWidth + controlsRef.value.offsetWidth
    + gap * (hasSearch ? 3 : 2) + (hasSearch ? 320 : 0);
  navCollapsed.value = available < required;
}

onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return;
  resizeObserver = new ResizeObserver(updateNavigationLayout);
  for (const element of [contentRef.value, brandRef.value, navRef.value, controlsRef.value]) {
    if (element) resizeObserver.observe(element);
  }
  updateNavigationLayout();
});
watch([tabs, () => props.currentView], () => {
  if (navRef.value) resizeObserver?.observe(navRef.value);
  updateNavigationLayout();
}, { flush: 'post' });
onScopeDispose(() => resizeObserver?.disconnect());

function selectView(value: SelectValue) {
  const tab = tabs.value.find(tab => tab.value === value);
  if (tab) emit('change-view', tab.value);
}
function changeView(event: MouseEvent, view: NavigationView) {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  emit('change-view', view);
}

</script>

<style scoped>
.header {
  flex-shrink: 0;
  box-sizing: border-box;
  min-height: 71px;
  display: flex;
  align-items: center;
  background-color: var(--color-surface-default);
  border-bottom: 1px solid var(--color-border-default);
  padding: var(--spacing-md) 0;
  width: 100%;
  position: sticky;
  top: 0;
  z-index: var(--z-index-sticky);
}

.header-content {
  --header-gap: var(--spacing-md);
  box-sizing: border-box;
  width: 100%;
  padding: 0 var(--spacing-lg);
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  column-gap: var(--header-gap);
}

.header-content--no-search {
  grid-template-columns: minmax(0, 1fr) auto;
}

.header-brand {
  justify-self: start;
  display: flex;
  align-items: center;
  min-height: 2rem;
  min-width: 0;
}

.header-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
  white-space: nowrap;
  line-height: var(--line-height-control);
  text-decoration: none;
}

.header-title--wordmark {
  font-family: var(--font-family-heading);
  font-weight: var(--font-weight-semibold);
}

.header-title-short { display: none; }

.header-title:hover {
  color: var(--color-text-link);
}

.header-right {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: var(--header-gap);
  min-width: 0;
}

.header-controls { display: flex; align-items: center; gap: var(--spacing-xs); flex-shrink: 0; }

.header-search-wrap {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  min-width: 0;
}

.header-search-wrap :deep(.search-bar) {
  min-width: 0;
}

.header-nav-wrap { flex-shrink: 0; }
.header-nav-wrap--collapsed { position: absolute; width: 0; height: 0; overflow: hidden; visibility: hidden; }
.header-nav { display: flex; width: max-content; flex-wrap: nowrap; gap: var(--spacing-xs); padding: var(--spacing-xs); background: var(--color-background-default); border-radius: var(--radius-lg); }
.header-nav-link { display: inline-flex; align-items: center; gap: var(--spacing-xs); padding: 6px var(--spacing-md); border-radius: var(--radius-md); font-size: var(--font-size-sm); font-weight: var(--font-weight-normal); line-height: var(--line-height-small); color: var(--color-text-secondary); white-space: nowrap; }
.header-nav-link:hover, .header-nav-link.tab-button--active { background: var(--color-surface-default); color: var(--color-text-link); }

.header-nav-select { width: 140px; flex-shrink: 0; }
.header-nav-select :deep(.base-select__dropdown) { left: auto; min-width: 180px; }
.header-search-wrap :deep(.gs__dropdown) { right: auto; width: max(100%, min(360px, calc(100vw - 80px))); }
.header-account-actions { display: flex; flex-wrap: nowrap; align-items: center; gap: var(--spacing-sm); }
.header-account-icon { display: none; }

@media (max-width: 600px) {
  .header-content { --header-gap: var(--spacing-sm); padding-inline: var(--spacing-md); }
  .header-title-full { display: none; }
  .header-title-short { display: inline; }
  .header-nav-select { width: 110px; }
  .header-account-label { display: none; }
  .header-account-icon { display: block; }
  .header-account-actions :deep(.base-button) { width: var(--field-height-md); padding: 0; }
  .header-account-actions :deep(.base-button__text) { padding: 0; }
}

@media (max-width: 380px) {
  .header-content { --header-gap: var(--spacing-xs); padding-inline: var(--spacing-sm); }
  .header-nav-select { width: 96px; }
}
</style>
