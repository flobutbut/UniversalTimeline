import type { CaptureResult, PostHog } from 'posthog-js';
import type { ConsentTracker } from '@/stores/useConsentStore';

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

type LoadPostHog = () => Promise<PostHog>;
const loadPostHog: LoadPostHog = () => import('posthog-js').then(module => module.default);

/**
 * Audience measurement: the SDK is downloaded and initialised only on start (after consent). Stop opts out,
 * forgets the pseudonymous identifier and deletes PostHog's cookies and storage. Session replay stays off.
 */
export function createPostHogTracker({ token, host }: PostHogSettings, load: LoadPostHog = loadPostHog): ConsentTracker {
  let client: PostHog | null = null; let wanted = false; let loading: Promise<void> | null = null;
  return {
    async start() {
      wanted = true;
      if (client) { client.set_config({ persistence: 'localStorage+cookie' }); client.opt_in_capturing(); return; }
      loading ??= load().then(posthog => {
        loading = null;
        // Consent withdrawn while the script was downloading: never initialise.
        if (!wanted) return;
        posthog.init(token, { api_host: host, defaults: '2026-08-30', disable_session_recording: true, before_send: scrubAuthSecrets });
        client = posthog;
      }).catch(() => { loading = null; });
      await loading;
    },
    stop() {
      wanted = false;
      if (client) { client.opt_out_capturing(); client.reset(true); client.set_config({ persistence: 'memory' }); }
      purgePostHogStorage(token);
    },
  };
}

/** Registers the configured tracker; without consent, leftovers of an expired or withdrawn choice are deleted. */
export function installAnalytics(consent: { analyticsAllowed: boolean; registerTracker(tracker: ConsentTracker): void }, env: ImportMetaEnv = import.meta.env) {
  const settings = readPostHogSettings(env);
  if (!settings) return;
  if (!consent.analyticsAllowed) purgePostHogStorage(settings.token);
  consent.registerTracker(createPostHogTracker(settings));
}
