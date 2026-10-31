<script setup lang="ts">
import { RouterView } from 'vue-router'
import Header from '@/components/Header.vue'
import UiFeedbackHost from '@/components/UiFeedbackHost.vue'
import { useAppNavigation } from '@/composables/useAppNavigation'
import { useAuthStore } from '@/stores/useAuthStore'
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/useUiStore'
import { canUseWorkspace } from '@/router/access'

const { currentView, loading, error, navigate, selectSearch, retry } = useAppNavigation()
const auth = useAuthStore(); const router = useRouter(); const ui = useUiStore()
const allowed = computed(() => router.currentRoute.value.meta.public === true || (canUseWorkspace(auth) && (!router.currentRoute.value.meta.admin || auth.isAdmin)))
const isLanding = computed(() => router.currentRoute.value.meta.landing === true)
watch([() => auth.identityVersion, allowed], () => {
  ui.reset()
  if (!allowed.value) void router.replace(canUseWorkspace(auth) ? { name: 'forbidden' } : { name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
})

</script>

<template>
  <div class="app" :class="{ 'app--landing': isLanding }">
    <a class="skip-link" href="#main-content">Aller au contenu</a>
    <Header
      v-if="!isLanding"
      :current-view="currentView"
      @change-view="navigate"
      @select-search="selectSearch"
    />
    <div v-if="loading" class="navigation-status" role="status">Chargement de la page…</div>
    <div v-if="error" class="navigation-status" role="alert">
      {{ error }} <button type="button" @click="retry">Réessayer</button>
    </div>
    <main id="main-content" class="main-content" tabindex="-1" :aria-busy="loading">
      <RouterView v-if="allowed" v-slot="{ Component, route: activeRoute }">
        <KeepAlive :key="auth.identityVersion" include="HomeView" :max="1">
          <component :is="Component" :key="activeRoute.name" />
        </KeepAlive>
      </RouterView>
    </main>
    <UiFeedbackHost />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  height: 100vh;
  min-height: 100dvh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--color-background);
  color: var(--color-text);
}

.skip-link { position: fixed; top: var(--spacing-sm); left: var(--spacing-sm); transform: translateY(-200%); z-index: var(--z-index-search-layer); background: var(--color-surface); padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md); }
.skip-link:focus { transform: none; }

.navigation-status {
  flex-shrink: 0;
  padding: var(--spacing-sm) var(--spacing-lg);
}

.main-content {
  min-width: 0;
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  overflow: hidden;
  background-color: var(--color-background);
  min-height: 0;
  height: 100%;
}

.main-content > * {
  height: 100%;
  min-height: 0;
}

.app--landing .main-content { background: var(--color-background); }

:global(body) {
  margin: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--color-background);
  color: var(--color-text);
  height: 100vh;
  overflow: hidden;
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
}
</style>
