import { testConnection } from './api/database.js';
import routes from './api/routes.js';
import { logServerError } from './api/errors.js';
import { createApp } from './app.js';
import { configuredAccessMiddleware } from './auth/config.js';

// Vercel entrypoint: the platform owns listening and shutdown, so the schema check gates module load instead of listen.
try {
  await testConnection();
} catch (error) {
  logServerError('startup_failed', error);
  throw error;
}

export default createApp({ routes, healthcheck: testConnection, isStopping: () => false, frontendOrigin: process.env.FRONTEND_ORIGIN, access: configuredAccessMiddleware() });
