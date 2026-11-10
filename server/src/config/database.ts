import type { PoolConfig } from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Database credentials must stay on the API server. */
export function createDatabaseConfig(env: NodeJS.ProcessEnv = process.env): PoolConfig {
  if (!env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL manquante : renseignez server/.env avec la connexion PostgreSQL Supabase.');
  }
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw new Error('DATABASE_URL doit être une URL PostgreSQL valide.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password) {
    throw new Error('DATABASE_URL doit contenir un hôte, un utilisateur et un mot de passe PostgreSQL.');
  }
  // URL options can override pg's verified TLS configuration.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'ssl', 'uselibpqcompat']) {
    if (url.searchParams.has(key)) {
      throw new Error('Retirez les options SSL de DATABASE_URL ; utilisez DB_SSL_CA_PATH pour le certificat Supabase.');
    }
  }
  // Existing Vercel secrets use Supavisor's session endpoint. Keep credentials and
  // verified TLS intact while using transaction pooling for ephemeral instances.
  if (env.VERCEL === '1' && url.hostname.endsWith('.pooler.supabase.com') && (!url.port || url.port === '5432')) url.port = '6543';
  return {
    connectionString: url.toString(),
    ssl: {
      rejectUnauthorized: true,
      ca: readFileSync(env.DB_SSL_CA_PATH || fileURLToPath(new URL('../../certs/prod-ca-2021.crt', import.meta.url)), 'utf8'),
    },
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: env.VERCEL === '1' ? 5000 : 30000,
    application_name: 'universal-timeline-api',
  };
}
