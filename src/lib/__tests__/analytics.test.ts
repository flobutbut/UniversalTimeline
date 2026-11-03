import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import type { PostHog } from 'posthog-js';
import { createPostHogTracker, installAnalytics, purgePostHogStorage, readPostHogSettings, scrubAuthSecrets, track } from '@/lib/analytics';
import { useConsentStore } from '@/stores/useConsentStore';

const token = 'phc_testtoken';
const settings = { token, host: 'https://eu.i.posthog.com' };
const env = (values: Record<string, string>) => values as unknown as ImportMetaEnv;
function fakePostHog() {
  return { init: vi.fn(), capture: vi.fn(), opt_in_capturing: vi.fn(), opt_out_capturing: vi.fn(), reset: vi.fn(), set_config: vi.fn() };
}

let pinia: Pinia;
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); pinia = createPinia(); setActivePinia(pinia); });
afterEach(() => { disposePinia(pinia); vi.unstubAllEnvs(); document.cookie.split(';').forEach(c => { document.cookie = `${c.split('=')[0].trim()}=; Max-Age=0; path=/`; }); });

it('reads PostHog settings only when it is the provider and both values are set', () => {
  expect(readPostHogSettings(env({ VITE_ANALYTICS_PROVIDER: 'posthog', VITE_POSTHOG_PROJECT_TOKEN: token, VITE_POSTHOG_HOST: settings.host }))).toEqual(settings);
  expect(readPostHogSettings(env({ VITE_ANALYTICS_PROVIDER: 'posthog', VITE_POSTHOG_PROJECT_TOKEN: token }))).toBeNull();
  expect(readPostHogSettings(env({ VITE_ANALYTICS_PROVIDER: 'other', VITE_POSTHOG_PROJECT_TOKEN: token, VITE_POSTHOG_HOST: settings.host }))).toBeNull();
});

it('downloads and initialises PostHog only on start, without session recording', async () => {
  const posthog = fakePostHog(); const load = vi.fn(async () => posthog as unknown as PostHog);
  const tracker = createPostHogTracker(settings, load);
  expect(load).not.toHaveBeenCalled();
  await tracker.start();
  expect(posthog.init).toHaveBeenCalledWith(token, expect.objectContaining({ api_host: settings.host, disable_session_recording: true }));
  await tracker.start();
  expect(load).toHaveBeenCalledOnce(); expect(posthog.init).toHaveBeenCalledOnce(); expect(posthog.opt_in_capturing).toHaveBeenCalledOnce();
});

it('opts out, forgets the identifier and deletes PostHog storage when consent is withdrawn', async () => {
  const posthog = fakePostHog(); const tracker = createPostHogTracker(settings, async () => posthog as unknown as PostHog);
  await tracker.start();
  localStorage.setItem(`ph_${token}_posthog`, '{}'); localStorage.setItem(`__ph_opt_in_out_${token}`, '0'); localStorage.setItem('theme', 'dark');
  sessionStorage.setItem(`ph_${token}_window_id`, 'w'); document.cookie = `ph_${token}_posthog=x; path=/`;
  tracker.stop();
  expect(posthog.opt_out_capturing).toHaveBeenCalledOnce(); expect(posthog.reset).toHaveBeenCalledWith(true);
  expect(posthog.set_config).toHaveBeenCalledWith({ persistence: 'memory' });
  expect(Object.keys(localStorage)).toEqual(['theme']); expect(Object.keys(sessionStorage)).toEqual([]);
  expect(document.cookie).not.toContain(token);
});

it('never initialises when consent is withdrawn while the script is downloading', async () => {
  const posthog = fakePostHog(); let resolve!: (value: PostHog) => void;
  const tracker = createPostHogTracker(settings, () => new Promise<PostHog>(done => { resolve = done; }));
  const starting = tracker.start(); tracker.stop();
  resolve(posthog as unknown as PostHog); await starting;
  expect(posthog.init).not.toHaveBeenCalled();
});

it('registers through the consent store and purges leftovers while consent is missing', () => {
  vi.stubEnv('VITE_ANALYTICS_PROVIDER', 'posthog');
  localStorage.setItem(`ph_${token}_posthog`, '{}');
  const consent = useConsentStore(); const register = vi.spyOn(consent, 'registerTracker');
  installAnalytics(consent, env({ VITE_ANALYTICS_PROVIDER: 'posthog', VITE_POSTHOG_PROJECT_TOKEN: token, VITE_POSTHOG_HOST: settings.host }));
  expect(register).toHaveBeenCalledOnce(); expect(localStorage.getItem(`ph_${token}_posthog`)).toBeNull();
  installAnalytics(consent, env({}));
  expect(register).toHaveBeenCalledOnce();
});

it('redacts one-time auth secrets from captured URLs', () => {
  const event = { uuid: 'u', event: '$pageview', properties: {
    $current_url: 'https://universaltimeline.net/reset-password?token_hash=secret&type=recovery',
    $pathname: '/profile?code=one-time', $referrer: 'https://example.test/?q=frise', title: 'token= in text',
  } } as unknown as Parameters<typeof scrubAuthSecrets>[0];
  const props = scrubAuthSecrets(event)!.properties;
  expect(props.$current_url).toBe('https://universaltimeline.net/reset-password?token_hash=redacted&type=recovery');
  expect(props.$pathname).toBe('/profile?code=redacted');
  expect(props.$referrer).toBe('https://example.test/?q=frise');
  expect(JSON.stringify(props)).not.toMatch(/secret|one-time/);
});

it('leaves unrelated storage untouched', () => {
  localStorage.setItem('ut-consent', '{}'); purgePostHogStorage(token);
  expect(localStorage.getItem('ut-consent')).toBe('{}');
});

it('sends product events only while consent is given', async () => {
  const posthog = fakePostHog(); const tracker = createPostHogTracker(settings, async () => posthog as unknown as PostHog);
  track('signup_submitted', {});
  await tracker.start();
  track('signup_failed', { reason: 'weak_password' });
  tracker.stop();
  track('login_succeeded', {});
  expect(posthog.capture).toHaveBeenCalledOnce();
  expect(posthog.capture).toHaveBeenCalledWith('signup_failed', { reason: 'weak_password' }, undefined);
  await tracker.start();
  track('login_succeeded', {});
  expect(posthog.capture).toHaveBeenCalledTimes(2);
  tracker.stop();
});
