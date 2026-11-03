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
    expect(result.temporalData).toEqual([{ startDate: 'M541', endDate: 'M485.4', location: 'Globale' }]);
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
  it('reads SPARQL times with their precision, astronomical year and Julian day', async () => {
    const julian = 'http://www.wikidata.org/entity/Q1985786';
    get.mockResolvedValueOnce(response([{ item: temporal().item,
      startDate: { value: '-0489-01-01T00:00:00Z' }, startDatePrecision: { value: '9' }, startDateCalendar: { value: julian },
      endDate: { value: '1066-10-20T00:00:00Z' }, endDatePrecision: { value: '11' }, endDateCalendar: { value: julian } }])).mockResolvedValueOnce(response([]));
    const result = await WikidataQueryService.getInstance().loadPeriod('Q123');
    expect(result.temporalData[0]).toMatchObject({ startDate: '490 BCE', endDate: '1066-10-14' });
    expect(get.mock.calls[0][1]?.params.query).toContain('a wikibase:BestRank; psv:P580');
  });
  it('leaves a coarse end unknown and visible instead of turning it into the present', async () => {
    get.mockResolvedValueOnce(response([{ item: temporal().item,
      startDate: { value: '1789-01-01T00:00:00Z' }, startDatePrecision: { value: '9' },
      endDate: { value: '1800-01-01T00:00:00Z' }, endDatePrecision: { value: '7' } }])).mockResolvedValueOnce(response([]));
    const result = await WikidataQueryService.getInstance().loadPeriod('Q123');
    expect(result.temporalData[0]).toMatchObject({ startDate: '1789', endDate: '' });
    expect(result.warnings?.join()).toContain('approximative');
    expect(result.childrenPreloaded).toBe(true);
  });
  it('falls back to the next readable event date', async () => {
    get.mockResolvedValueOnce(response([{ item: temporal().item,
      pointInTime: { value: '-3000-01-01T00:00:00Z' }, pointInTimePrecision: { value: '6' },
      inceptionDate: { value: '-0043-03-13T00:00:00Z' }, inceptionDatePrecision: { value: '11' }, inceptionDateCalendar: { value: 'http://www.wikidata.org/entity/Q1985786' } }]));
    const event = await WikidataQueryService.getInstance().loadEvent('Q123');
    expect(event.date).toBe('-0043-03-15');
    expect(event.warnings).toBeUndefined();
    get.mockResolvedValueOnce(response([{ item: temporal('Q124').item, pointInTime: { value: '-3000-01-01T00:00:00Z' }, pointInTimePrecision: { value: '6' } }]));
    const coarse = await WikidataQueryService.getInstance().loadEvent('Q124');
    expect(coarse.date).toBe('');
    expect(coarse.warnings?.join()).toContain('renseignez');
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
