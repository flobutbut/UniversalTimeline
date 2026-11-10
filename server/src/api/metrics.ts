import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

type Timing = 'authMs' | 'dbWaitMs' | 'sqlMs';
const context = new AsyncLocalStorage<Record<Timing, number>>();
export async function measureTiming<T>(name: Timing, operation: () => Promise<T>): Promise<T> {
  const metrics = context.getStore(), start = performance.now();
  try { return await operation(); }
  finally { if (metrics) metrics[name] += performance.now() - start; }
}

/** Fixed route patterns only: never log query strings, IDs, tokens or bodies. */
export const requestMetrics: RequestHandler = (req, res, next) => {
  const metrics = { authMs: 0, dbWaitMs: 0, sqlMs: 0 }, start = performance.now();
  const requestId = randomUUID();
  res.set('X-Request-Id', requestId);
  res.once('finish', () => {
    if (!req.path.startsWith('/api') && req.baseUrl !== '/api') return;
    console.log(JSON.stringify({ event: 'api_request', requestId, method: req.method,
      route: typeof req.route?.path === 'string' ? (req.route.path.startsWith('/api/') ? req.route.path : `/api${req.route.path}`) : '/api/unknown', status: res.statusCode,
      durationMs: Math.round(performance.now() - start),
      authMs: Math.round(metrics.authMs), dbWaitMs: Math.round(metrics.dbWaitMs), sqlMs: Math.round(metrics.sqlMs),
    }));
  });
  context.run(metrics, next);
};
