import type { RequestHandler } from 'express';
import { timelineResponse, type FetchPublicResource } from './timelineResponse.js';
import { sitemapResponse } from './sitemap.js';

/** Explicitly mounted in the Express service; independent of platform middleware discovery. */
export function createSeoPages(origin: string, allowIndexing: boolean, read: FetchPublicResource = fetch): RequestHandler {
  const base = new URL(origin);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('Invalid public frontend origin');
  return async (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) || !['/timeline', '/timeline/', '/sitemap.xml'].includes(req.path)) return next();
    try {
      // The origin is deployment configuration, never a visitor-controlled Host header.
      const url = new URL(req.path, base.origin);
      url.search = new URL(req.originalUrl, 'http://request.invalid').search;
      const request = new Request(url, { method: req.method });
      const response = req.path === '/sitemap.xml'
        ? await sitemapResponse(request, read, allowIndexing)
        : await timelineResponse(request, read, allowIndexing);
      if (!response) {
        res.status(503).set('Cache-Control', 'no-store').set('Retry-After', '60').end();
        return;
      }
      res.status(response.status);
      response.headers.forEach((value, key) => res.set(key, value));
      res.end(await response.text());
    } catch (error) { next(error); }
  };
}
