import pkg, { type QueryResultRow } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createDatabaseConfig } from '../config/database.js';
import { runInTransaction, type TransactionClient } from './transaction.js';
import { applyPrincipal, principalContext } from '../auth/context.js';
import { checkAccessSchema } from '../auth/preflight.js';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const { Pool } = pkg;

const pool = new Pool(createDatabaseConfig());

pool.on('error', () => {
  console.error('[Database] Connexion inactive interrompue');
});

export async function testConnection() {
  try {
    await pool.query('SELECT 1');
    if (process.env.AUTH_ENABLED === 'true') await runInTransaction(pool, async client => {
      await checkAccessSchema(client);
      // Verify that this connection can actually assume both restricted roles.
      await client.query('SET LOCAL ROLE anon');
      await client.query('SELECT 1');
      await client.query('SET LOCAL ROLE authenticated');
      await client.query('SELECT 1');
    });
    return true;
  } catch (error) {
    throw new Error('Connexion Supabase impossible : vérifiez DATABASE_URL, le réseau et le certificat TLS.');
  }
}

export async function query<Row extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
  if (principalContext.getStore()) return withTransaction(client => client.query<Row>(text, params));
  if (process.env.AUTH_ENABLED === 'true') throw new Error('Contexte de connexion requis pour les données.');
  return pool.query<Row>(text, params);
}

export function withTransaction<T>(operation: (client: TransactionClient) => Promise<T>): Promise<T> {
  const principal = principalContext.getStore();
  if (!principal && process.env.AUTH_ENABLED === 'true') return Promise.reject(new Error('Contexte de connexion requis pour les données.'));
  return runInTransaction(pool, async client => {
    if (principal) await applyPrincipal(client, principal);
    return operation(client);
  });
}

export async function closePool() {
  await pool.end();
}
