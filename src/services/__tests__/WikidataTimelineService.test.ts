import { clearWikidataCache } from '../wikidataTransport';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import axios from 'axios';
import { WikidataQueryService } from '../WikidataQueryService';

vi.mock('axios');
const get = vi.mocked(axios.get);
const response = (bindings: object[]) => ({ data: { results: { bindings } } });
const temporal = (qid = 'Q123') => ({
  item: { value: `http://www.wikidata.org/entity/${qid}` },
  itemLabelFr: { value: 'Période' }, itemLabelEn: { value: 'Period' },
  startDate: { value: '-541000000-01-01T00:00:00Z' }, endDate: { value: '-485400000-01-01T00:00:00Z' },
});

beforeEach(() => { clearWikidataCache();
  get.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Wikidata detailed periods', () => {
  it('reuses the service instance', () => {
    expect(WikidataQueryService.getInstance()).toBe(WikidataQueryService.getInstance());
  });
  it('maps multilingual labels and one interval and loads the children separately', async () => {
    get.mockResolvedValueOnce(response([temporal()])).mockResolvedValueOnce(response([]));
    const result = await WikidataQueryService.getInstance().loadPeriod('Q123');
    expect(result.label).toEqual({ fr: 'Période', en: 'Period' });
    expect(result.temporalData).toEqual([{ startDate: '-541000000-01-01T00:00:00Z', endDate: '-485400000-01-01T00:00:00Z', location: 'Globale' }]);
    expect(result.children).toEqual([]);
    expect(get).toHaveBeenCalledTimes(2);
  });
  it('marks a parent as navigable when real children have been loaded', async () => {
    get.mockResolvedValueOnce(response([temporal()]))
      .mockResolvedValueOnce(response([{ child: { value: 'http://www.wikidata.org/entity/Q456' }, childLabel: { value: 'Enfant' } }]));
    const result = await WikidataQueryService.getInstance().loadPeriod('Q123');
    expect(result.hasChildren).toBe(true);
    expect(result.children.map(child => child.id)).toEqual(['Q456']);
  });
  it('preserves missing dates without synthesizing a beginning', async () => {
    get.mockResolvedValueOnce(response([{ item: temporal().item }])).mockResolvedValueOnce(response([]));
    const result = await WikidataQueryService.getInstance().loadPeriod('Q123');
    expect(result.label).toEqual({ fr: '', en: '' });
    expect(result.temporalData[0]).toMatchObject({ startDate: '', endDate: 'TODAY' });
    expect(result.hasChildren).toBe(false);
  });
  it('retries a persistent network failure and propagates the original cause', async () => {
    vi.useFakeTimers();
    get.mockRejectedValue(new Error('Network error'));
    const rejected = expect(WikidataQueryService.getInstance().loadPeriod('Q123')).rejects.toThrow('Wikidata');
    await vi.runAllTimersAsync();
    await rejected;
    expect(get).toHaveBeenCalledTimes(3);
  });

});
