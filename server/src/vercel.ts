import { testConnection } from './api/database.js';
import routes from './api/routes.js';
import { logServerError } from './api/errors.js';
import { createApp } from './app.js';
import { configuredAccessMiddleware } from './auth/config.js';
import { createSeoPages } from './api/seo/pages.js';
import { SITE_ORIGIN } from './shared/seoMetadata.js';
import { createPublicSeoRead } from './api/seo/publicRead.js';

// Vercel entrypoint: the platform owns listening and shutdown, so the schema check gates module load instead of listen.
try {
  await testConnection();
} catch (error) {
  logServerError('startup_failed', error);
  throw error;
}

const app: express.Express = createApp({
  routes, healthcheck: testConnection, isStopping: () => false,
  frontendOrigin: process.env.FRONTEND_ORIGIN, access: configuredAccessMiddleware(),
  publicPages: createSeoPages(process.env.FRONTEND_ORIGIN ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : SITE_ORIGIN), process.env.VERCEL_ENV !== 'preview', createPublicSeoRead()),
});
import express from 'express';

export default app;
