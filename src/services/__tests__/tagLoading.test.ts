import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { TagService } from '@/services/TagService';
import { apiClient } from '@/services/ApiClient';
import { SupersededRequestError } from '@/lib/requestCache';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
beforeEach(() => { vi.resetAllMocks(); TagService.getInstance().clearCache(); });
afterEach(() => vi.restoreAllMocks());

it('shares tag reads and caches an empty successful result', async () => {
  vi.mocked(apiClient.get).mockResolvedValue([]);
  const service = TagService.getInstance();
  expect(await Promise.all([service.getTags(), service.getTags()])).toEqual([[], []]);
  expect(await service.getTags()).toEqual([]);
  expect(apiClient.get).toHaveBeenCalledExactlyOnceWith('/tags');
});

it('propagates a tag outage to both callers and retries with the stored grid', async () => {
  const outage = new Error('Hors ligne');
  vi.mocked(apiClient.get).mockRejectedValueOnce(outage).mockResolvedValueOnce([{ id: 'conflits', label: { fr: 'Conflits', en: 'Conflicts' }, family: 'societes', position: 6, parentId: null }]);
  const service = TagService.getInstance();
  const results = await Promise.allSettled([service.getTags(), service.getTags()]);
  expect(results).toEqual([{ status: 'rejected', reason: outage }, { status: 'rejected', reason: outage }]);
  expect(await service.getTags()).toEqual([{ id: 'conflits', label: { fr: 'Conflits', en: 'Conflicts' }, family: 'societes', position: 6, parentId: null }]);
  expect(apiClient.get).toHaveBeenCalledTimes(2);
});

it('ignores pending tags after clearing their cache', async () => {
  let complete!: (value: any) => void;
  vi.mocked(apiClient.get).mockReturnValueOnce(new Promise(resolve => { complete = resolve; })).mockResolvedValueOnce([]);
  const service = TagService.getInstance();
  const old = service.getTags().catch(cause => cause); await flushPromises();
  service.clearCache(); complete([{ id: 'old', label: { fr: 'Ancienne' }, family: 'societes', position: 1 }]);
  expect(await old).toBeInstanceOf(SupersededRequestError);
  expect(await service.getTags()).toEqual([]);
});
