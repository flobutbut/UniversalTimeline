import { expect, it, vi } from 'vitest';
import { createRequestCache } from '../requestCache';
it('keeps a shared transport alive until its last consumer cancels, then allows a fresh read', async () => {
  const cache = createRequestCache(() => {});
  let transport!: AbortSignal;
  const fetch = vi.fn((signal: AbortSignal) => {
    transport = signal;
    return new Promise<number>((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('cancel', 'AbortError'))));
  });
  const first = new AbortController(), second = new AbortController(), apply = vi.fn();
  const a = cache.load('detail', fetch, apply, false, first.signal);
  const b = cache.load('detail', fetch, apply, false, second.signal);
  const refusedA = expect(a).rejects.toMatchObject({ name: 'AbortError' });
  const refusedB = expect(b).rejects.toMatchObject({ name: 'AbortError' });
  await Promise.resolve();
  first.abort(); await refusedA; expect(transport.aborted).toBe(false);
  second.abort(); await refusedB; expect(transport.aborted).toBe(true);
  await cache.load('detail', async () => 42, apply);
  expect(fetch).toHaveBeenCalledTimes(1); expect(apply).toHaveBeenCalledExactlyOnceWith(42);
});
it('does not publish a response from a transport that ignores cancellation', async () => {
  const cache = createRequestCache(() => {}), controller = new AbortController(), apply = vi.fn();
  let resolve!: (value: number) => void;
  const pending = cache.load('detail', () => new Promise<number>(yes => { resolve = yes; }), apply, false, controller.signal);
  const refused = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  await Promise.resolve(); controller.abort(); await refused; resolve(1);
  await new Promise(yes => setTimeout(yes, 0)); expect(apply).not.toHaveBeenCalled();
});
