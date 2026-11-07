// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { timelineResponse } from '../../../server/src/api/seo/timelineResponse';
import { renderSitemap, sitemapResponse } from '../../../server/src/api/seo/sitemap';
import { SITE_ORIGIN } from '../metadata';

const shell = '<html><head><title>Generic</title></head><body><div id="app"></div><script src="/assets/app.js"></script></body></html>';
const html = () => new Response(shell, { headers: { 'Content-Type': 'text/html' } });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const record = { id: '22', title: 'Extinctions', description: 'Les cinq grandes crises.' };

it('delivers public metadata in the initial HTML without forwarding session credentials', async () => {
  const read = vi.fn(async (url: URL) => url.pathname.startsWith('/api/') ? json(record) : html());
  const request = new Request(`${SITE_ORIGIN}/timeline?story=22&view=overview`, { headers: { Cookie: 'session=private', Authorization: 'Bearer private' } });
  const response = await timelineResponse(request, read);
  expect(response?.status).toBe(200);
  expect(response?.headers.get('cache-control')).toBe('private, no-store');
  const body = await response!.text();
  expect(body).toContain('Extinctions — frise chronologique');
  expect(body).toContain('<meta name="robots" content="index, follow"');
  expect(body.slice(body.indexOf('<body>'))).toBe(shell.slice(shell.indexOf('<body>')));
  for (const [url, options] of read.mock.calls as unknown as Array<[URL, RequestInit]>) {
    expect(url.origin).toBe(SITE_ORIGIN);
    expect(options.credentials).toBe('omit');
    expect(options.headers).toBeUndefined();
    expect(options.cache).toBe('no-store');
    expect(options.redirect).toBe('error');
  }
});

it('returns a generic, unindexed shell for private and nonexistent frises', async () => {
  const response = await timelineResponse(new Request(`${SITE_ORIGIN}/timeline?story=55`), async url => url.pathname.startsWith('/api/') ? json({ error: 'Introuvable' }, 404) : html());
  expect(response?.status).toBe(200); // A signed-in owner can still open their private frise in the app.
  const body = await response!.text();
  expect(body).toContain('noindex, follow');
  expect(body).not.toContain('rel="canonical"');
});

it('signals a temporary metadata outage without caching a false noindex as a healthy response', async () => {
  const response = await timelineResponse(new Request(`${SITE_ORIGIN}/timeline?story=22`), async url => url.pathname.startsWith('/api/') ? json({}, 503) : html());
  expect(response?.status).toBe(503);
  expect(response?.headers.get('retry-after')).toBe('60');
  expect(await response!.text()).toContain('<div id="app"></div>');
});

it('does not intercept non-document methods and falls through if the static shell is unavailable', async () => {
  const read = vi.fn(async () => { throw new Error('Unavailable'); });
  expect(await timelineResponse(new Request(`${SITE_ORIGIN}/timeline`, { method: 'POST' }), read)).toBeUndefined();
  expect(read).not.toHaveBeenCalled();
  expect(await timelineResponse(new Request(`${SITE_ORIGIN}/timeline`), read)).toBeUndefined();
});

it('uses normal anonymous public metadata for HEAD but emits no body', async () => {
  const response = await timelineResponse(new Request(`${SITE_ORIGIN}/timeline?story=22`, { method: 'HEAD' }), async url => url.pathname.startsWith('/api/') ? json(record) : html());
  expect(response?.status).toBe(200);
  expect(await response!.text()).toBe('');
});

it('produces valid escaped sitemap locations without duplicating ids or accepting injected URLs', () => {
  const sitemap = renderSitemap(['22', '22', '1', '0', 'https://evil.example', '1&secret=true']);
  expect(sitemap.match(/<loc>/g)).toHaveLength(4);
  expect(sitemap).toContain(`${SITE_ORIGIN}/timeline?story=22&amp;view=overview`);
  expect(sitemap).not.toContain('evil');
  expect(sitemap).not.toContain('secret');
  expect(renderSitemap(['22'], false)).not.toContain('<loc>');
});

it('re-reads public visibility and removes a frise from the next sitemap without a rebuild', async () => {
  const read = vi.fn().mockResolvedValueOnce(json(['1', '22'])).mockResolvedValueOnce(json(['1']));
  const request = new Request(`${SITE_ORIGIN}/sitemap.xml`);
  const first = await sitemapResponse(request, read);
  expect(first.headers.get('content-type')).toContain('application/xml');
  expect(await first.text()).toContain('story=22');
  const second = await sitemapResponse(request, read);
  expect(second.headers.get('cache-control')).toBe('no-store');
  expect(await second.text()).not.toContain('story=22');
  for (const [, options] of read.mock.calls) expect(options).toMatchObject({ credentials: 'omit', cache: 'no-store', redirect: 'error' });
});

it('does not publish a misleading sitemap when the public API is unavailable; previews do not read production data', async () => {
  const read = vi.fn().mockResolvedValue(json({}, 503));
  expect((await sitemapResponse(new Request(`${SITE_ORIGIN}/sitemap.xml`), read)).status).toBe(503);
  read.mockClear();
  const preview = await sitemapResponse(new Request('https://preview.example/sitemap.xml'), read, false);
  expect(read).not.toHaveBeenCalled();
  expect(await preview.text()).not.toContain('<loc>');
});
