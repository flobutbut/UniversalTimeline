import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { CategoryService } from '@/services/CategoryService';
import { apiClient } from '@/services/ApiClient';
import { SupersededRequestError } from '@/lib/requestCache';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
beforeEach(() => { vi.resetAllMocks(); CategoryService.getInstance().clearCache(); });
afterEach(() => vi.restoreAllMocks());

it('shares category reads and caches an empty successful result', async () => {
  vi.mocked(apiClient.get).mockResolvedValue([]);
  const service = CategoryService.getInstance();
  expect(await Promise.all([service.getCategories(), service.getCategories()])).toEqual([[], []]);
  expect(await service.getCategories()).toEqual([]);
  expect(apiClient.get).toHaveBeenCalledExactlyOnceWith('/categories');
});

it('propagates a category outage to both callers and retries with real API IDs', async () => {
  const outage = new Error('Hors ligne');
  vi.mocked(apiClient.get).mockRejectedValueOnce(outage).mockResolvedValueOnce([{ id: 'real-uuid', label_fr: 'Réelle' }]);
  const service = CategoryService.getInstance();
  const results = await Promise.allSettled([service.getCategories(), service.getCategories()]);
  expect(results).toEqual([{ status: 'rejected', reason: outage }, { status: 'rejected', reason: outage }]);
  expect(await service.getCategories()).toEqual([{ id: 'real-uuid', label: 'Réelle', description: undefined }]);
  expect(apiClient.get).toHaveBeenCalledTimes(2);
});

it('ignores pending categories after clearing their cache', async () => {
  let complete!: (value: any) => void;
  vi.mocked(apiClient.get).mockReturnValueOnce(new Promise(resolve => { complete = resolve; })).mockResolvedValueOnce([]);
  const service = CategoryService.getInstance();
  const old = service.getCategories().catch(cause => cause); await flushPromises();
  service.clearCache(); complete([{ id: 'old', label_fr: 'Ancienne' }]);
  expect(await old).toBeInstanceOf(SupersededRequestError);
  expect(await service.getCategories()).toEqual([]);
});
