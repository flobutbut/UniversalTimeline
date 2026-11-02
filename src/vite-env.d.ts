/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Audience measurement provider ("posthog"). Empty: no tracker and no consent banner. */
  readonly VITE_ANALYTICS_PROVIDER?: string;
  /** Public PostHog project token and ingestion host, read only when the provider is "posthog". */
  readonly VITE_POSTHOG_PROJECT_TOKEN?: string;
  readonly VITE_POSTHOG_HOST?: string;
}
