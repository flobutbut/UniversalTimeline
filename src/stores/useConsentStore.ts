import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';

/** Bump when the purposes or the list of trackers change: every visitor is asked again. */
export const CONSENT_VERSION = 3;
const STORAGE_KEY = 'ut-consent';
/** Set on a device where an administrator signed in: the publisher's own visits are never measured. */
const INTERNAL_DEVICE_KEY = 'ut-internal-device';
/** A choice (acceptance or refusal) is asked again after six months, as recommended by the CNIL. */
const CHOICE_LIFETIME_MS = 182 * 24 * 60 * 60 * 1000;

/**
 * `analytics`: audience measurement with cookies, by consent. `anonymous`: measurement without cookie nor storage,
 * one visit at a time, exempt from consent within the CNIL limits; the visitor can object to it.
 */
export interface ConsentChoice { version: number; decidedAt: string; analytics: boolean; anonymous: boolean }
/** off: nothing is measured. exempt: anonymous, in memory, one visit. consented: cookies, across visits. */
export type MeasurementMode = 'off' | 'exempt' | 'consented';
/** A tracker follows the measurement mode; switching to `off` stops it and removes what it stored. */
export interface ConsentTracker { apply(mode: MeasurementMode): void | Promise<void> }

function readChoice(now = Date.now()): ConsentChoice | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    const choice = value as Partial<ConsentChoice> | null;
    if (!choice || choice.version !== CONSENT_VERSION || typeof choice.analytics !== 'boolean'
      || typeof choice.anonymous !== 'boolean' || typeof choice.decidedAt !== 'string') return null;
    const decided = Date.parse(choice.decidedAt);
    return Number.isFinite(decided) && now - decided < CHOICE_LIFETIME_MS ? choice as ConsentChoice : null;
  } catch { return null; }
}
function readInternalDevice() {
  try { return localStorage.getItem(INTERNAL_DEVICE_KEY) === '1'; } catch { return false; }
}

/**
 * Consent for non-essential cookies (audience measurement). Nothing is tracked until a tracker is configured
 * (VITE_ANALYTICS_PROVIDER). Before a choice and after a refusal, only the anonymous measurement runs, unless the
 * visitor objects to it; refusing is as easy as accepting.
 */
export const useConsentStore = defineStore('consent', () => {
  const trackingConfigured = ref(!!import.meta.env.VITE_ANALYTICS_PROVIDER);
  const choice = ref<ConsentChoice | null>(readChoice());
  const internalDevice = ref(readInternalDevice());
  const preferencesOpen = ref(false);
  const needsDecision = computed(() => trackingConfigured.value && !choice.value);
  const analyticsAllowed = computed(() => trackingConfigured.value && !internalDevice.value && choice.value?.analytics === true);
  const anonymousAllowed = computed(() => trackingConfigured.value && !internalDevice.value && (choice.value?.anonymous ?? true));
  const measurementMode = computed<MeasurementMode>(() => analyticsAllowed.value ? 'consented' : anonymousAllowed.value ? 'exempt' : 'off');
  const trackers: ConsentTracker[] = [];

  function decide(analytics: boolean, anonymous: boolean) {
    const next: ConsentChoice = { version: CONSENT_VERSION, decidedAt: new Date().toISOString(), analytics, anonymous };
    choice.value = next; preferencesOpen.value = false;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* the choice still applies to this visit */ }
  }
  /** Registers the audience tracker; it immediately follows the current mode. */
  function registerTracker(tracker: ConsentTracker) {
    trackers.push(tracker);
    void tracker.apply(measurementMode.value);
  }
  /** Called when an administrator signs in: this device is excluded from every measurement, now and later. */
  function markInternalDevice() {
    if (internalDevice.value) return;
    internalDevice.value = true;
    try { localStorage.setItem(INTERNAL_DEVICE_KEY, '1'); } catch { /* excluded for this visit at least */ }
  }
  watch(measurementMode, mode => { for (const tracker of trackers) void tracker.apply(mode); });

  return {
    trackingConfigured, choice, internalDevice, preferencesOpen, needsDecision, analyticsAllowed, anonymousAllowed, measurementMode,
    registerTracker, markInternalDevice,
    // Refusing cookies keeps the anonymous measurement, which needs no consent; objecting to it is a separate switch.
    acceptAll: () => decide(true, true), rejectAll: () => decide(false, choice.value?.anonymous ?? true),
    save: (analytics: boolean, anonymous = true) => decide(analytics, anonymous),
    openPreferences: () => { preferencesOpen.value = true; }, closePreferences: () => { preferencesOpen.value = false; },
  };
});
