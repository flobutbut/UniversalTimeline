import type { CaptureOptions, CaptureResult, PostHog } from 'posthog-js';
import type { ConsentTracker, MeasurementMode } from '@/stores/useConsentStore';

export interface PostHogSettings { token: string; host: string }

/** PostHog settings when it is the configured provider; null otherwise (nothing is registered). */
export function readPostHogSettings(env: ImportMetaEnv = import.meta.env): PostHogSettings | null {
  const token = env.VITE_POSTHOG_PROJECT_TOKEN?.trim(); const host = env.VITE_POSTHOG_HOST?.trim();
  return env.VITE_ANALYTICS_PROVIDER === 'posthog' && token && host ? { token, host } : null;
}

/** Removes every cookie and storage entry PostHog keys by the project token (ph_<token>_…, __ph_opt_in_out_<token>). */
export function purgePostHogStorage(token: string) {
  for (const storage of [globalThis.localStorage, globalThis.sessionStorage]) {
    try { for (const key of Object.keys(storage)) if (key.includes(token)) storage.removeItem(key); } catch { /* storage unavailable */ }
  }
  if (typeof document === 'undefined') return;
  // The cookie may be set on the host or on a parent domain (cross-subdomain cookie).
  const labels = location.hostname.split('.');
  const domains = ['', ...labels.slice(0, -1).map((_, index) => `; domain=.${labels.slice(index).join('.')}`)];
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim();
    if (name.includes(token)) for (const domain of domains) document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
  }
}

/** One-time auth secrets that can appear in a URL (recovery, e-mail change, PKCE return). */
const SECRET_PARAMS = ['token_hash', 'token', 'code', 'access_token', 'refresh_token'];

/** Removes auth secrets from every URL-like property before an event leaves the browser. */
export function scrubAuthSecrets(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  for (const [key, value] of Object.entries(event.properties ?? {})) {
    if (typeof value !== 'string' || !SECRET_PARAMS.some(name => value.includes(`${name}=`))) continue;
    try {
      const url = new URL(value, location.origin);
      for (const name of SECRET_PARAMS) if (url.searchParams.has(name)) url.searchParams.set(name, 'redacted');
      event.properties[key] = /^https?:/.test(value) ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
    } catch { /* not a URL: left unchanged */ }
  }
  return event;
}

/** Client-side reason that keeps the sign-up form from being sent. */
export type SignupBlock = 'username_missing' | 'username_invalid' | 'username_checking' | 'username_taken' | 'terms_unchecked';

/** How a timeline position was reached: the entry into the page, or the action taken inside it. */
export type TimelineVia = 'link' | 'landing' | 'search' | 'app' | 'history' | 'period' | 'slide' | 'back'
  | 'breadcrumb' | 'story_breadcrumb' | 'associated_story' | 'story_choice' | 'context' | 'retry';

/** A public frise is named; a private or unknown one is only counted, never identified. */
export interface TimelineStoryProperties {
  story_visibility: 'public' | 'private' | 'unknown';
  story_id?: string;
  story_title?: string;
  own_story: boolean;
  signed_in: boolean;
}

export interface SearchCompletedProperties {
  surface: 'header' | 'page';
  outcome: 'story' | 'wikidata' | 'abandon';
  query_length: number;
  reformulations: number;
  /** Results of the last settled query; null while unknown or when that source failed. */
  story_results: number | null;
  wikidata_results: number | null;
  position?: number;
  matched_on?: 'title' | 'description' | 'content';
  wikidata_id?: string;
  wikidata_label?: string;
  /** Only for a consented search that found no frise, after the guard of searchTermForAnalytics. */
  query?: string;
  query_redacted?: boolean;
}

/**
 * Product events of Documentation/PLAN-ANALYSE.md (section 4). Values stay short and never carry personal
 * data: no e-mail, username, private title, and typed text only as the guarded term of a search without frise.
 */
export interface AnalyticsEvents {
  landing_section_viewed: { page: 'landing'; section: string };
  landing_demo_scale_changed: { scale: string };
  journey_step_reached: { step_index: number; step_id: string; method: 'scroll' | 'button' };
  signup_form_viewed: { redirect: string };
  signup_abandoned: { blocked_by: SignupBlock | null };
  signup_submitted: Record<string, never>;
  signup_failed: { reason: string };
  signup_succeeded: { confirmation_required: boolean };
  login_succeeded: Record<string, never>;
  login_failed: { reason: string };
  username_set: { first_time: boolean };
  timeline_position_viewed: TimelineStoryProperties & {
    view: 'overview' | 'period'; depth: number; via: TimelineVia; has_context: boolean; period_id?: string; period_title?: string;
  };
  timeline_event_opened: TimelineStoryProperties & { depth: number; event_id?: string; event_title?: string };
  timeline_load_failed: { reason: 'invalid_link' | 'load_failed' | 'story_unavailable'; via: TimelineVia };
  search_completed: SearchCompletedProperties;
}

/**
 * Autocapture keeps clicks and data-attr markers but no visible text nor descriptive attribute: they can hold a
 * private frise title, a username or other user content.
 */
const ELEMENT_ATTRIBUTE_IGNORELIST = ['aria-label', 'aria-description', 'title', 'alt', 'placeholder', 'value'];

/** The initialised client while consent is given; null otherwise, so events are dropped, never queued. */
let capturing: PostHog | null = null;

/** Sends a product event only while audience measurement is accepted. */
export function track<E extends keyof AnalyticsEvents>(event: E, properties: AnalyticsEvents[E], options?: CaptureOptions) {
  capturing?.capture(event, properties, options);
}

type LoadPostHog = () => Promise<PostHog>;
const loadPostHog: LoadPostHog = () => import('posthog-js').then(module => module.default);

/** Mode the events are currently sent in; searches only keep their term when the visitor consented. */
let currentMode: MeasurementMode = 'off';
export const measurementMode = () => currentMode;

/** Cookies and storage with consent; nothing but memory otherwise, so an anonymous visit ends with the page. */
const persistenceFor = (mode: 'exempt' | 'consented') => mode === 'consented' ? 'localStorage+cookie' as const : 'memory' as const;

/**
 * Audience measurement in two modes. Without consent (`exempt`), the SDK keeps its identifier in memory only and
 * writes nothing on the device: one visit, never linked to another. With consent, it persists across visits.
 * Switching mode starts a new identifier, so the two are never linked; `off` opts out and deletes PostHog's
 * cookies and storage. Session replay stays off; every event carries `measurement` to tell the modes apart.
 */
export function createPostHogTracker({ token, host }: PostHogSettings, load: LoadPostHog = loadPostHog): ConsentTracker {
  let client: PostHog | null = null; let wanted: MeasurementMode = 'off'; let loading: Promise<void> | null = null;
  function enter(posthog: PostHog, mode: 'exempt' | 'consented') {
    if (currentMode === 'off') posthog.opt_in_capturing();
    posthog.reset(true);
    posthog.set_config({ persistence: persistenceFor(mode) });
    posthog.register({ measurement: mode });
    // Opting in records a flag in local storage: an anonymous visit must leave nothing behind.
    if (mode === 'exempt') purgePostHogStorage(token);
    capturing = posthog; currentMode = mode;
  }
  return {
    async apply(mode) {
      wanted = mode;
      if (mode === 'off') {
        capturing = null; currentMode = 'off';
        if (client) { client.opt_out_capturing(); client.reset(true); client.set_config({ persistence: 'memory' }); }
        purgePostHogStorage(token);
        return;
      }
      if (client) { if (mode !== currentMode) enter(client, mode); return; }
      loading ??= load().then(posthog => {
        loading = null;
        // Measurement turned off while the script was downloading: never initialise.
        if (wanted === 'off') return;
        posthog.init(token, {
          api_host: host, defaults: '2026-08-30', disable_session_recording: true, before_send: scrubAuthSecrets,
          persistence: persistenceFor(wanted), disable_surveys: true, advanced_disable_flags: true,
          mask_all_text: true,
          autocapture: { element_attribute_ignorelist: ELEMENT_ATTRIBUTE_IGNORELIST },
          capture_dead_clicks: { element_attribute_ignorelist: ELEMENT_ATTRIBUTE_IGNORELIST },
        });
        posthog.register({ measurement: wanted });
        client = posthog; capturing = posthog; currentMode = wanted;
      }).catch(() => { loading = null; });
      await loading;
      // The mode changed while the script was downloading (a choice made on the banner meanwhile).
      if (client && wanted !== 'off' && wanted !== currentMode) enter(client, wanted);
    },
  };
}

/** Registers the configured tracker; outside consent, leftovers of an expired or withdrawn choice are deleted. */
export function installAnalytics(consent: { measurementMode: MeasurementMode; registerTracker(tracker: ConsentTracker): void }, env: ImportMetaEnv = import.meta.env) {
  const settings = readPostHogSettings(env);
  if (!settings) return;
  if (consent.measurementMode !== 'consented') purgePostHogStorage(settings.token);
  consent.registerTracker(createPostHogTracker(settings));
}
