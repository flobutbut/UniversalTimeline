import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import axios from 'axios';
import { sparql, mediaWiki, clearWikidataCache } from '../wikidataTransport';
import { WikidataQueryService } from '../WikidataQueryService';
import { SearchApiService } from '../SearchApiService';
vi.mock('axios');
vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
const get=vi.mocked(axios.get), fetchMock=vi.fn();
const json=(data:unknown,status=200,headers:Record<string,string>={})=>({ok:status>=200&&status<300,status,headers:new Headers(headers),json:async()=>data}) as Response;
const response=(bindings:object[])=>({data:{results:{bindings}}});
const temporal={item:{value:'http://www.wikidata.org/entity/Q123'},itemLabelFr:{value:'Période'},startDate:{value:'M65'}};
const base='https://www.wikidata.org/w/api.php';
const search=(query='same')=>`${base}?${new URLSearchParams({action:'wbsearchentities',search:query,language:'fr',format:'json'})}`;
beforeEach(()=>{clearWikidataCache();get.mockReset();fetchMock.mockReset();vi.stubGlobal('fetch',fetchMock);vi.spyOn(console,'log').mockImplementation(()=>{});});
afterEach(()=>{clearWikidataCache();vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();});
it('shares and expires public SPARQL successes including empty results, without sharing mutable objects',async()=>{
  vi.useFakeTimers();get.mockResolvedValue(response([{class:{value:'Q5'}}]));
  const [a,b]=await Promise.all([sparql('SELECT'),sparql('SELECT')]);expect(get).toHaveBeenCalledOnce();a[0].class.value='changed';expect(b[0].class.value).toBe('Q5');
  expect((await sparql('SELECT'))[0].class.value).toBe('Q5');await vi.advanceTimersByTimeAsync(300001);await sparql('SELECT');expect(get).toHaveBeenCalledTimes(2);
  get.mockResolvedValue(response([]));expect(await sparql('EMPTY')).toEqual([]);expect(await sparql('EMPTY')).toEqual([]);expect(get).toHaveBeenCalledTimes(3);
});
it('keeps endpoint and full query/language configuration in the key',async()=>{
  get.mockResolvedValue(response([]));await sparql('SELECT fr');await sparql('SELECT en');vi.stubEnv('VITE_WIKIDATA_SPARQL_URL','https://example.org/sparql');await sparql('SELECT fr');expect(get).toHaveBeenCalledTimes(3);
});
it.each([{}, {results:{}}, {results:{bindings:null}}, {results:{bindings:[null]}}, {results:{bindings:[{item:{value:123}}]}}, {error:{code:'bad'},results:{bindings:[]}}])('does not cache a malformed SPARQL response: %j',async data=>{
  get.mockResolvedValueOnce({data}).mockResolvedValueOnce(response([]));await expect(sparql('BAD')).rejects.toThrow('invalide');expect(await sparql('BAD')).toEqual([]);expect(get).toHaveBeenCalledTimes(2);
});
it('normalizes Q-ids before caching/import and rejects injection before a request',async()=>{
  get.mockResolvedValueOnce(response([temporal])).mockResolvedValueOnce(response([]));const service=WikidataQueryService.getInstance();
  await service.loadPeriod(' q123 ');await service.loadPeriod('Q123');expect(get).toHaveBeenCalledTimes(2);
  await expect(service.loadPeriod('Q123 } SERVICE')).rejects.toThrow('Q-id');expect(get).toHaveBeenCalledTimes(2);
});
it('loads period children with one summary query and no per-child fan-out',async()=>{
  get.mockResolvedValueOnce(response([temporal])).mockResolvedValueOnce(response(Array.from({length:150},(_,i)=>({child:{value:`http://www.wikidata.org/entity/Q${i+1}`},childLabel:{value:`Enfant ${i}`}}))));
  const result=await WikidataQueryService.getInstance().loadPeriod('Q123');expect(result.children).toHaveLength(150);expect(get).toHaveBeenCalledTimes(2);expect(result.childrenPreloaded).toBe(true);
  expect(get.mock.calls[1][1]?.params.query).toContain('LIMIT 400');
});
it('projects temporal qualifiers used by the period fallback',async()=>{
  get.mockResolvedValueOnce(response([{item:temporal.item,itemLabelFr:temporal.itemLabelFr,startDateQualifier:{value:'M65'},endDateQualifier:{value:'M8'}}])).mockResolvedValueOnce(response([]));
  const period=await WikidataQueryService.getInstance().loadPeriod('Q123');
  expect(period.temporalData[0]).toMatchObject({startDate:'M65',endDate:'M8'});
  expect(get.mock.calls[0][1]?.params.query.split('WHERE')[0]).toContain('?startDateQualifier ?endDateQualifier');
});
it('returns the main period with an explicit unknown child count after an optional failure',async()=>{
  get.mockImplementation(async(_url,config)=>String(config?.params?.query).includes('?child ?childLabel')?{data:{}}:response([temporal]));
  const period=await WikidataQueryService.getInstance().loadPeriod('Q123');expect(period.label.fr).toBe('Période');expect(period.childrenPreloaded).toBe(false);expect(period.warnings?.join()).toContain('indéterminé');
});
it('does not mistake a truncated list for an exact child count',async()=>{
  get.mockResolvedValueOnce(response([temporal])).mockResolvedValueOnce(response(Array.from({length:400},(_,i)=>({child:{value:`http://www.wikidata.org/entity/Q${i+1}`}}))));
  const result=await WikidataQueryService.getInstance().loadPeriod('Q123');expect(result.childrenPreloaded).toBe(false);expect(result.warnings?.join()).toContain('exact');
});
it('caches successful MediaWiki emptiness for one minute and normalizes URL parameter order',async()=>{
  vi.useFakeTimers();fetchMock.mockResolvedValue(json({search:[]}));await mediaWiki(search());const parsed=new URL(search());parsed.searchParams.sort();await mediaWiki(parsed.toString());expect(fetchMock).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(60001);await mediaWiki(search());expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('separates unrestricted/event search and global result limits',async()=>{
  fetchMock.mockResolvedValue(json({search:[]}));const api=SearchApiService.getInstance();await api.searchWikidataEntityLabels('test');await api.searchWikidataEntityLabels('test',{restrictToEventConcepts:true});await api.searchWikidata('test');expect(fetchMock).toHaveBeenCalledTimes(3);
});
it.each([{}, {search:[null]}, {search:[{id:'bad'}]}, {search:[{id:'Q1',label:12}]}, {error:{code:'badsearch'}}])('does not retain malformed/logical MediaWiki failures: %j',async data=>{
  fetchMock.mockResolvedValueOnce(json(data)).mockResolvedValueOnce(json({search:[]}));await expect(mediaWiki(search())).rejects.toThrow('Wikidata');expect(await mediaWiki(search())).toEqual({search:[]});expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('distinguishes a missing entity from an incomplete response and shares parent claims with search reads',async()=>{
  const url=`${base}?${new URLSearchParams({action:'wbgetentities',ids:'Q123',props:'claims',languages:'fr',format:'json',origin:'*'})}`;
  fetchMock.mockResolvedValueOnce(json({entities:{}})).mockResolvedValueOnce(json({entities:{Q123:{missing:''}}}));
  await expect(mediaWiki(url)).rejects.toThrow('invalide');expect(await WikidataQueryService.getInstance().getPartOfParentQid('Q123')).toBeNull();await mediaWiki(url);expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('normalizes returned entity keys before reading parent claims',async()=>{
  fetchMock.mockResolvedValue(json({entities:{q123:{claims:{P361:[{mainsnak:{snaktype:'value',datavalue:{value:{id:'Q456'}}}}]}}}}));
  expect(await WikidataQueryService.getInstance().getPartOfParentQid('Q123')).toBe('Q456');
});
it.each([{entities:{Q123:{claims:[]}}},{entities:{Q123:{claims:{P31:{}}}}},{entities:{Q123:{claims:{P585:[{mainsnak:{datavalue:{value:{time:1}}}}]}}}}])('rejects malformed claims before caching: %j',async data=>{
  fetchMock.mockResolvedValue(json(data));await expect(mediaWiki(`${base}?action=wbgetentities&ids=Q123`)).rejects.toThrow('invalide');
});
it('cancels the last MediaWiki subscriber, stops a hanging transport and permits retry',async()=>{
  vi.useFakeTimers();fetchMock.mockImplementationOnce(()=>new Promise(()=>{})).mockResolvedValue(json({search:[]}));const controller=new AbortController();const result=expect(mediaWiki(search(),{signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});
  await vi.advanceTimersByTimeAsync(0);const signal=fetchMock.mock.calls[0][1].signal;controller.abort();await result;expect(signal.aborted).toBe(true);expect(await mediaWiki(search())).toEqual({search:[]});
});
it('times out a hanging MediaWiki reader without storing an empty successful result',async()=>{
  vi.useFakeTimers();fetchMock.mockImplementationOnce(()=>new Promise(()=>{})).mockResolvedValue(json({search:[]}));const result=expect(mediaWiki(search())).rejects.toThrow('temps');await vi.advanceTimersByTimeAsync(15000);await result;
  expect(await mediaWiki(search())).toEqual({search:[]});expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('a forced retry refreshes settled detail data and a public SPARQL error retries only its failed query',async()=>{
  vi.useFakeTimers();get.mockResolvedValueOnce(response([temporal])).mockRejectedValueOnce({response:{status:503}}).mockResolvedValue(response([]));
  const load=WikidataQueryService.getInstance().loadPeriod('Q123');await vi.runAllTimersAsync();await load;expect(get).toHaveBeenCalledTimes(3);
  expect(get.mock.calls.filter(call=>String(call[1]?.params.query).includes('itemLabelFr'))).toHaveLength(1);
  await sparql('NEW');await sparql('NEW',{force:true});expect(get).toHaveBeenCalledTimes(5);
});
