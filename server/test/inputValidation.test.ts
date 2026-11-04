// @vitest-environment node
import { beforeEach, it, expect, vi } from 'vitest';
import router from '../src/api/routes';
import { withTransaction, query } from '../src/api/database';
import { parsePeriodWrite, parseStoryWrite, parseStoryId, parseChildStories, parseEntityId } from '../src/api/inputValidation';
vi.mock('../src/api/database', () => ({ withTransaction: vi.fn(), query: vi.fn() }));

const entity = { id:'new',label:{fr:'Libellé'},wikidata_id:'Q123',date:'M65',start_date:'M65',end_date:'NOW' };
const story = {title:{fr:'Titre'},author:'Auteur'};
async function call(method: string, path: string, body: unknown, params: Record<string,unknown> = {id:'1',storyId:'1',parentId:'1',childId:'2'}, search: Record<string,unknown> = {}) {
  const layer = router.stack.find(layer => layer.route?.path===path && layer.route.methods[method]);
  if(!layer) throw new Error('Missing route');
  const res = {status:vi.fn(),json:vi.fn(),send:vi.fn()}; res.status.mockReturnValue(res);res.json.mockReturnValue(res);res.send.mockReturnValue(res);
  await layer.route.stack[0].handle({body,params,query:search},res);
  return res;
}
beforeEach(() => { vi.clearAllMocks(); vi.mocked(query).mockResolvedValue({rows:[]} as never); });
const noSql = () => { expect(withTransaction).not.toHaveBeenCalled(); expect(query).not.toHaveBeenCalled(); };
it.each([
  {targetStoryId:'2',location:null,asPeriod:'true'},
  {targetStoryId:'2',asPeriod:true},
  {targetStoryId:'2',location:{anchorType:'period'},asPeriod:true},
])('refuses malformed display preferences before SQL (%j)',async body=>{
  const res=await call('post','/stories/:sourceId/entry-points/display',body,{sourceId:'1'});
  expect(res.status).toHaveBeenCalledWith(400);noSql();
});

it.each([
  { targetStoryId: '2', to: null }, { targetStoryId: '2', from: null },
  { targetStoryId: '2', from: {}, to: null }, { targetStoryId: '2', from: null, to: { anchorType: 'period' } },
  { targetStoryId: 'invalid', from: null, to: null },
])('refuses incomplete or malformed relocation locations before opening a transaction (%j)', async body => {
  const res = await call('post', '/stories/:sourceId/entry-points/move', body, { sourceId: '1' });
  expect(res.status).toHaveBeenCalledWith(400); noSql();
});

for(const [path,valid] of [['/periods',entity],['/events',entity],['/stories',story]] as const) {
  it.each([null,[],1,'invalid'])(`POST ${path} refuses non-object bodies before SQL (%j)`, async body => {
    const res=await call('post',path,body); expect(res.status).toHaveBeenCalledWith(400); noSql();
  });
  it.each([{}, {fr:{}}, {fr:1}, {fr:'  '}, {fr:'a'.repeat(256)}, {fr:'Titre',en:[]}])(`POST ${path} refuses invalid multilingual titles before SQL (%j)`, async title => {
    const body=path==='/stories'?{...valid,title}:{...valid,label:title};
    const res=await call('post',path,body); expect(res.status).toHaveBeenCalledWith(400); noSql();
  });
  it.each([[],{fr:1},{en:{}},{fr:'a'.repeat(1001)}])(`POST ${path} refuses invalid descriptions before SQL (%j)`, async description => {
    const res=await call('post',path,{...valid,description}); expect(res.status).toHaveBeenCalledWith(400); noSql();
  });
}
it.each([null,{},[],1,'','a'.repeat(256)])('refuses a non-text or missing required date before SQL (%j)', async date => {
  const res=await call('post','/events',{...entity,date}); expect(res.status).toHaveBeenCalledWith(400); noSql();
});
it.each([0,1,'false',null,{},[]])('refuses non-boolean story visibility (%j)', async isPublic => {
  const res=await call('put','/stories/:id',{...story,isPublic}); expect(res.status).toHaveBeenCalledWith(400); noSql();
});
it.each([1,'','  ','a'.repeat(256)])('refuses an invalid author before SQL (%j)', async author => {
  const res=await call('post','/stories',{...story,author}); expect(res.status).toHaveBeenCalledWith(400); noSql();
});
it.each([undefined,null])('accepts a story without author: the account signs it (%j)', author => {
  expect(parseStoryWrite({...story,author}).author).toBeNull();
});
it.each([{},[],1,'','Q-1','Q0'])('refuses invalid Q-ids before SQL (%j)', async wikidata_id => {
  const res=await call('post','/periods',{...entity,wikidata_id}); expect(res.status).toHaveBeenCalledWith(400); noSql();
});
it.each([{},1,'','\0','id'.repeat(101)])('refuses malformed catalogue IDs while keeping historical text IDs (%j)', async id => {
  const res=await call('post','/events',{...entity,id}); expect(res.status).toHaveBeenCalledWith(400); noSql();
});
it.each([null,{},[''],Array.from({length:501},()=>({id:'cat'})),[{id:'\0'}]])('refuses malformed category selections before SQL', async categories => {
  const res=await call('post','/stories',{...story,categories}); expect(res.status).toHaveBeenCalledWith(400); noSql();
});
it.each(['0','-1','01','2147483648','1e2','1.2','not-a-story'])('refuses an invalid story path ID (%s)', async id => {
  const res=await call('delete','/stories/:id',{}, {id}); expect(res.status).toHaveBeenCalledWith(400); noSql();
});
it('validates anchor type on deletion as well as insertion', async () => {
  for(const method of ['post','delete']) {
    const res=await call(method,'/stories/:storyId/anchors',{anchorType:'anything',anchorId:'valid'});
    expect(res.status).toHaveBeenCalledWith(400);
  }
  noSql();
});
it('refuses an invalid association operation before opening a transaction', async () => {
  const res=await call('post','/stories/:storyId/periods',{ids:['p'],operation:'replace'});
  expect(res.status).toHaveBeenCalledWith(400);noSql();
});
it('refuses object/array query parameters instead of coercing them into strings', async () => {
  for(const search of [{q:['a','b']},{q:'a',category:{}},{q:'a',only:['periods']},{q:'a',only:'other'}]) {
    expect((await call('get','/search',{}, {},search)).status).toHaveBeenCalledWith(400);
  }
  expect((await call('get','/stories/suggestions',{}, {},{story_id:'1',period_ids:['a']})).status).toHaveBeenCalledWith(400);
  noSql();
});
it('filters both entity searches with the actual varchar category ID contract', async () => {
  const res=await call('get','/search',{}, {},{q:'label',category:'legacy-category'});
  expect(res.json).toHaveBeenCalledWith({periods:[],events:[]});
  expect(query).toHaveBeenCalledTimes(2);
  for(const [sql,params] of vi.mocked(query).mock.calls) {
    expect(sql).toContain('category_id'); expect(sql).not.toContain('::uuid'); expect(params).toEqual(['label','legacy-category']);
  }
});
it('normalizes recognized keys without accepting a client-supplied owner or identifier for a story', () => {
  const data=parseStoryWrite({...story,isPublic:false,owner_user_id:'forged',id:10});
  expect(data.isPublic).toBe(false);expect(data).not.toHaveProperty('owner_user_id');expect(data).not.toHaveProperty('id');
  expect(parseStoryWrite(story).isPublic).toBeUndefined();
});
it('preserves free historical dates, explicit null parents and omitted/empty category semantics', () => {
  const data=parsePeriodWrite({...entity,start_date:'8. millennium BCE',end_date:'',parent_id:null},true);
  expect(data.start_date).toBe('8. millennium BCE');expect(data.end_date).toBe('NOW');expect(data).not.toHaveProperty('parentId');expect(data.categories).toBeUndefined();
  expect(parsePeriodWrite({...entity,categories:[]},false).categories).toEqual([]);
  expect(parsePeriodWrite({...entity,wikidata_id:' q123 '},true).wikidata_id).toBe('Q123');
  expect(parseEntityId('PER_SOLAR_SYS')).toBe('PER_SOLAR_SYS');
});
it('keeps the numeric legacy child-story payload compatible, with int4 range checks', () => {
  expect(parseChildStories({childStoryId:2})).toEqual({multiple:false,ids:['2']});
  expect(parseStoryId(2147483647)).toBe('2147483647');
  expect(()=>parseChildStories({childStoryIds:[2147483648]})).toThrow();
});
it('validates descriptions without stripping their deliberate whitespace and line breaks', () => {
  const description={fr:'\n  Premier paragraphe\n\nSecond paragraphe\n',en:'  Text\n'};
  expect(parseStoryWrite({...story,description}).description).toEqual(description);
});
it.each([
  ['M10','M65'],['M65','M65'],['NOW','M65'],['2024-02-30','NOW'],
  ['1944-06-06T14:32:01Z','1944-06-06T14:32:00Z'],
])('rejects an invalid temporal interval before SQL: %s → %s', async (start_date,end_date) => {
  const res=await call('post','/periods',{id:'period',wikidata_id:'Q123',label:{fr:'Période'},start_date,end_date});
  expect(res.status).toHaveBeenCalledWith(400);expect(query).not.toHaveBeenCalled();expect(withTransaction).not.toHaveBeenCalled();
});
