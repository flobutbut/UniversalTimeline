import { computed, onScopeDispose, ref } from 'vue';
import { useRoute, useRouter, type RouteLocationNormalized, type RouteLocationRaw } from 'vue-router';
import { navigationViewForRoute, type NavigationView } from '@/router/navigation';
import { globalSearchLocation } from '@/router/searchTarget';
import type { GlobalSearchResult } from '@/services/SearchApiService';

export function useAppNavigation() {
  const route = useRoute();
  const router = useRouter();
  const currentView = computed(() => navigationViewForRoute(route.name));
  const timelineDestination = ref<RouteLocationRaw>(route.name === 'timeline' ? route.fullPath : { name: 'timeline' });
  const loading = ref(false);
  const error = ref<string | null>(null);
  let pendingRoute: RouteLocationNormalized | null = null;
  let failedPath: string | null = null;

  const removeBefore = router.beforeEach(to => {
    pendingRoute = to;
    loading.value = true;
    error.value = null;
  });
  const removeAfter = router.afterEach((to, _from, failure) => {
    if (to === pendingRoute) loading.value = false;
    if (!failure && to.name === 'timeline') timelineDestination.value = to.fullPath;
  });
  const removeError = router.onError((_cause, to) => {
    if (pendingRoute && to !== pendingRoute) return;
    loading.value = false;
    failedPath = to.fullPath;
    error.value = 'Impossible de charger cette page. Vérifiez votre connexion puis réessayez.';
  });
  onScopeDispose(() => { removeBefore(); removeAfter(); removeError(); });

  async function push(target: RouteLocationRaw) {
    try {
      await router.push(target);
    } catch {
      // Router errors are displayed by the common onError handler above.
    }
  }

  return {
    currentView, loading, error, timelineDestination,
    navigate: (view: NavigationView) => push(view === 'timeline' ? timelineDestination.value : { name: view }),
    selectSearch: (hit: GlobalSearchResult) => {
      try {
        return push(globalSearchLocation(hit));
      }
      catch { failedPath = null; error.value = 'Ce résultat de recherche est invalide. Relancez la recherche.'; return Promise.resolve(); }
    },
    retry: () => failedPath ? push(failedPath) : Promise.resolve(),
  };
}
