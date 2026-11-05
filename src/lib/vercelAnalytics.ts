import { inject } from '@vercel/analytics';

/** Flag to track if Vercel Analytics has been initialized */
let initialized = false;

/**
 * Initializes Vercel Web Analytics for tracking page views and web vitals.
 * This is called once during application bootstrap.
 * 
 * Vercel Analytics automatically tracks:
 * - Page views
 * - Web Vitals (CLS, FID, FCP, LCP, TTFB)
 * - User interactions
 * 
 * The analytics are privacy-friendly and GDPR-compliant by design.
 */
export function installVercelAnalytics() {
  if (initialized) return;
  
  // Inject Vercel Analytics
  // This adds the tracking script to the page
  inject({
    mode: import.meta.env.DEV ? 'development' : 'production'
  });
  
  initialized = true;
}
