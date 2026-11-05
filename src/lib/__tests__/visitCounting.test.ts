import { expect, it, vi } from 'vitest';

const vercel = vi.hoisted(() => ({ inject: vi.fn() }));
vi.mock('@vercel/analytics', () => vercel);
import { createPathOnlyFilter, installVisitCounting } from '@/lib/visitCounting';

const env = (values: Record<string, unknown>) => values as unknown as ImportMetaEnv;

it('sends only the path, never identifiers or auth secrets of the query', () => {
  const filter = createPathOnlyFilter('https://universaltimeline.net');
  expect(filter({ type: 'pageview', url: 'https://universaltimeline.net/reset-password?token_hash=secret&type=recovery' }))
    .toEqual({ type: 'pageview', url: 'https://universaltimeline.net/reset-password' });
  expect(filter({ type: 'event', url: '/timeline?story=8#x' })).toEqual({ type: 'event', url: 'https://universaltimeline.net/timeline' });
});

it('sends nothing for a visitor who objected or a device of the publisher', () => {
  let allowed = true;
  const filter = createPathOnlyFilter('https://universaltimeline.net', () => allowed);
  expect(filter({ type: 'pageview', url: '/' })).not.toBeNull();
  allowed = false;
  expect(filter({ type: 'pageview', url: '/timeline' })).toBeNull();
});

it('counts one visit per page, not one per position of the Exploration', () => {
  const filter = createPathOnlyFilter('https://universaltimeline.net');
  const view = (url: string) => filter({ type: 'pageview', url });
  expect(view('/timeline?story=1')).not.toBeNull();
  expect(view('/timeline?story=1&period=PER_SOLAR_SYS')).toBeNull();
  expect(view('/database')).not.toBeNull();
  expect(view('/timeline?story=7')).not.toBeNull();
});

it('loads the Vercel script only in a production build', () => {
  installVisitCounting(() => true, env({ PROD: false }));
  expect(vercel.inject).not.toHaveBeenCalled();
  installVisitCounting(() => true, env({ PROD: true }));
  expect(vercel.inject).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ mode: 'production', debug: false, beforeSend: expect.any(Function) }));
});
