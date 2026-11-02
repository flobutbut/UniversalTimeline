/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Audience measurement provider. Empty until a tracker exists: no consent banner is shown. */
  readonly VITE_ANALYTICS_PROVIDER?: string;
}
