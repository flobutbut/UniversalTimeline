import type { Server } from 'node:http';
import { testConnection, closePool } from './api/database.js';
import routes from './api/routes.js';
import { logServerError } from './api/errors.js';
import { createApp } from './app.js';
import { createShutdown } from './runtime/shutdown.js';
import { configuredAccessMiddleware } from './auth/config.js';

const port = process.env.PORT || 3000;
const host = process.env.HOST || '127.0.0.1';
let httpServer: Server | undefined;
const lifecycle = createShutdown({ server: () => httpServer, closePool, exit: code => { process.exit(code); } });

process.on('SIGINT', () => { void lifecycle.shutdown('SIGINT'); });
process.on('SIGTERM', () => { void lifecycle.shutdown('SIGTERM'); });
process.on('unhandledRejection', reason => {
  logServerError('unhandled_rejection', reason);
  void lifecycle.shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', error => {
  logServerError('uncaught_exception', error);
  void lifecycle.shutdown('uncaughtException', 1);
});

async function startServer() {
  try {
    const app = createApp({ routes, healthcheck: testConnection, isStopping: lifecycle.isStopping, frontendOrigin: process.env.FRONTEND_ORIGIN, access: configuredAccessMiddleware() });
    await testConnection();
    httpServer = app.listen(Number(port), host, () => {
      console.log(JSON.stringify({ event: 'server_started', host, port: Number(port) }));
    });
    httpServer.on('error', error => {
      logServerError('http_server_failed', error);
      void lifecycle.shutdown('listenError', 1);
    });
  } catch (error) {
    logServerError('startup_failed', error);
    await lifecycle.shutdown('startupError', 1);
  }
}
void startServer();
