import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
router.use(cors());
router.use(express.json());

// Configuration des pools de connexion
const pools: Record<string, Pool> = {};

// Configuration des bases de données
const dbConfigs = {
  periods: {
    host: 'periods-db',
    port: 5432,
    database: 'periods_db',
    user: 'periods_user',
    password: 'periods_password'
  },
  events: {
    host: 'events-db',
    port: 5432,
    database: 'events_db',
    user: 'events_user',
    password: 'events_password'
  },
  stories: {
    host: 'stories-db',
    port: 5432,
    database: 'stories_db',
    user: 'stories_user',
    password: 'stories_password'
  },
  categories: {
    host: 'categories-db',
    port: 5432,
    database: 'categories_db',
    user: 'categories_user',
    password: 'categories_password'
  }
};

// Fonction pour tester une connexion
async function testConnection(pool: Pool, name: string): Promise<void> {
  try {
    console.log(`Tentative de connexion à la base de données ${name}...`);
    const result = await pool.query('SELECT 1');
    console.log(`Connexion à la base de données ${name} établie avec succès`);
  } catch (error) {
    console.error(`Erreur de connexion à la base de données ${name}:`, error);
    if (error instanceof Error) {
      console.error(`Message d'erreur: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    throw error;
  }
}

// Fonction pour initialiser un pool avec retry
async function initializePoolWithRetry(name: string, config: typeof dbConfigs[keyof typeof dbConfigs], maxRetries = 3): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Tentative ${attempt}/${maxRetries} d'initialisation du pool ${name}...`);
      pools[name] = new Pool(config);
      await testConnection(pools[name], name);
      console.log(`Pool ${name} initialisé avec succès`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Échec de la tentative ${attempt}/${maxRetries} pour le pool ${name}:`, lastError);
      
      if (attempt < maxRetries) {
        const delay = attempt * 2000; // Délai croissant entre les tentatives
        console.log(`Nouvelle tentative dans ${delay/1000} secondes...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error(`Échec de l'initialisation du pool ${name} après ${maxRetries} tentatives`);
}

// Fonction pour initialiser tous les pools
async function initializeAllPools(): Promise<void> {
  try {
    console.log('Début de l\'initialisation des pools...');
    const initPromises = Object.entries(dbConfigs).map(([name, config]) => 
      initializePoolWithRetry(name, config)
    );
    
    await Promise.all(initPromises);
    console.log('Toutes les connexions aux bases de données ont été établies avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des pools:', error);
    if (error instanceof Error) {
      console.error(`Message d'erreur: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    throw error;
  }
}

// Initialiser les pools au démarrage
let isInitializing = false;

async function ensurePoolsInitialized(): Promise<void> {
  if (isInitializing) {
    console.log('Initialisation déjà en cours...');
    return;
  }

  isInitializing = true;
  try {
    await initializeAllPools();
  } catch (error) {
    console.error('Erreur fatale lors de l\'initialisation des pools:', error);
    if (error instanceof Error) {
      console.error(`Message d'erreur: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    throw error;
  } finally {
    isInitializing = false;
  }
}

// Initialisation initiale
ensurePoolsInitialized().catch(error => {
  console.error('Échec de l\'initialisation initiale des pools:', error);
  process.exit(1);
});

// Route pour tester la connexion
router.post('/test-connection', async (req, res) => {
  const { host, port, database, user, password } = req.body;
  
  try {
    console.log('Test de connexion avec les paramètres:', { host, port, database, user });
    const testPool = new Pool({
      host,
      port,
      database,
      user,
      password
    });
    
    await testConnection(testPool, 'test');
    await testPool.end();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur de connexion:', error);
    if (error instanceof Error) {
      console.error(`Message d'erreur: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur de connexion à la base de données' 
    });
  }
});

// Route pour exécuter des requêtes
router.post('/query', async (req, res) => {
  const { query, params, database } = req.body;
  
  if (!query || !database) {
    return res.status(400).json({ error: 'Query et database sont requis' });
  }
  
  const pool = pools[database];
  if (!pool) {
    return res.status(400).json({ error: 'Base de données non supportée' });
  }
  
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la requête:', error);
    if (error instanceof Error) {
      console.error(`Message d'erreur: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erreur lors de la requête à la base de données' 
    });
  }
});

// Routes pour les catégories
router.post('/categories', async (req, res) => {
  const category = req.body;
  const pool = pools.categories;
  
  try {
    const query = `
      INSERT INTO categories (
        id, label_fr, label_en, description_fr, description_en,
        parent_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        label_fr = EXCLUDED.label_fr,
        label_en = EXCLUDED.label_en,
        description_fr = EXCLUDED.description_fr,
        description_en = EXCLUDED.description_en,
        parent_id = EXCLUDED.parent_id,
        updated_at = CURRENT_TIMESTAMP
    `;

    const values = [
      category.id,
      category.label.fr,
      category.label.en,
      category.description?.fr || null,
      category.description?.en || null,
      category.parentId || null
    ];

    await pool.query(query, values);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la catégorie:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde de la catégorie' 
    });
  }
});

router.get('/categories/:id', async (req, res) => {
  const { id } = req.params;
  const pool = pools.categories;
  
  try {
    const query = 'SELECT * FROM categories WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      label: { fr: row.label_fr, en: row.label_en },
      description: row.description_fr || row.description_en ? {
        fr: row.description_fr,
        en: row.description_en
      } : undefined,
      parentId: row.parent_id
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la catégorie:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération de la catégorie' 
    });
  }
});

router.get('/categories', async (req, res) => {
  const pool = pools.categories;
  
  try {
    const query = 'SELECT * FROM categories ORDER BY label_fr';
    const result = await pool.query(query);
    
    res.json(result.rows.map(row => ({
      id: row.id,
      label: { fr: row.label_fr, en: row.label_en },
      description: row.description_fr || row.description_en ? {
        fr: row.description_fr,
        en: row.description_en
      } : undefined,
      parentId: row.parent_id
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération des catégories' 
    });
  }
});

// Routes pour les périodes
router.post('/periods', async (req, res) => {
  const period = req.body;
  const pool = pools.periods;
  
  try {
    const query = `
      INSERT INTO periods (
        id, label_fr, label_en, description_fr, description_en,
        start_date, end_date, parent_id, temporal_location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        label_fr = EXCLUDED.label_fr,
        label_en = EXCLUDED.label_en,
        description_fr = EXCLUDED.description_fr,
        description_en = EXCLUDED.description_en,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        parent_id = EXCLUDED.parent_id,
        temporal_location = EXCLUDED.temporal_location,
        updated_at = CURRENT_TIMESTAMP
    `;

    const values = [
      period.id,
      period.label.fr,
      period.label.en,
      period.description?.fr || null,
      period.description?.en || null,
      period.startDate,
      period.endDate,
      period.parentId,
      period.temporalLocation
    ];

    await pool.query(query, values);

    // Sauvegarde des catégories
    if (period.categories?.length > 0) {
      const categoryQuery = `
        INSERT INTO period_categories (period_id, category_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `;

      for (const category of period.categories) {
        await pool.query(categoryQuery, [period.id, category.id]);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la période:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde de la période' 
    });
  }
});

// Routes pour les événements
router.post('/events', async (req, res) => {
  const event = req.body;
  const pool = pools.events;
  
  try {
    const query = `
      INSERT INTO events (
        id, label_fr, label_en, description_fr, description_en,
        date
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        label_fr = EXCLUDED.label_fr,
        label_en = EXCLUDED.label_en,
        description_fr = EXCLUDED.description_fr,
        description_en = EXCLUDED.description_en,
        date = EXCLUDED.date,
        updated_at = CURRENT_TIMESTAMP
    `;

    const values = [
      event.id,
      event.label.fr,
      event.label.en,
      event.description?.fr || null,
      event.description?.en || null,
      event.date
    ];

    await pool.query(query, values);

    // Sauvegarde des catégories
    if (event.categories?.length > 0) {
      const categoryQuery = `
        INSERT INTO event_categories (event_id, category_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `;

      for (const category of event.categories) {
        await pool.query(categoryQuery, [event.id, category.id]);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'événement:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde de l\'événement' 
    });
  }
});

// Routes pour les stories
router.post('/stories', async (req, res) => {
  const story = req.body;
  const pool = pools.stories;
  
  try {
    const query = `
      INSERT INTO stories (
        title_fr, title_en, description_fr, description_en,
        author, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const values = [
      story.title.fr,
      story.title.en,
      story.description?.fr || null,
      story.description?.en || null,
      story.author,
      story.isPublic || false
    ];

    const result = await pool.query(query, values);
    const storyId = result.rows[0].id;

    // Sauvegarde des catégories
    if (story.categories?.length > 0) {
      const categoryQuery = `
        INSERT INTO story_categories (story_id, category_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `;

      for (const category of story.categories) {
        await pool.query(categoryQuery, [storyId, category.id]);
      }
    }

    res.json({ id: storyId });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la story:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde de la story' 
    });
  }
});

router.post('/stories/:storyId/periods/:periodId', async (req, res) => {
  const { storyId, periodId } = req.params;
  const pool = pools.stories;
  
  try {
    const query = `
      INSERT INTO story_periods (story_id, period_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `;

    await pool.query(query, [storyId, periodId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la période à la story:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erreur lors de l\'ajout de la période à la story' 
    });
  }
});

router.post('/stories/:storyId/events/:eventId', async (req, res) => {
  const { storyId, eventId } = req.params;
  const pool = pools.stories;
  
  try {
    const query = `
      INSERT INTO story_events (story_id, event_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `;

    await pool.query(query, [storyId, eventId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'événement à la story:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erreur lors de l\'ajout de l\'événement à la story' 
    });
  }
});

// Routes pour les périodes
router.get('/periods/:id', async (req, res) => {
  const { id } = req.params;
  const pool = pools.periods;
  
  try {
    const query = `
      SELECT p.*, 
             array_agg(DISTINCT pc.category_id) as category_ids,
             array_agg(DISTINCT c.label_fr) as category_labels
      FROM periods p
      LEFT JOIN period_categories pc ON p.id = pc.period_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.id = $1
      GROUP BY p.id
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Période non trouvée' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      label: { fr: row.label_fr, en: row.label_en },
      description: row.description_fr || row.description_en ? {
        fr: row.description_fr,
        en: row.description_en
      } : undefined,
      startDate: row.start_date,
      endDate: row.end_date,
      parentId: row.parent_id,
      temporalLocation: row.temporal_location,
      categories: row.category_ids.map((id: string, index: number) => ({
        id,
        label: row.category_labels[index]
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la période:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération de la période' 
    });
  }
});

router.get('/periods/:id/children', async (req, res) => {
  const { id } = req.params;
  const pool = pools.periods;
  
  try {
    const query = `
      SELECT p.*, 
             array_agg(DISTINCT pc.category_id) as category_ids,
             array_agg(DISTINCT c.label_fr) as category_labels
      FROM periods p
      LEFT JOIN period_categories pc ON p.id = pc.period_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.parent_id = $1
      GROUP BY p.id
      ORDER BY p.start_date DESC
    `;
    
    const result = await pool.query(query, [id]);
    
    res.json(result.rows.map(row => ({
      id: row.id,
      label: { fr: row.label_fr, en: row.label_en },
      description: row.description_fr || row.description_en ? {
        fr: row.description_fr,
        en: row.description_en
      } : undefined,
      startDate: row.start_date,
      endDate: row.end_date,
      parentId: row.parent_id,
      temporalLocation: row.temporal_location,
      categories: row.category_ids.map((id: string, index: number) => ({
        id,
        label: row.category_labels[index]
      }))
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des enfants:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération des enfants' 
    });
  }
});

// Routes pour les stories
router.get('/stories/:id', async (req, res) => {
  const { id } = req.params;
  const pool = pools.stories;
  
  try {
    const query = `
      SELECT s.*, 
             array_agg(DISTINCT sc.category_id) as category_ids,
             array_agg(DISTINCT c.label_fr) as category_labels,
             array_agg(DISTINCT sp.period_id) as period_ids,
             array_agg(DISTINCT se.event_id) as event_ids
      FROM stories s
      LEFT JOIN story_categories sc ON s.id = sc.story_id
      LEFT JOIN categories c ON sc.category_id = c.id
      LEFT JOIN story_periods sp ON s.id = sp.story_id
      LEFT JOIN story_events se ON s.id = se.story_id
      WHERE s.id = $1
      GROUP BY s.id
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Story non trouvée' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      title: { fr: row.title_fr, en: row.title_en },
      description: row.description_fr || row.description_en ? {
        fr: row.description_fr,
        en: row.description_en
      } : undefined,
      author: row.author,
      isPublic: row.is_public,
      categories: row.category_ids.map((id: string, index: number) => ({
        id,
        label: row.category_labels[index]
      })),
      periodIds: row.period_ids,
      eventIds: row.event_ids
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la story:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération de la story' 
    });
  }
});

// Route de test pour vérifier le contenu de la base de données
router.get('/test-content', async (req, res) => {
  try {
    const results = {
      periods: { count: 0, sample: [] as any[] },
      stories: { count: 0, sample: [] as any[] },
      categories: { count: 0, sample: [] as any[] }
    };

    // Vérifier les périodes
    const periodsResult = await pools.periods.query('SELECT COUNT(*) as count FROM periods');
    results.periods.count = parseInt(periodsResult.rows[0].count);
    if (results.periods.count > 0) {
      const sampleResult = await pools.periods.query('SELECT * FROM periods LIMIT 5');
      results.periods.sample = sampleResult.rows;
    }

    // Vérifier les stories
    const storiesResult = await pools.stories.query('SELECT COUNT(*) as count FROM stories');
    results.stories.count = parseInt(storiesResult.rows[0].count);
    if (results.stories.count > 0) {
      const sampleResult = await pools.stories.query('SELECT * FROM stories LIMIT 5');
      results.stories.sample = sampleResult.rows;
    }

    // Vérifier les catégories
    const categoriesResult = await pools.categories.query('SELECT COUNT(*) as count FROM categories');
    results.categories.count = parseInt(categoriesResult.rows[0].count);
    if (results.categories.count > 0) {
      const sampleResult = await pools.categories.query('SELECT * FROM categories LIMIT 5');
      results.categories.sample = sampleResult.rows;
    }

    res.json(results);
  } catch (error) {
    console.error('Erreur lors de la vérification du contenu:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erreur lors de la vérification du contenu' 
    });
  }
});

export default router; 