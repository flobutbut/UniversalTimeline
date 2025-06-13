import express from 'express';
import { query as dbQuery } from './database.js';
import type { Event } from '../types/geological.js';
import axios from 'axios';

const router = express.Router();

console.log('########################## BACKEND CODE ACTIF ##########################');

// Fonction pour récupérer la date depuis Wikidata
export async function getEventDateFromWikidata(wikidataId: string): Promise<string | null> {
  try {
    // Augmenter le délai entre 5 et 10 secondes pour éviter le rate limit
    await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 5000));

    const query = `
      SELECT ?date ?dateLabel WHERE {
        wd:${wikidataId} ?prop ?date.
        FILTER(?prop IN (
          wdt:P580,  # date de début
          wdt:P582,  # date de fin
          wdt:P585,  # point dans le temps
          wdt:P571,  # date de création/fondation
          wdt:P576,  # date de dissolution
          wdt:P569,  # date de naissance
          wdt:P570,  # date de décès
          wdt:P1619, # date de début la plus ancienne
          wdt:P1620  # date de fin la plus récente
        ))
        SERVICE wikibase:label { bd:serviceParam wikibase:language 'fr'. }
      }
      ORDER BY ?date
      LIMIT 1
    `;

    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
    console.log(`[API] Requête SPARQL pour ${wikidataId}: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WikidataTimelineBot/1.0 (https://github.com/florianbutour/api_Wikidata; florianbutour@gmail.com)',
        'Accept': 'application/sparql-results+json'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log(`[API] Rate limit atteint pour ${wikidataId}, attente de 30 secondes...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
        return getEventDateFromWikidata(wikidataId);
      }
      
      const errorText = await response.text();
      console.error(`[API] Erreur HTTP ${response.status} pour ${wikidataId}:`, errorText);
      
      if (response.status >= 500) {
        console.log(`[API] Erreur serveur pour ${wikidataId}, attente de 10 secondes avant nouvel essai...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        return getEventDateFromWikidata(wikidataId);
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[API] Réponse pour ${wikidataId}:`, JSON.stringify(data, null, 2));

    if (data.results.bindings.length > 0) {
      const dateStr = data.results.bindings[0].date.value;
      console.log(`[API] Date brute reçue: ${dateStr}`);
      
      // Gestion des dates négatives (av. J.-C.)
      if (dateStr.startsWith('-')) {
        const year = parseInt(dateStr.substring(1, 5));
        return `${year} av. J.-C.`;
      }
      // Gestion des dates positives (ap. J.-C.)
      else {
        const year = parseInt(dateStr.substring(0, 4));
        return `${year} ap. J.-C.`;
      }
    }

    return null;
  } catch (error: any) {
    console.error(`[API] Erreur lors de la récupération de la date pour l'événement ${wikidataId}:`, error);
    
    // Si l'erreur est liée au rate limit, on attend et on réessaie
    if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      console.log(`[API] Rate limit détecté pour ${wikidataId}, attente de 30 secondes...`);
      await new Promise(resolve => setTimeout(resolve, 30000));
      return getEventDateFromWikidata(wikidataId);
    }
    
    return null;
  }
}

// Route pour obtenir les périodes
router.get('/periods', async (req, res) => {
  try {
    const sqlQuery = `
      SELECT 
        p.id,
        p.wikidata_id,
        p.label_fr,
        p.label_en,
        p.description_fr,
        p.description_en,
        p.start_date,
        p.end_date,
        p.parent_id,
        p.temporal_location,
        c.label_fr as category_label
      FROM periods.periods p
      LEFT JOIN categories.period_categories pc ON p.id = pc.period_id
      LEFT JOIN categories.categories c ON pc.category_id = c.id
      ORDER BY p.start_date
    `;

    const result = await dbQuery(sqlQuery);
    // Correction : mapping explicite pour chaque période
    const periods = result.rows.map((row: any) => ({
      id: row.id,
      wikidata_id: row.wikidata_id,
      label_fr: row.label_fr,
      label_en: row.label_en,
      description_fr: row.description_fr,
      description_en: row.description_en,
      start_date: row.start_date,
      end_date: row.end_date,
      parent_id: row.parent_id,
      temporal_location: row.temporal_location,
      category_label: row.category_label,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    res.json(periods);
  } catch (error) {
    console.error('Erreur lors de la récupération des périodes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des périodes' });
  }
});

// Route pour obtenir les événements
router.get('/events', async (req, res) => {
  try {
    console.log('[API] Récupération de tous les événements');
    const sqlQuery = `
      SELECT 
        e.id,
        e.wikidata_id AS wikidata_id,
        e.label_fr,
        e.label_en,
        e.description_fr,
        e.description_en,
        e.created_at,
        e.updated_at,
        c.id as category_id,
        c.label_fr as category_label
      FROM events.events e
      LEFT JOIN categories.event_categories ec ON e.id = ec.event_id
      LEFT JOIN categories.categories c ON ec.category_id = c.id
      ORDER BY e.id
    `;

    const result = await dbQuery(sqlQuery);
    console.log('########################## DEBUG SQL EVENTS ##########################');
    console.log(JSON.stringify(result.rows, null, 2));
    console.log('#####################################################################');
    console.log(`[API] ${result.rows.length} événements trouvés dans la base de données`);
    console.log('[API] Premier événement brut de la base de données:', JSON.stringify(result.rows[0], null, 2));
    
    // Récupérer les dates depuis Wikidata pour chaque événement
    console.log('[API] Début de la récupération des dates depuis Wikidata');
    const eventsWithDates = await Promise.all(
      result.rows.map(async (row: any) => {
        console.log(`[API] Traitement de l'événement ${row.id} (Wikidata ID: ${row.wikidata_id})`);
        const date = await getEventDateFromWikidata(row.wikidata_id);
        const event = {
          id: row.id,
          wikidata_id: row.wikidata_id,
          label: {
            fr: row.label_fr,
            en: row.label_en || row.label_fr
          },
          date: date || 'Date inconnue',
          description: row.description_fr ? {
            fr: row.description_fr,
            en: row.description_en || row.description_fr
          } : undefined,
          categories: row.category_label ? [{
            id: row.category_id,
            label: {
              fr: row.category_label,
              en: row.category_label
            }
          }] : [],
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
        console.log(`[API] Événement traité :`, event);
        return event;
      })
    );

    console.log('########################## DEBUG OBJ EVENT ##########################');
    console.log(JSON.stringify(eventsWithDates[0], null, 2));
    console.log('#####################################################################');
    res.json(eventsWithDates);
  } catch (error) {
    console.error('[API] Erreur lors de la récupération des événements:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des événements' });
  }
});

// Route pour obtenir les stories
router.get('/stories', async (req, res) => {
  try {
    const sqlQuery = `
      SELECT 
        s.id,
        s.title_fr,
        s.title_en,
        s.description_fr,
        s.description_en,
        s.author,
        s.is_public,
        c.label_fr as category_label
      FROM stories.stories s
      LEFT JOIN categories.story_categories sc ON s.id = sc.story_id
      LEFT JOIN categories.categories c ON sc.category_id = c.id
      ORDER BY s.created_at DESC
    `;

    const result = await dbQuery(sqlQuery);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des stories:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des stories' });
  }
});

// Route pour créer une nouvelle story
router.post('/stories', async (req, res) => {
  try {
    const { title, description, author, isPublic } = req.body;
    
    const sqlQuery = `
      INSERT INTO stories.stories (
        title_fr,
        title_en,
        description_fr,
        description_en,
        author,
        is_public
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    const values = [
      title.fr,
      title.en || title.fr,
      description?.fr || null,
      description?.en || description?.fr || null,
      author,
      isPublic ?? true
    ];
    
    const result = await dbQuery(sqlQuery, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de la création de la story:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la story' });
  }
});

// Route pour ajouter une période à une story
router.post('/stories/:storyId/periods/:periodId', async (req, res) => {
  try {
    const { storyId, periodId } = req.params;
    
    const sqlQuery = `
      INSERT INTO stories.story_periods (story_id, period_id)
      VALUES ($1, $2)
      ON CONFLICT (story_id, period_id) DO NOTHING
      RETURNING story_id, period_id
    `;
    
    const result = await dbQuery(sqlQuery, [storyId, periodId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la période à la story:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la période à la story' });
  }
});

// Route pour ajouter un événement à une story
router.post('/stories/:storyId/events/:eventId', async (req, res) => {
  try {
    const { storyId, eventId } = req.params;
    
    const sqlQuery = `
      INSERT INTO stories.story_events (story_id, event_id)
      VALUES ($1, $2)
      ON CONFLICT (story_id, event_id) DO NOTHING
      RETURNING story_id, event_id
    `;
    
    const result = await dbQuery(sqlQuery, [storyId, eventId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'événement à la story:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'événement à la story' });
  }
});

// Route pour supprimer une période d'une story
router.delete('/stories/:storyId/periods/:periodId', async (req, res) => {
  try {
    const { storyId, periodId } = req.params;
    
    const sqlQuery = `
      DELETE FROM stories.story_periods
      WHERE story_id = $1 AND period_id = $2
      RETURNING story_id, period_id
    `;
    
    const result = await dbQuery(sqlQuery, [storyId, periodId]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de la suppression de la période de la story:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la période de la story' });
  }
});

// Route pour supprimer un événement d'une story
router.delete('/stories/:storyId/events/:eventId', async (req, res) => {
  try {
    const { storyId, eventId } = req.params;
    
    const sqlQuery = `
      DELETE FROM stories.story_events
      WHERE story_id = $1 AND event_id = $2
      RETURNING story_id, event_id
    `;
    
    const result = await dbQuery(sqlQuery, [storyId, eventId]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement de la story:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'événement de la story' });
  }
});

// Route pour obtenir les périodes d'une story
router.get('/stories/:storyId/periods', async (req, res) => {
  try {
    const { storyId } = req.params;
    
    const sqlQuery = `
      SELECT p.*
      FROM periods.periods p
      JOIN stories.story_periods sp ON p.id = sp.period_id
      WHERE sp.story_id = $1
      ORDER BY p.start_date
    `;
    
    const result = await dbQuery(sqlQuery, [storyId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des périodes de la story:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des périodes de la story' });
  }
});

// Route pour obtenir les événements d'une story
router.get('/stories/:storyId/events', async (req, res) => {
  try {
    const { storyId } = req.params;
    
    const sqlQuery = `
      SELECT e.*
      FROM events.events e
      JOIN stories.story_events se ON e.id = se.event_id
      WHERE se.story_id = $1
      ORDER BY e.date
    `;
    
    const result = await dbQuery(sqlQuery, [storyId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des événements de la story:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des événements de la story' });
  }
});

// Route pour obtenir les catégories
router.get('/categories', async (req, res) => {
  try {
    const sqlQuery = `
      SELECT 
        c.id,
        c.label_fr,
        c.description_fr
      FROM categories.categories c
      ORDER BY c.label_fr
    `;

    const result = await dbQuery(sqlQuery);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des catégories' });
  }
});

// Route pour mettre à jour un événement
router.put('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { label, description, categories, wikidata_id, date } = req.body;

    console.log(`[API] Mise à jour de l'événement ${id} avec les données:`, req.body);

    // Validation des données requises
    if (!wikidata_id) {
      console.error('[API] wikidata_id manquant dans les données');
      return res.status(400).json({ error: 'wikidata_id est requis' });
    }

    if (!label || !label.fr) {
      console.error('[API] label.fr manquant dans les données');
      return res.status(400).json({ error: 'label.fr est requis' });
    }

    // Mise à jour de l'événement
    const updateEventQuery = `
      UPDATE events.events
      SET 
        label_fr = $1,
        label_en = $2,
        description_fr = $3,
        description_en = $4,
        wikidata_id = $5,
        date = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;

    console.log('[API] Requête SQL:', updateEventQuery);
    console.log('[API] Paramètres:', [label.fr, label.en || label.fr, description?.fr, description?.en || description?.fr, wikidata_id, date, id]);

    const result = await dbQuery(updateEventQuery, [
      label.fr,
      label.en || label.fr,
      description?.fr,
      description?.en || description?.fr,
      wikidata_id,
      date,
      id
    ]);

    if (result.rows.length === 0) {
      console.log('[API] Aucun événement trouvé avec l\'ID:', id);
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    console.log('[API] Événement mis à jour:', result.rows[0]);

    // Mise à jour des catégories
    if (categories && Array.isArray(categories) && categories.length > 0) {
      console.log('[API] Mise à jour des catégories:', categories);
      
      // Supprimer les anciennes catégories
      await dbQuery('DELETE FROM categories.event_categories WHERE event_id = $1', [id]);

      // Filtrer les catégories valides (avec un ID)
      const validCategories = categories.filter(cat => cat && cat.id);
      
      if (validCategories.length > 0) {
        // Ajouter les nouvelles catégories
        const categoryValues = validCategories.map((_, index) => `($1, $${index + 2})`).join(',');
        const categoryParams = [id, ...validCategories.map(cat => cat.id)];
        
        const insertCategoryQuery = `
          INSERT INTO categories.event_categories (event_id, category_id)
          VALUES ${categoryValues}
        `;
        
        console.log('[API] Requête SQL pour les catégories:', insertCategoryQuery);
        console.log('[API] Paramètres des catégories:', categoryParams);
        
        await dbQuery(insertCategoryQuery, categoryParams);
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[API] Erreur lors de la mise à jour de l\'événement:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'événement' });
  }
});

// Route pour mettre à jour une période
router.put('/periods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { label, description, start_date, end_date, parent_id, temporal_location, wikidata_id } = req.body;

    console.log(`[API] Mise à jour de la période ${id} avec les données:`, req.body);

    // Validation des données requises
    if (!wikidata_id) {
      console.error('[API] wikidata_id manquant dans les données');
      return res.status(400).json({ error: 'wikidata_id est requis' });
    }

    if (!label || !label.fr) {
      console.error('[API] label.fr manquant dans les données');
      return res.status(400).json({ error: 'label.fr est requis' });
    }

    // Si end_date est vide, utiliser "TODAY"
    const finalEndDate = end_date || 'TODAY';

    // Mise à jour de la période
    const updatePeriodQuery = `
      UPDATE periods.periods
      SET 
        label_fr = $1,
        label_en = $2,
        description_fr = $3,
        description_en = $4,
        start_date = NULLIF($5, ''),
        end_date = $6,
        parent_id = NULLIF($7, ''),
        temporal_location = $8,
        wikidata_id = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;

    console.log('[API] Requête SQL:', updatePeriodQuery);
    console.log('[API] Paramètres:', [
      label.fr,
      label.en || label.fr,
      description?.fr,
      description?.en || description?.fr,
      start_date || null,
      finalEndDate,
      parent_id || null,
      temporal_location,
      wikidata_id,
      id
    ]);

    const result = await dbQuery(updatePeriodQuery, [
      label.fr,
      label.en || label.fr,
      description?.fr,
      description?.en || description?.fr,
      start_date || null,
      finalEndDate,
      parent_id || null,
      temporal_location,
      wikidata_id,
      id
    ]);

    if (result.rows.length === 0) {
      console.log('[API] Aucune période trouvée avec l\'ID:', id);
      return res.status(404).json({ error: 'Période non trouvée' });
    }

    console.log('[API] Période mise à jour:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[API] Erreur lors de la mise à jour de la période:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la période' });
  }
});

// Route pour supprimer un événement
router.delete('/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Supprimer les catégories associées (si besoin)
    await dbQuery('DELETE FROM categories.event_categories WHERE event_id = $1', [id]);
    // Supprimer l'événement
    const result = await dbQuery('DELETE FROM events.events WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('[API] Erreur lors de la suppression de l\'événement:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'événement' });
  }
});

// Route pour obtenir le détail d'une story
router.get('/stories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Récupérer la story principale
    const storyQuery = `
      SELECT 
        s.id,
        s.title_fr,
        s.title_en,
        s.description_fr,
        s.description_en,
        s.author,
        s.is_public,
        s.created_at,
        s.updated_at
      FROM stories.stories s
      WHERE s.id = $1
    `;
    const storyResult = await dbQuery(storyQuery, [id]);
    if (storyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Story non trouvée' });
    }
    const story = storyResult.rows[0];

    // Récupérer les catégories associées
    const categoriesQuery = `
      SELECT c.id, c.label_fr, c.label_en, c.description_fr, c.description_en
      FROM categories.categories c
      JOIN categories.story_categories sc ON c.id = sc.category_id
      WHERE sc.story_id = $1
    `;
    const categoriesResult = await dbQuery(categoriesQuery, [id]);
    const categories = categoriesResult.rows.map(row => ({
      id: row.id,
      label: { fr: row.label_fr, en: row.label_en || row.label_fr },
      description: row.description_fr ? { fr: row.description_fr, en: row.description_en || row.description_fr } : undefined
    }));

    // Récupérer les périodes associées
    const periodsQuery = `
      SELECT p.*
      FROM periods.periods p
      JOIN stories.story_periods sp ON p.id = sp.period_id
      WHERE sp.story_id = $1
      ORDER BY p.start_date
    `;
    const periodsResult = await dbQuery(periodsQuery, [id]);
    const periods = periodsResult.rows.map(row => ({
      id: row.id,
      label: { fr: row.label_fr, en: row.label_en || row.label_fr },
      description: row.description_fr ? { fr: row.description_fr, en: row.description_en || row.description_fr } : undefined,
      startDate: row.start_date,
      endDate: row.end_date,
      parentId: row.parent_id,
      temporalLocation: row.temporal_location,
      categories: [],
      children: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    // Récupérer les événements associés
    const eventsQuery = `
      SELECT e.*
      FROM events.events e
      JOIN stories.story_events se ON e.id = se.event_id
      WHERE se.story_id = $1
      ORDER BY e.date
    `;
    const eventsResult = await dbQuery(eventsQuery, [id]);
    const events = eventsResult.rows.map(row => ({
      id: row.id,
      label: { fr: row.label_fr, en: row.label_en || row.label_fr },
      description: row.description_fr ? { fr: row.description_fr, en: row.description_en || row.description_fr } : undefined,
      date: row.date,
      categories: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    // Construction de l'objet final
    const storyData = {
      id: story.id,
      title: { fr: story.title_fr, en: story.title_en || story.title_fr },
      description: story.description_fr ? { fr: story.description_fr, en: story.description_en || story.description_fr } : undefined,
      author: story.author,
      isPublic: story.is_public,
      categories,
      periods,
      events,
      createdAt: story.created_at,
      updatedAt: story.updated_at
    };
    res.json(storyData);
  } catch (error) {
    console.error('Erreur lors de la récupération du détail de la story:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du détail de la story' });
  }
});

// Route pour supprimer une story
router.delete('/stories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Supprimer les liaisons (événements, périodes, catégories)
    await dbQuery('DELETE FROM stories.story_events WHERE story_id = $1', [id]);
    await dbQuery('DELETE FROM stories.story_periods WHERE story_id = $1', [id]);
    await dbQuery('DELETE FROM categories.story_categories WHERE story_id = $1', [id]);
    // Supprimer la story elle-même
    const result = await dbQuery('DELETE FROM stories.stories WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Story non trouvée' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de la story:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la story' });
  }
});

export default router; 