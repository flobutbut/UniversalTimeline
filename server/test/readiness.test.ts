// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { createReadiness } from '../src/runtime/readiness';
afterEach(() => vi.useRealTimers());
it('shares startup checks and never admits data after a failed schema check', async () => {
  vi.useFakeTimers();
  const error = new Error('schema unavailable');
  const check = vi.fn().mockRejectedValueOnce(error).mockResolvedValue(true);
  const ready = createReadiness(check);
  const first = ready(), second = ready();
  await expect(first).rejects.toBe(error); await expect(second).rejects.toBe(error);
  await expect(ready()).rejects.toBe(error); expect(check).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(2001);
  await ready(); await ready(); expect(check).toHaveBeenCalledTimes(2);
});
