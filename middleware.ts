import { timelineResponse } from './serverless/timelineResponse.js';
import { sitemapResponse } from './serverless/sitemap.js';

export const config = { matcher: ['/timeline', '/timeline/', '/sitemap.xml'], runtime: 'nodejs' };

/** Only the sitemap and existing timeline need per-request public metadata. */
export default function middleware(request: Request) {
  if (!['GET', 'HEAD'].includes(request.method)) return;
  if (new URL(request.url).pathname === '/sitemap.xml') return sitemapResponse(request, fetch, process.env.VERCEL_ENV !== 'preview');
  return timelineResponse(request, fetch, process.env.VERCEL_ENV !== 'preview');
}
