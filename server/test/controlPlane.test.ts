// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { createApp } from '../src/app';
import { apiErrorHandler, logServerError, publicApiError, sendApiError } from '../src/api/errors';
import { InvalidCategoriesError } from '../src/api/entityCategories';
import { PeriodHierarchyError } from '../src/domain/errors';
import { PeriodDeletionError } from '../src/domain/errors';
import { createShutdown } from '../src/runtime/shutdown';

const response = () => { const res = { status: vi.fn(), json: vi.fn(), headersSent: false }; res.status.mockReturnValue(res); return res; };
const privateError = Object.assign(new Error('password=secret SELECT private_column FROM private_table'), { stack: 'private stack', detail: 'private row', query: 'SELECT private', code: 'XX000' });
function deferred() { let resolve!: () => void; const promise = new Promise<void>(yes => { resolve = yes; }); return { promise, resolve }; }
beforeEach(() => { vi.useFakeTimers(); vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'log').mockImplementation(() => {}); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

it.each([['23505', 409], ['23503', 409], ['42501', 403], ['22P02', 400], ['55P03', 503], ['40P01', 503], ['40001', 503], ['08006', 503], ['ECONNREFUSED', 503], ['XX000', 500]] as const)('maps code %s without exposing its private message', (code, status) => {
  const res = response(); sendApiError(res as any, { ...privateError, code }, 'Échec de l’opération');
  expect(res.status).toHaveBeenCalledWith(status);
  const json = JSON.stringify(res.json.mock.calls);
  expect(json).not.toMatch(/secret|private|SELECT|stack|detail|password/);
  expect(Object.keys(res.json.mock.calls[0][0])).toEqual(['error']);
});

it('preserves explicit domain refusals but never trusts an arbitrary error status/message', () => {
  expect(publicApiError(new InvalidCategoriesError(), 'Échec').status).toBe(400);
  expect(publicApiError(new PeriodHierarchyError(409, 'Cycle refusé'), 'Échec')).toEqual({ status: 409, message: 'Cycle refusé' });
  expect(publicApiError(new PeriodDeletionError(404, 'Période absente'), 'Échec')).toEqual({ status: 404, message: 'Période absente' });
  expect(publicApiError({ status: 400, message: 'Private SQL' }, 'Échec')).toEqual({ status: 500, message: 'Échec' });
});

it.each([['entity.parse.failed', 400], ['entity.too.large', 413]] as const)('handles JSON middleware error %s without reflecting its body', (type, status) => {
  const res = response(); apiErrorHandler({ type, body: 'secret', message: 'Private body' }, {} as any, res as any, vi.fn());
  expect(res.status).toHaveBeenCalledWith(status); expect(JSON.stringify(res.json.mock.calls)).not.toMatch(/secret|Private/);
});

it('delegates to Express if headers have already been sent', () => {
  const res = response(); res.headersSent = true; const next = vi.fn();
  apiErrorHandler(privateError, {} as any, res as any, next);
  expect(next).toHaveBeenCalledOnce(); expect(next.mock.calls[0][0].message).toBe('La réponse a été interrompue.');
  expect(next.mock.calls[0][0].stack).toBeUndefined(); expect(res.json).not.toHaveBeenCalled();
});

it('logs only a safe event, error kind/code and explicit operation', () => {
  logServerError('api_error', privateError, 'Lecture des périodes');
  expect(console.error).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ event: 'api_error', kind: 'Error', code: 'XX000', operation: 'Lecture des périodes' }));
});

it.each([false, true])('reports database readiness without starting a listener (failure=%s)', async failure => {
  const healthcheck = failure ? vi.fn().mockRejectedValue(privateError) : vi.fn().mockResolvedValue(true);
  const app = createApp({ routes: express.Router(), healthcheck, isStopping: () => false });
  const handler = app._router.stack.find((entry: any) => entry.route?.path === '/health').route.stack[0].handle;
  const res = response(); await handler({}, res);
  expect(healthcheck).toHaveBeenCalledOnce(); expect(res.json).toHaveBeenCalledWith(failure ? { status: 'unavailable', database: 'disconnected' } : { status: 'ok', database: 'connected' });
  expect(app.get('x-powered-by')).toBe(false);
});

it('refuses new work while draining', () => {
  const app = createApp({ routes: express.Router(), healthcheck: vi.fn(), isStopping: () => true });
  const guard = app._router.stack.find((entry: any) => entry.name !== 'query' && entry.name !== 'expressInit').handle;
  const res = response(); const next = vi.fn(); guard({}, res, next);
  expect(res.status).toHaveBeenCalledWith(503); expect(next).not.toHaveBeenCalled();
});

it('drains HTTP before the pool, deduplicates signals and exits once', async () => {
  let drained!: () => void;
  const server = { close: vi.fn(callback => { drained = callback; }), closeAllConnections: vi.fn() };
  const closePool = vi.fn().mockResolvedValue(undefined); const exit = vi.fn();
  const lifecycle = createShutdown({ server: () => server as unknown as Server, closePool, exit });
  const first = lifecycle.shutdown('SIGTERM'); const second = lifecycle.shutdown('SIGINT');
  expect(first).toBe(second); expect(lifecycle.isStopping()).toBe(true); expect(closePool).not.toHaveBeenCalled();
  drained(); await first; expect(closePool).toHaveBeenCalledOnce(); expect(exit).toHaveBeenCalledExactlyOnceWith(0); expect(vi.getTimerCount()).toBe(0);
});

it('escalates to a failed exit when a fatal error occurs during normal draining', async () => {
  const pool = deferred(); const exit = vi.fn(); const closePool = vi.fn().mockReturnValue(pool.promise);
  const lifecycle = createShutdown({ server: () => undefined, closePool, exit });
  const waiting = lifecycle.shutdown('SIGTERM'); void lifecycle.shutdown('uncaughtException', 1);
  pool.resolve(); await waiting; expect(exit).toHaveBeenCalledExactlyOnceWith(1); expect(closePool).toHaveBeenCalledOnce();
});

it('still closes the pool after an HTTP close failure and returns failure', async () => {
  const server = { close: vi.fn(callback => callback(privateError)), closeAllConnections: vi.fn() };
  const closePool = vi.fn().mockResolvedValue(undefined); const exit = vi.fn();
  await createShutdown({ server: () => server as any, closePool, exit }).shutdown('SIGTERM');
  expect(closePool).toHaveBeenCalledOnce(); expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('password');
});

it('exits as failed if closing the pool fails', async () => {
  const exit = vi.fn();
  await createShutdown({ server: () => undefined, closePool: vi.fn().mockRejectedValue(privateError), exit }).shutdown('SIGTERM');
  expect(exit).toHaveBeenCalledExactlyOnceWith(1); expect(vi.getTimerCount()).toBe(0);
});

it.each(['http', 'database'] as const)('bounds a hanging %s shutdown and ignores late completion', async hanging => {
  let drained!: () => void; const pool = deferred(); const exit = vi.fn();
  const server = { close: vi.fn(callback => { if (hanging === 'http') drained = callback; else callback(); }), closeAllConnections: vi.fn() };
  const lifecycle = createShutdown({ server: () => server as any, closePool: () => hanging === 'database' ? pool.promise : Promise.resolve(), exit, timeoutMs: 20 });
  const waiting = lifecycle.shutdown('SIGTERM'); await vi.advanceTimersByTimeAsync(20);
  expect(server.closeAllConnections).toHaveBeenCalledOnce(); expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  if (hanging === 'http') drained(); else pool.resolve(); await waiting; expect(exit).toHaveBeenCalledOnce();
});
