import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'wikidata_user',
  password: process.env.DB_PASSWORD || 'wikidata_password',
  database: process.env.DB_NAME || 'wikidata_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('[Database] Connexion à la base de données établie');
    client.release();
    return true;
  } catch (error) {
    console.error('[Database] Erreur de connexion à la base de données:', error);
    return false;
  }
}

export async function query(text: string, params?: any[]) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('[Database] Erreur lors de l\'exécution de la requête:', error);
    throw error;
  }
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}

export async function closePool() {
  await pool.end();
}

export { pool };

export interface DatabaseRow {
  [key: string]: any;
}
