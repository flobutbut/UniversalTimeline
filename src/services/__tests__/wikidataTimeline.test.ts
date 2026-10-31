import { clearWikidataCache } from '../wikidataTransport';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import axios from 'axios';
import { WikidataQueryService } from '../WikidataQueryService';
vi.mock('axios');
const get = vi.mocked(axios.get);
beforeEach(() => { clearWikidataCache(); get.mockReset(); });
afterEach(() => { vi.useRealTimers(); });

describe('Wikidata finder summaries', () => {
  it('loads a multilingual child summary with one bounded request', async () => {
    get.mockResolvedValue({ data: { results: { bindings: [{
      child: { value: 'http://www.wikidata.org/entity/Q456' }, childLabel: { value: 'Cambrien' },
      startDate: { value: '-541000000-01-01T00:00:00Z' }, childCount: { value: '2' },
    }] } } });
    const children = await WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId('Q123');
    expect(children).toHaveLength(1);
    expect(children[0]).toMatchObject({ id: 'Q456', hasChildren: true });
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/api/wikidata/sparql', expect.objectContaining({ timeout: 30000 }));
  });
  it('returns an empty list when Wikidata has no children', async () => {
    get.mockResolvedValue({ data: { results: { bindings: [] } } });
    expect(await WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId('Q123')).toEqual([]);
  });
  it('keeps finder retries bounded on a persistent network failure', async () => {
    vi.useFakeTimers(); get.mockRejectedValue(new Error('Network error'));
    const rejected = expect(WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId('Q123')).rejects.toThrow('Wikidata');
    await vi.runAllTimersAsync(); await rejected;
    expect(get).toHaveBeenCalledTimes(3);
  });
});
