<template>
  <header class="header">
    <div
      class="header-content"
      :class="{ 'header-content--no-search': currentView !== 'timeline' }"
    >
      <div class="header-brand">
        <RouterLink to="/" class="header-title header-title--wordmark" aria-label="Universal Timeline — accueil">Universal Timeline</RouterLink>
      </div>
      <div v-if="currentView === 'timeline'" class="header-search-wrap">
        <GlobalSearch :key="auth.identityVersion" @select="emit('select-search', $event)" />
      </div>
      <div class="header-right">
        <nav v-if="tabs.length" class="header-nav" aria-label="Navigation principale">
          <RouterLink v-for="tab in tabs" :key="tab.value" :to="{ name: tab.value }" custom v-slot="{ href }">
            <a :href="href" class="header-nav-link" :class="{ 'tab-button--active': currentView === tab.value }" :aria-current="currentView === tab.value ? 'page' : undefined" @click="changeView($event, tab.value)">
              <DesignIcon v-if="tab.value === 'timeline' || tab.value === 'database'" :name="tab.value === 'database' ? 'frises' : 'timeline'" /><Icon v-else-if="tab.icon" :icon="tab.icon" aria-hidden="true" />{{ tab.label }}
            </a>
          </RouterLink>
        </nav>
        <div v-if="!canUseWorkspace(auth)" class="header-account-actions">
          <RouterLink :to="accountLocation(false)" class="header-account-link">Se connecter</RouterLink>
          <RouterLink :to="accountLocation(true)" class="header-account-link header-account-link--primary">Créer un compte</RouterLink>
        </div>
        <Button v-else variant="ghost" size="sm" :disabled="signingOut" @click="signOut">Se déconnecter</Button>
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import GlobalSearch from './GlobalSearch.vue';
import ThemeToggle from './ThemeToggle.vue';
import { Icon } from '@iconify/vue';
import Button from './base/Button.vue';
import DesignIcon from './base/DesignIcon.vue';
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToast } from '@/composables/useToast';

import { navigationTabs, type NavigationView } from '@/router/navigation';
import { canUseWorkspace, safeReturnPath } from '@/router/access';
import type { StorySearchResult } from '@/services/SearchApiService';

const auth = useAuthStore(); const router = useRouter(); const route = useRoute(); const toast = useToast(); const signingOut = ref(false);
const tabs = computed(() => canUseWorkspace(auth) ? navigationTabs.filter(tab => tab.value !== 'design-system' || auth.isAdmin) : []);
function accountLocation(signup: boolean) {
  return { name: 'login', query: { ...(signup ? { mode: 'signup' } : {}), ...(route.query.redirect ? { redirect: safeReturnPath(route.query.redirect) } : {}) } };
}
async function signOut() {
  if (signingOut.value) return;
  signingOut.value = true;
  try { await auth.signOut(); await router.replace('/timeline'); }
  catch { toast.show('Déconnexion impossible. Réessayez.', 'error'); }
  finally { signingOut.value = false; }
}

defineProps<{ currentView: NavigationView | '' }>();
const emit = defineEmits<{ (e: 'change-view', view: NavigationView): void; (e: 'select-search', hit: StorySearchResult): void }>();
function changeView(event: MouseEvent, view: NavigationView) {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  emit('change-view', view);
}

</script>

<style scoped>
.header {
  flex-shrink: 0;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: var(--spacing-md) 0;
  width: 100%;
  position: sticky;
  top: 0;
  z-index: var(--z-index-sticky);

}

.header-content {
  box-sizing: border-box;
  width: 100%;
  padding: 0 var(--spacing-lg);
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(180px, 1fr) auto;
  align-items: center;
  column-gap: var(--spacing-md);
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
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  white-space: nowrap;
  line-height: var(--line-height-tight);
  text-decoration: none;
}

.header-title--wordmark {
  font-family: var(--font-family-heading);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.header-title:hover {
  color: var(--color-primary);
}

.header-right {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  min-width: 0;
}

/* Colonne centrale : même largeur de part et d'autre (1fr / 1fr) → la recherche est centrée dans le header */
.header-search-wrap {
  justify-self: center;
  width: 100%;
  max-width: 400px;
  min-width: 0;
}

.header-search-wrap :deep(.search-bar) {
  width: 100%;
  max-width: 400px;
}

.header-nav { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); padding: var(--spacing-xs); background: var(--color-background); border-radius: var(--radius-lg); }
.header-nav-link { display: inline-flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-sm); border-radius: var(--radius-md); font-size: var(--font-size-sm); color: var(--color-text-light); white-space: nowrap; }
.header-nav-link:hover, .header-nav-link.tab-button--active { background: var(--color-surface); color: var(--color-primary); }

.header-account-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm); }
.header-account-link { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; height: var(--field-height-md); padding: 0 var(--spacing-md); border: 1px solid var(--color-primary); border-radius: var(--radius-md); color: var(--color-primary); font-size: var(--font-size-sm); font-weight: 500; text-decoration: none; white-space: nowrap; }
.header-account-link:hover { background: var(--color-primary-light); }
.header-account-link--primary { background: var(--color-primary-button); border-color: var(--color-primary-button); color: var(--color-text-white); }
.header-account-link--primary:hover { background: var(--color-primary-button-hover); }
.header-account-link:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }

@media (min-width: 901px) and (max-width: 1200px) {
  .header-content { grid-template-columns: minmax(0, 1fr) auto; row-gap: var(--spacing-sm); }
  .header-search-wrap { grid-column: 1 / -1; grid-row: 2; max-width: 600px; }
  .header-search-wrap :deep(.search-bar) { max-width: none; }
}

@media (max-width: 900px) {
  .header-content, .header-content--no-search { grid-template-columns: minmax(0, 1fr); gap: var(--spacing-sm); padding: 0 var(--spacing-md); }
  .header-brand { grid-column: 1; grid-row: 1; }
  .header-right { grid-column: 1; grid-row: 2; justify-self: stretch; min-width: 0; flex-wrap: wrap; }
  .header-nav { flex-basis: 100%; min-width: 0; }
  .header-nav-link { font-size: var(--font-size-xs); }
  .header-search-wrap { grid-column: 1; grid-row: 3; width: 100%; max-width: none; }
  .header-search-wrap :deep(.search-bar) { max-width: none; }
}
</style>

<style scoped>
.header { min-height: 71px; display: flex; align-items: center; }
.header-title--wordmark { letter-spacing: 0; }
.header-nav-link { padding: 6px 12px; font-weight: 400; line-height: 16px; }
.header-account-link--primary { color: var(--color-text-on-accent); }
</style>
