import { escapeHtml, SITE_ORIGIN, SITEMAP_PATHS, timelineStoryId } from '../../shared/seoMetadata.js';
import type { FetchPublicResource } from './timelineResponse.js';

export function renderSitemap(ids: string[] = [], allowIndexing = true): string {
  const urls = allowIndexing ? [...SITEMAP_PATHS.map(path => `${SITE_ORIGIN}${path}`), ...[...new Set(ids)].filter(id => timelineStoryId(new URLSearchParams({ story: id })) === id).map(id => `${SITE_ORIGIN}/timeline?story=${id}&view=overview`)] : [];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
}

/** Re-read public visibility each time; no build-time snapshot can keep a private frise listed. */
export async function sitemapResponse(request: Request, read: FetchPublicResource = fetch, allowIndexing = true): Promise<Response> {
  try {
    let ids: string[] = [];
    if (allowIndexing) {
      const response = await read(new URL('/api/seo/stories', request.url), { credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(3000) });
      if (!response.ok) throw new Error('Public catalogue unavailable');
      const value: unknown = await response.json();
      if (!Array.isArray(value) || value.some(id => typeof id !== 'string')) throw new Error('Invalid public catalogue');
      ids = value;
    }
    return new Response(request.method === 'HEAD' ? null : renderSitemap(ids, allowIndexing), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch {
    return new Response(null, { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } });
  }
}
