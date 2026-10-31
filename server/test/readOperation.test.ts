// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { readOperation, ReadFailure, retryAfterMilliseconds } from '../src/shared/readOperation';
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
it('bounds transient failures to three attempts and propagates their safe error',async()=>{
  const load=vi.fn().mockRejectedValue(new ReadFailure('busy',true));const result=expect(readOperation(load)).rejects.toThrow('busy');await vi.runAllTimersAsync();await result;expect(load).toHaveBeenCalledTimes(3);
});
it('does not retry an invalid response or permanent failure',async()=>{
  const load=vi.fn().mockRejectedValue(new ReadFailure('invalid'));await expect(readOperation(load)).rejects.toThrow('invalid');expect(load).toHaveBeenCalledOnce();
});
it('honors Retry-After rather than retrying immediately',async()=>{
  const load=vi.fn().mockRejectedValueOnce(new ReadFailure('busy',true,5000)).mockResolvedValue('ok');const result=readOperation(load);
  await vi.advanceTimersByTimeAsync(4999);expect(load).toHaveBeenCalledOnce();await vi.advanceTimersByTimeAsync(1);expect(await result).toBe('ok');expect(load).toHaveBeenCalledTimes(2);
});
it('stops instead of violating Retry-After when the advised wait exceeds the deadline',async()=>{
  const load=vi.fn().mockRejectedValue(new ReadFailure('busy',true,60000));await expect(readOperation(load,{timeoutMs:10000})).rejects.toThrow('busy');expect(load).toHaveBeenCalledOnce();
});
it('stops a never-settling read at the deadline and aborts its underlying signal',async()=>{
  const load=vi.fn((_signal:AbortSignal)=>new Promise(()=>{}));const result=expect(readOperation(load,{timeoutMs:1000})).rejects.toThrow('temps');
  await vi.advanceTimersByTimeAsync(1000);await result;expect(load.mock.calls[0][0].aborted).toBe(true);expect(vi.getTimerCount()).toBe(0);
});
it('cancels backoff and prevents any subsequent retry',async()=>{
  const controller=new AbortController();const load=vi.fn().mockRejectedValue(new ReadFailure('busy',true));const result=expect(readOperation(load,{signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});
  await vi.advanceTimersByTimeAsync(1);controller.abort();await result;await vi.runAllTimersAsync();expect(load).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
it('never starts an already-cancelled read',async()=>{
  const controller=new AbortController();controller.abort();const load=vi.fn();await expect(readOperation(load,{signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});expect(load).not.toHaveBeenCalled();
});
it.each([['3',3000],['bad',undefined],['',undefined],['Thu, 29 Oct 2026 12:00:05 GMT',5000]] as const)('parses Retry-After %s', (raw,expected)=>{
  expect(retryAfterMilliseconds(raw,Date.parse('2026-10-29T12:00:00Z'))).toBe(expected);
});
