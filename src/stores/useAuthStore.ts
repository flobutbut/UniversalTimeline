import { computed, onScopeDispose, ref } from 'vue';
import { defineStore } from 'pinia';
import { authService } from '@/services/AuthService';
import { useDataStore } from './useDataStore';

export const useAuthStore = defineStore('auth', () => {
  const enabled = ref<boolean | null>(null);
  const account = ref<{ id: string; isAdmin: boolean } | null>(null);
  const ready = ref(false); const error = ref<string | null>(null); const identityVersion = ref(0);
  let pending: Promise<void> | null = null; let generation = 0; let subscription: { unsubscribe(): void } | null = null;
  let refresh: { generation: number; promise: Promise<void> } | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  function setAccount(next: typeof account.value) {
    const previous = account.value?.id ?? null;
    const permissionsChanged = account.value?.isAdmin !== next?.isAdmin;
    account.value = next;
    if (previous !== (next?.id ?? null) || (previous !== null && permissionsChanged)) {
      identityVersion.value++;
      useDataStore().resetData();
    }
  }
  function refreshAccount(): Promise<void> {
    if (refresh?.generation === generation) return refresh.promise;
    const request = generation;
    const promise = (async () => { try {
      const next = await authService.getAccount();
      if (request !== generation) return;
      setAccount(next); error.value = null; ready.value = true;
    } catch {
      if (request !== generation) return;
      setAccount(null); error.value = 'Impossible de vérifier votre compte. Réessayez.'; ready.value = false;
    } })().finally(() => { if (refresh?.promise === promise) refresh = null; });
    refresh = { generation: request, promise }; return promise;
  }
  async function initialize() {
    if (ready.value) return;
    if (pending) return pending;
    pending = (async () => {
      try {
        await authService.initialize(); enabled.value = authService.isEnabled();
        if (!enabled.value) { ready.value = true; error.value = null; return; }
        await refreshAccount();
        if (!subscription) subscription = authService.getClient()!.auth.onAuthStateChange((event, session) => {
          if (event === 'INITIAL_SESSION') return;
          if ((session?.user.id ?? null) !== (account.value?.id ?? null)) {
            generation++; setAccount(null); ready.value = false;
          }
          // Leave the Auth lock before calling getSession again.
          if (refreshTimer) clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => { refreshTimer = null; void refreshAccount(); }, 0);
        }).data.subscription;
      } catch {
        ready.value = false; error.value = 'La connexion est momentanément indisponible. Réessayez.';
      }
    })().finally(() => { pending = null; });
    return pending;
  }
  async function signOut() {
    const result = await authService.getClient()?.auth.signOut({ scope: 'local' });
    if (result?.error) throw new Error('Déconnexion impossible. Réessayez.');
    generation++; setAccount(null); ready.value = true; error.value = null;
  }
  onScopeDispose(() => { generation++; subscription?.unsubscribe(); if (refreshTimer) clearTimeout(refreshTimer); });
  function ownsStory(story: { ownerUserId?: string | null }): boolean {
    return enabled.value !== true || (!!account.value && story.ownerUserId === account.value.id);
  }
  return { enabled, account, ready, error, identityVersion, initialize, refreshAccount, signOut, ownsStory,
    signedIn: computed(() => !!account.value), isAdmin: computed(() => account.value?.isAdmin === true) };
});
