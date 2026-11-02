import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';

/** Bump when the purposes or the list of trackers change: every visitor is asked again. */
export const CONSENT_VERSION = 2;
const STORAGE_KEY = 'ut-consent';
/** A choice (acceptance or refusal) is asked again after six months, as recommended by the CNIL. */
const CHOICE_LIFETIME_MS = 182 * 24 * 60 * 60 * 1000;

export interface ConsentChoice { version: number; decidedAt: string; analytics: boolean }
/** A tracker starts only after consent and stops (and removes its cookies) when consent is withdrawn. */
export interface ConsentTracker { start(): void | Promise<void>; stop(): void }

function readChoice(now = Date.now()): ConsentChoice | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    const choice = value as Partial<ConsentChoice> | null;
    if (!choice || choice.version !== CONSENT_VERSION || typeof choice.analytics !== 'boolean' || typeof choice.decidedAt !== 'string') return null;
    const decided = Date.parse(choice.decidedAt);
    return Number.isFinite(decided) && now - decided < CHOICE_LIFETIME_MS ? choice as ConsentChoice : null;
  } catch { return null; }
}

/**
 * Consent for non-essential cookies (audience measurement). Nothing is tracked until a tracker is
 * configured (VITE_ANALYTICS_PROVIDER) and the visitor accepts; refusing is as easy as accepting.
 */
export const useConsentStore = defineStore('consent', () => {
  const trackingConfigured = ref(!!import.meta.env.VITE_ANALYTICS_PROVIDER);
  const choice = ref<ConsentChoice | null>(readChoice());
  const preferencesOpen = ref(false);
  const needsDecision = computed(() => trackingConfigured.value && !choice.value);
  const analyticsAllowed = computed(() => trackingConfigured.value && choice.value?.analytics === true);
  const trackers: ConsentTracker[] = [];

  function decide(analytics: boolean) {
    const next: ConsentChoice = { version: CONSENT_VERSION, decidedAt: new Date().toISOString(), analytics };
    choice.value = next; preferencesOpen.value = false;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* the choice still applies to this visit */ }
  }
  /** Registers the future audience tracker; it is started only while consent is given. */
  function registerTracker(tracker: ConsentTracker) {
    trackers.push(tracker);
    if (analyticsAllowed.value) void tracker.start();
  }
  watch(analyticsAllowed, allowed => { for (const tracker of trackers) if (allowed) void tracker.start(); else tracker.stop(); });

  return {
    trackingConfigured, choice, preferencesOpen, needsDecision, analyticsAllowed, registerTracker,
    acceptAll: () => decide(true), rejectAll: () => decide(false), save: (analytics: boolean) => decide(analytics),
    openPreferences: () => { preferencesOpen.value = true; }, closePreferences: () => { preferencesOpen.value = false; },
  };
});
