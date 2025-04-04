import pkg from 'pg';
const { Pool } = pkg;

// Configuration de la base de données
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://wikidata_user:wikidata_password@wikidata_db:5432/wikidata_db'
};

// Création du pool de connexion
const pool = new Pool(dbConfig);

// Fonction pour tester la connexion
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

// Fonction pour exécuter une requête avec gestion des erreurs
export async function query(text: string, params?: any[]) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('[Database] Erreur lors de l\'exécution de la requête:', error);
    throw error;
  }
}

// Fonction pour obtenir un client pour les transactions
export async function getClient() {
  const client = await pool.connect();
  return client;
}

// Fonction pour fermer le pool de connexion
export async function closePool() {
  await pool.end();
}

// Export du pool pour les cas où il est nécessaire d'y accéder directement
export { pool };

// Types pour les résultats des requêtes
export interface DatabaseRow {
  [key: string]: any;
} 