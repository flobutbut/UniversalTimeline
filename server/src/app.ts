import express, { type Router, type RequestHandler } from 'express';
import cors from 'cors';
import { apiErrorHandler } from './api/errors.js';

export function createApp(options: { routes: Router; healthcheck: () => Promise<unknown>; isStopping: () => boolean; frontendOrigin?: string; access?: RequestHandler }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    if (options.isStopping()) { res.status(503).json({ error: 'Le serveur est en cours d’arrêt.' }); return; }
    next();
  });
  app.use(cors({ origin: options.frontendOrigin ?? 'http://127.0.0.1:5173' }));
  app.use(express.json());
  app.get('/api/access', (_req, res) => { res.set('Cache-Control', 'no-store'); res.json({ enabled: !!options.access }); });
  if (options.access) app.use('/api', options.access);
  app.get('/api/account', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    const principal = res.locals.principal;
    if (!principal?.userId) { res.status(401).json({ error: 'Connexion requise.' }); return; }
    res.json({ id: principal.userId, isAdmin: principal.isAdmin });
  });
  app.use('/api', options.routes);
  app.get('/health', async (_req, res) => {
    try { await options.healthcheck(); res.json({ status: 'ok', database: 'connected' }); }
    catch { res.status(503).json({ status: 'unavailable', database: 'disconnected' }); }
  });
  app.use((_req, res) => { res.status(404).json({ error: 'Route introuvable' }); });
  app.use(apiErrorHandler);
  return app;
}
