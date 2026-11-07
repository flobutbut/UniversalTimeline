// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { createSeoPages } from '../src/api/seo/pages';
import { createPublicSeoRead } from '../src/api/seo/publicRead';
import { principalContext } from '../src/auth/context';
import { query } from '../src/api/database';
vi.mock('../src/api/database', () => ({ query: vi.fn(), withTransaction: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); });

const shell = '<html><head><title>Generic</title></head><body><div id="app"></div></body></html>';
async function documentRequest(path: string, originalUrl = path, preview = false) {
  const read = vi.fn(async (url: URL) => url.pathname.startsWith('/api/')
    ? new Response(JSON.stringify(url.pathname === '/api/seo/stories' ? ['22'] : { id: '22', title: 'Extinctions', description: 'Crises du vivant.' }))
    : new Response(shell, { headers: { 'Content-Type': 'text/html' } }));
  const handler = createSeoPages('https://universaltimeline.net', !preview, read);
  const response = { status: vi.fn(), set: vi.fn(), end: vi.fn() };
  response.status.mockReturnValue(response); response.set.mockReturnValue(response);
  const next = vi.fn();
  await handler({ method: 'GET', path, originalUrl, headers: { host: 'untrusted.example' } } as never, response as never, next);
  return { read, response, next };
}
it('serves the sitemap inside the Express service rather than falling through to static Vite output', async () => {
  const { response, next } = await documentRequest('/sitemap.xml');
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.end).toHaveBeenCalledWith(expect.stringContaining('story=22&amp;view=overview'));
  expect(next).not.toHaveBeenCalled();
});
it('serves initial frise metadata with the trusted frontend origin even for absolute or forged request URLs', async () => {
  const { read, response } = await documentRequest('/timeline', 'https://untrusted.example/timeline?story=22&view=overview');
  expect(response.end).toHaveBeenCalledWith(expect.stringContaining('Extinctions — frise chronologique'));
  for (const [url] of read.mock.calls) expect(url.origin).toBe('https://universaltimeline.net');
});
it('does not query the public catalogue for preview sitemaps', async () => {
  const { read, response } = await documentRequest('/sitemap.xml', '/sitemap.xml', true);
  expect(read).not.toHaveBeenCalled();
  expect(response.end).toHaveBeenCalledWith(expect.not.stringContaining('<loc>'));
});
it('forces anonymous database context even when invoked inside an administrator session', async () => {
  vi.mocked(query).mockImplementation(async () => {
    expect(principalContext.getStore()).toEqual({ userId: null, isAdmin: false });
    return { rows: [{ id: 22, title_fr: 'Extinctions', description_fr: 'Crises.' }] } as never;
  });
  const network = vi.fn();
  const read = createPublicSeoRead(network);
  const response = await principalContext.run({ userId: 'administrator', isAdmin: true }, () => read(new URL('https://universaltimeline.net/api/seo/stories/22'), {}));
  expect(await response.json()).toEqual({ id: '22', title: 'Extinctions', description: 'Crises.' });
  expect(network).not.toHaveBeenCalled();
  expect(principalContext.getStore()).toBeUndefined();
});
it('honours abort before starting a public database read', async () => {
  const controller = new AbortController(); controller.abort();
  const response = await createPublicSeoRead()(new URL('https://universaltimeline.net/api/seo/stories/22'), { signal: controller.signal });
  expect(response.status).toBe(503);
  expect(query).not.toHaveBeenCalled();
});

it('returns promptly if an in-flight public database read exceeds its signal deadline', async () => {
  vi.mocked(query).mockImplementation(() => new Promise(() => {}));
  const controller = new AbortController();
  const reading = createPublicSeoRead()(new URL('https://universaltimeline.net/api/seo/stories/22'), { signal: controller.signal });
  controller.abort();
  expect((await reading).status).toBe(503);
});

it('leaves API URLs and non-document methods to their existing handlers', async () => {
  const read = vi.fn();
  const handler = createSeoPages('https://universaltimeline.net', true, read);
  const next = vi.fn();
  await handler({ method: 'GET', path: '/api/stories', originalUrl: '/api/stories' } as never, {} as never, next);
  await handler({ method: 'POST', path: '/timeline', originalUrl: '/timeline' } as never, {} as never, next);
  expect(next).toHaveBeenCalledTimes(2);
  expect(read).not.toHaveBeenCalled();
});
