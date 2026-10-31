import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createReadCache } from '../readCache';
const deferred = <T>() => { let resolve!: (value:T)=>void; let reject!: (error:Error)=>void; const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; };
const make = (maxEntries=2) => createReadCache<{items:string[]}>({maxEntries,maxPending:2,ttlMs:1000,copy:value=>structuredClone(value)});
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
it('shares one pending read and isolates the objects returned to all consumers',async()=>{
  const cache=make(), pending=deferred<{items:string[]}>(), load=vi.fn(()=>pending.promise);
  const a=cache.read('a',load), b=cache.read('a',load);await Promise.resolve();expect(load).toHaveBeenCalledOnce();
  pending.resolve({items:['one']});const [first,second]=await Promise.all([a,b]);first.items.push('changed');
  expect(second.items).toEqual(['one']);expect(await cache.read('a',load)).toEqual({items:['one']});expect(load).toHaveBeenCalledOnce();
});
it('remembers successful empty reads until expiry, then reads again',async()=>{
  const cache=make(), load=vi.fn().mockResolvedValue({items:[]});await cache.read('a',load);await cache.read('a',load);expect(load).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(1001);await cache.read('a',load);expect(load).toHaveBeenCalledTimes(2);
});
it('never caches failures and allows an immediate successful retry',async()=>{
  const cache=make(), load=vi.fn().mockRejectedValueOnce(new Error('failure')).mockResolvedValue({items:[]});
  await expect(cache.read('a',load)).rejects.toThrow('failure');await expect(cache.read('a',load)).resolves.toEqual({items:[]});expect(load).toHaveBeenCalledTimes(2);
});
it('evicts the least recently used value while keeping memory bounded',async()=>{
  const cache=make(), load=vi.fn().mockResolvedValue({items:[]});await cache.read('a',load);await cache.read('b',load);await cache.read('a',load);await cache.read('c',load);
  await cache.read('a',load);expect(load).toHaveBeenCalledTimes(3);await cache.read('b',load);expect(load).toHaveBeenCalledTimes(4);
});
it('cancels a reader without aborting another subscriber to the same request',async()=>{
  const cache=make(), pending=deferred<{items:string[]}>(), load=vi.fn(()=>pending.promise), controller=new AbortController();
  const a=cache.read('a',load,{signal:controller.signal}), b=cache.read('a',load);const rejected=expect(a).rejects.toMatchObject({name:'AbortError'});
  await Promise.resolve();controller.abort();await rejected;expect(load.mock.calls[0][0].aborted).toBe(false);
  pending.resolve({items:['result']});expect(await b).toEqual({items:['result']});
});
it('aborts the underlying read after the last cancellation and ignores its late result',async()=>{
  const cache=make(), pending=deferred<{items:string[]}>(), controller=new AbortController();const load=vi.fn((_signal:AbortSignal)=>pending.promise);
  const a=cache.read('a',load,{signal:controller.signal});const rejected=expect(a).rejects.toMatchObject({name:'AbortError'});await Promise.resolve();controller.abort();await rejected;
  expect(load.mock.calls[0][0].aborted).toBe(true);const next=vi.fn().mockResolvedValue({items:['new']});expect(await cache.read('a',next)).toEqual({items:['new']});
  pending.resolve({items:['stale']});await Promise.resolve();await Promise.resolve();expect(await cache.read('a',next)).toEqual({items:['new']});expect(next).toHaveBeenCalledOnce();
});
it('does not start a request for an already-aborted caller, even with a warm cache',async()=>{
  const cache=make(), load=vi.fn().mockResolvedValue({items:[]});await cache.read('a',load);const controller=new AbortController();controller.abort();
  await expect(cache.read('a',load,{signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});expect(load).toHaveBeenCalledOnce();
});
it('clear cancels readers, prevents a late overwrite and removes settled values',async()=>{
  const cache=make(), load=vi.fn().mockResolvedValue({items:['cached']});await cache.read('cached',load);
  const pending=deferred<{items:string[]}>();const a=cache.read('a',()=>pending.promise);const rejected=expect(a).rejects.toMatchObject({name:'AbortError'});await Promise.resolve();cache.clear();await rejected;
  pending.resolve({items:['old']});await Promise.resolve();await cache.read('cached',load);expect(load).toHaveBeenCalledTimes(2);
  expect(await cache.read('a',load)).toEqual({items:['cached']});expect(load).toHaveBeenCalledTimes(3);
});
it('a forced read bypasses a settled value but still joins an existing pending read',async()=>{
  const cache=make(), load=vi.fn().mockResolvedValue({items:['old']});await cache.read('a',load);
  const pending=deferred<{items:string[]}>(), fresh=vi.fn(()=>pending.promise);const a=cache.read('a',fresh,{force:true}), b=cache.read('a',fresh,{force:true});
  pending.resolve({items:['fresh']});expect(await a).toEqual({items:['fresh']});expect(await b).toEqual({items:['fresh']});expect(fresh).toHaveBeenCalledOnce();
});
it('limits distinct pending work without rejecting readers of an already-shared key',async()=>{
  const cache=make(), pending=deferred<{items:string[]}>();const a=cache.read('a',()=>pending.promise), b=cache.read('b',()=>pending.promise), shared=cache.read('a',()=>pending.promise);
  await expect(cache.read('c',()=>pending.promise)).rejects.toThrow('simultanées');pending.resolve({items:[]});await Promise.all([a,b,shared]);
});
