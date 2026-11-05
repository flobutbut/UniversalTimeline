import { inject, type BeforeSendEvent } from '@vercel/analytics';

/**
 * Keeps only the path: query strings carry frise and period identifiers and one-time auth secrets (recovery,
 * e-mail change). A page view of the path already counted is dropped, so the Exploration, whose navigation only
 * changes the query, counts one visit of /timeline and not one per position.
 */
export function createPathOnlyFilter(origin = globalThis.location?.origin ?? 'https://universaltimeline.net', allowed: () => boolean = () => true) {
  let lastPath: string | null = null;
  return (event: BeforeSendEvent): BeforeSendEvent | null => {
    // A visitor who objected, or a device of the publisher: nothing is sent.
    if (!allowed()) return null;
    const url = new URL(event.url, origin);
    const path = `${url.origin}${url.pathname}`;
    if (event.type === 'pageview') {
      if (path === lastPath) return null;
      lastPath = path;
    }
    return { ...event, url: path };
  };
}

/**
 * Visit counting by Vercel Web Analytics: no cookie nor storage on the device and no consent, so every visitor is
 * counted, except those who object to the anonymous measurement and the publisher's own devices. Production build only: the
 * script is served by Vercel at /_vercel/insights.
 */
export function installVisitCounting(allowed: () => boolean, env: ImportMetaEnv = import.meta.env) {
  if (!env.PROD) return;
  inject({ mode: 'production', debug: false, beforeSend: createPathOnlyFilter(undefined, allowed) });
}
