import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';
import { usernameError } from '@account-rules';
import { profileApi } from '@/services/ProfileApiService';

export type UsernameState = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'error';

/**
 * Format checked locally, uniqueness asked to the API after a pause. An obsolete answer is ignored;
 * the server and the database still refuse a taken name on save.
 */
export function useUsernameAvailability(name: Ref<string>, current: () => string | null = () => null, delay = 400) {
  const state = ref<UsernameState>('idle');
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  const cancel = () => { if (timer) clearTimeout(timer); timer = null; controller?.abort(); controller = null; };

  async function check(value: string) {
    controller = new AbortController();
    const request = controller;
    try {
      const available = await profileApi.usernameAvailable(value, request.signal);
      if (request === controller) state.value = available ? 'available' : 'taken';
    } catch {
      if (request === controller && !request.signal.aborted) state.value = 'error';
    }
  }
  watch(name, value => {
    cancel();
    const trimmed = value.trim();
    if (!trimmed || trimmed === current()) { state.value = 'idle'; return; }
    if (usernameError(trimmed)) { state.value = 'invalid'; return; }
    state.value = 'checking';
    timer = setTimeout(() => { timer = null; void check(trimmed); }, delay);
  }, { immediate: true });
  onScopeDispose(cancel);

  const message = computed(() => {
    const problem = usernameError(name.value);
    switch (state.value) {
      case 'invalid': return problem ?? '';
      case 'taken': return 'Ce nom d’utilisateur est déjà pris.';
      case 'error': return 'Vérification indisponible : la disponibilité sera contrôlée à l’enregistrement.';
      default: return '';
    }
  });
  const hint = computed(() => state.value === 'checking' ? 'Vérification de la disponibilité…' : state.value === 'available' ? 'Ce nom d’utilisateur est disponible.' : '');
  /** Blocks a submission only for a known problem; an unavailable check defers to the server. */
  const blocking = computed(() => state.value === 'invalid' || state.value === 'taken' || state.value === 'checking');
  return { state, message, hint, blocking };
}
