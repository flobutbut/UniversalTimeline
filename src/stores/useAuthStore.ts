import { computed, onScopeDispose, ref } from 'vue';
import { defineStore } from 'pinia';
import { authService, type Account } from '@/services/AuthService';
import { profileApi, type AccountProfile, type ProfileWrite } from '@/services/ProfileApiService';
import { useDataStore } from './useDataStore';

export const useAuthStore = defineStore('auth', () => {
  const enabled = ref<boolean | null>(null);
  const account = ref<Account | null>(null);
  const ready = ref(false); const error = ref<string | null>(null); const identityVersion = ref(0);
  let pending: Promise<void> | null = null; let generation = 0; let subscription: { unsubscribe(): void } | null = null;
  let refresh: { generation: number; promise: Promise<void> } | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  /** Own profile (username, avatar, terms): undefined until read for the current identity, null when absent. */
  const profile = ref<AccountProfile | null | undefined>(undefined);
  const profileError = ref<string | null>(null);
  let profileRequest: { version: number; promise: Promise<void> } | null = null;

  function setAccount(next: typeof account.value) {
    const previous = account.value?.id ?? null;
    const permissionsChanged = account.value?.isAdmin !== next?.isAdmin;
    account.value = next;
    if (previous !== (next?.id ?? null) || (previous !== null && permissionsChanged)) {
      identityVersion.value++; profile.value = undefined; profileError.value = null; profileRequest = null;
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
  /** Reads the own profile once per identity; a failure stays visible and can be retried. */
  function ensureProfile(force = false): Promise<void> {
    if (!account.value) { profile.value = undefined; return Promise.resolve(); }
    const version = identityVersion.value;
    if (!force && profile.value !== undefined) return Promise.resolve();
    if (!force && profileRequest?.version === version) return profileRequest.promise;
    const promise = (async () => {
      try {
        const next = await profileApi.get();
        if (version === identityVersion.value) { profile.value = next; profileError.value = null; }
      } catch {
        if (version === identityVersion.value) profileError.value = 'Impossible de charger votre profil. Réessayez.';
      }
    })().finally(() => { if (profileRequest?.promise === promise) profileRequest = null; });
    profileRequest = { version, promise };
    return promise;
  }
  async function saveProfile(data: ProfileWrite) {
    const version = identityVersion.value;
    const saved = await profileApi.save(data);
    if (version === identityVersion.value) { profile.value = saved; useDataStore().resetData(); }
    return saved;
  }
  async function acceptTerms(termsVersion: string) {
    const version = identityVersion.value;
    const saved = await profileApi.acceptTerms(termsVersion);
    if (version === identityVersion.value) profile.value = saved;
  }
  /** Right to erasure: the API deletes frises and account, then the local session is closed. */
  async function deleteAccount() {
    await profileApi.deleteAccount();
    await authService.getClient()?.auth.signOut({ scope: 'local' });
    generation++; setAccount(null); ready.value = true; error.value = null;
  }
  onScopeDispose(() => { generation++; subscription?.unsubscribe(); if (refreshTimer) clearTimeout(refreshTimer); });
  function ownsStory(story: { ownerUserId?: string | null }): boolean {
    return enabled.value !== true || (!!account.value && story.ownerUserId === account.value.id);
  }
  return { enabled, account, ready, error, identityVersion, initialize, refreshAccount, signOut, ownsStory,
    profile, profileError, ensureProfile, saveProfile, acceptTerms, deleteAccount,
    /** A frise is signed with the username: a known missing profile blocks creation (the API refuses it too). */
    canCreateStories: computed(() => enabled.value !== true || profile.value !== null),
    signedIn: computed(() => !!account.value), isAdmin: computed(() => account.value?.isAdmin === true) };
});
