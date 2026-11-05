import { afterEach, expect, it, vi } from 'vitest';
import { detectGenerationProfile } from '../wikidataGenerationDiscovery';
import * as transport from '../wikidataTransport';
import type { Entity } from '@/lib/wikidataGenerationModel';

afterEach(() => vi.restoreAllMocks());
it('does not classify zero-padded BCE dates as geological ages', async () => {
  const query = vi.spyOn(transport, 'sparql').mockResolvedValue([]);
  const subject = { id: 'Q1', claims: { P580: [{ mainsnak: { datavalue: { value: { time: '-00000000753-01-01T00:00:00Z' } } } }] } } as Entity;
  expect(await detectGenerationProfile('Q1', subject, {})).toBe('history');
  expect(query).toHaveBeenCalledOnce();
});
it('recognizes deep geological dates without an ancestry request', async () => {
  const query = vi.spyOn(transport, 'sparql').mockResolvedValue([]);
  const subject = { id: 'Q1', claims: { P580: [{ mainsnak: { datavalue: { value: { time: '-00201450000-01-01T00:00:00Z' } } } }] } } as Entity;
  expect(await detectGenerationProfile('Q1', subject, {})).toBe('geology');
  expect(query).not.toHaveBeenCalled();
});
