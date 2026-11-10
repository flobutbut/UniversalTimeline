import pkg, { type QueryResultRow } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createDatabaseConfig } from '../config/database.js';
import { runInTransaction, type TransactionClient } from './transaction.js';
import { applyPrincipal, principalContext } from '../auth/context.js';
import { checkAccessSchema } from '../auth/preflight.js';
import { logServerError } from './errors.js';
import { attachDatabasePool } from '@vercel/functions/db-connections';
import { createReadiness } from '../runtime/readiness.js';
import { measureTiming } from './metrics.js';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const { Pool } = pkg;

const pool = new Pool(createDatabaseConfig());
if (process.env.VERCEL === '1') attachDatabasePool(pool);

pool.on('error', () => {
  console.error('[Database] Connexion inactive interrompue');
});

export async function testConnection() {
  try {
    await runInTransaction(pool, async client => {
      await client.query('SELECT 1');
      if (process.env.AUTH_ENABLED !== 'true') return;
      await checkAccessSchema(client);
      // Verify that this connection can actually assume both restricted roles.
      await client.query('SET LOCAL ROLE anon');
      await client.query('SELECT 1');
      await client.query('SET LOCAL ROLE authenticated');
      await client.query('SELECT 1');
    });
    return true;
  } catch (error) {
    logServerError('database_check_failed', error);
    throw error;
  }
}

export const ensureDatabaseReady = createReadiness(testConnection);

export async function query<Row extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
  if (principalContext.getStore()) return withTransaction(client => client.query<Row>(text, params));
  if (process.env.AUTH_ENABLED === 'true') throw new Error('Contexte de connexion requis pour les données.');
  return pool.query<Row>(text, params);
}

export function withTransaction<T>(operation: (client: TransactionClient) => Promise<T>): Promise<T> {
  const principal = principalContext.getStore();
  if (!principal && process.env.AUTH_ENABLED === 'true') return Promise.reject(new Error('Contexte de connexion requis pour les données.'));
  return ensureDatabaseReady().then(() => runInTransaction(pool, async client => {
    const measured: TransactionClient = {
      query: <Row extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => measureTiming('sqlMs', () => client.query<Row>(text, params)),
    };
    if (principal) await applyPrincipal(measured, principal);
    return operation(measured);
  }));
}

export async function closePool() {
  await pool.end();
}

/** Internal mail delivery only. Never propagate a visitor's identity into this transaction. */
export function withFeedbackDeliveryTransaction<T>(operation: (client: TransactionClient) => Promise<T>): Promise<T> {
  return ensureDatabaseReady().then(() => runInTransaction(pool, async client => {
    await client.query('SET LOCAL ROLE service_role');
    return operation(client);
  }));
}
