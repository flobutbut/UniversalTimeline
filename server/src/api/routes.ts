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
      
      // Conserver le format ISO de la date
      return dateStr;
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
        p.has_parent,
        p.children,
        p.temporal_location,
        c.label_fr as category_label
      FROM periods.periods p
      LEFT JOIN categories.period_categories pc ON p.id = pc.period_id
      LEFT JOIN categories.categories c ON pc.category_id = c.id
      WHERE p.has_parent = false
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
      has_parent: row.has_parent,
      children: row.children || [],
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
        e.date,
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
    console.log(`[API] ${result.rows.length} événements trouvés dans la base de données`);
    
    // Récupérer les dates depuis Wikidata uniquement pour les événements qui n'en ont pas
    console.log('[API] Début de la récupération des dates depuis Wikidata');
    const eventsWithDates = await Promise.all(
      result.rows.map(async (row: any) => {
        console.log(`[API] Traitement de l'événement ${row.id} (Wikidata ID: ${row.wikidata_id})`);
        let date = row.date;
        
        // Si pas de date en base, on la récupère depuis Wikidata
        if (!date && row.wikidata_id) {
          date = await getEventDateFromWikidata(row.wikidata_id);
          // Mettre à jour la date en base de données
          if (date) {
            await dbQuery(
              'UPDATE events.events SET date = $1 WHERE id = $2',
              [date, row.id]
            );
          }
        }

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
        return event;
      })
    );

    res.json(eventsWithDates);
  } catch (error) {
    console.error('[API] Erreur lors de la récupération des événements:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des événements' });
  }
});

// Route pour créer un événement
router.post('/events', async (req, res) => {
  try {
    const { id, wikidata_id, label, description, date } = req.body;

    console.log('[API] Création d\'un événement avec les données:', req.body);

    // Validation des données requises
    if (!wikidata_id) {
      console.error('[API] wikidata_id manquant dans les données');
      return res.status(400).json({ error: 'wikidata_id est requis' });
    }

    if (!label || !label.fr) {
      console.error('[API] label.fr manquant dans les données');
      return res.status(400).json({ error: 'label.fr est requis' });
    }

    // Création de l'événement
    const createEventQuery = `
      INSERT INTO events.events (
        id,
        wikidata_id,
        label_fr,
        label_en,
        description_fr,
        description_en,
        date,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    console.log('[API] Requête SQL:', createEventQuery);
    console.log('[API] Paramètres:', [id, wikidata_id, label.fr, label.en || label.fr, description?.fr, description?.en || description?.fr, date]);

    const result = await dbQuery(createEventQuery, [
      id,
      wikidata_id,
      label.fr,
      label.en || label.fr,
      description?.fr,
      description?.en || description?.fr,
      date
    ]);

    console.log('[API] Événement créé:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('[API] Erreur lors de la création de l\'événement:', error);
    if (error.code === '23505') { // Code d'erreur PostgreSQL pour violation de contrainte unique
      res.status(409).json({ error: 'Un événement avec cet ID existe déjà' });
    } else {
      res.status(500).json({ error: 'Erreur lors de la création de l\'événement' });
    }
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
    const { label, description, start_date, end_date, children, temporal_location, wikidata_id } = req.body;

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
        children = $7,
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
      children || [],
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
      children || [],
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
      hasParent: row.has_parent,
      children: row.children || [],
      temporalLocation: row.temporal_location,
      categories: [],
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

// Route pour créer une période
router.post('/periods', async (req, res) => {
  try {
    const { id, wikidata_id, label, description, start_date, end_date, children, temporal_location } = req.body;

    // Validation des données requises
    if (!wikidata_id) {
      console.error('[API] wikidata_id manquant dans les données');
      return res.status(400).json({ error: 'wikidata_id est requis' });
    }

    if (!label || !label.fr) {
      console.error('[API] label.fr manquant dans les données');
      return res.status(400).json({ error: 'label.fr est requis' });
    }

    const sqlQuery = `
      INSERT INTO periods.periods (
        id,
        wikidata_id,
        label_fr,
        label_en,
        description_fr,
        description_en,
        start_date,
        end_date,
        children,
        temporal_location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    console.log('[API] Requête SQL:', sqlQuery);
    console.log('[API] Paramètres:', [id, wikidata_id, label.fr, label.en || label.fr, description?.fr, description?.en || description?.fr, start_date, end_date, children || [], temporal_location]);

    const result = await dbQuery(sqlQuery, [
      id,
      wikidata_id,
      label.fr,
      label.en || label.fr,
      description?.fr,
      description?.en || description?.fr,
      start_date,
      end_date,
      children || [],
      temporal_location
    ]);

    console.log('[API] Période créée:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[API] Erreur lors de la création de la période:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la période' });
  }
});

// Route pour obtenir une période par son ID
router.get('/periods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[API] Récupération de la période ${id}`);

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
        p.has_parent,
        p.children,
        p.temporal_location,
        c.label_fr as category_label
      FROM periods.periods p
      LEFT JOIN categories.period_categories pc ON p.id = pc.period_id
      LEFT JOIN categories.categories c ON pc.category_id = c.id
      WHERE p.id = $1
    `;

    const result = await dbQuery(sqlQuery, [id]);

    if (result.rows.length === 0) {
      console.log(`[API] Période ${id} non trouvée`);
      return res.status(404).json({ error: 'Période non trouvée' });
    }

    const period = {
      id: result.rows[0].id,
      wikidata_id: result.rows[0].wikidata_id,
      label: {
        fr: result.rows[0].label_fr,
        en: result.rows[0].label_en || result.rows[0].label_fr
      },
      description: result.rows[0].description_fr ? {
        fr: result.rows[0].description_fr,
        en: result.rows[0].description_en || result.rows[0].description_fr
      } : undefined,
      startDate: result.rows[0].start_date,
      endDate: result.rows[0].end_date,
      hasParent: result.rows[0].has_parent,
      children: result.rows[0].children || [],
      temporalLocation: result.rows[0].temporal_location,
      categories: result.rows[0].category_label ? [{
        id: result.rows[0].category_id,
        label: {
          fr: result.rows[0].category_label,
          en: result.rows[0].category_label
        }
      }] : [],
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };

    console.log(`[API] Période ${id} trouvée:`, period);
    res.json(period);
  } catch (error) {
    console.error('[API] Erreur lors de la récupération de la période:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la période' });
  }
});

// Route pour mettre à jour les enfants d'une période
router.patch('/periods/:id/children', async (req, res) => {
  try {
    const { id } = req.params;
    const { children } = req.body;

    // Vérifier que children est un tableau
    if (!Array.isArray(children)) {
      return res.status(400).json({ error: 'children doit être un tableau' });
    }

    // Vérifier que tous les éléments sont des chaînes de caractères
    if (!children.every(child => typeof child === 'string')) {
      return res.status(400).json({ error: 'tous les enfants doivent être des identifiants valides' });
    }

    // Récupérer d'abord la période actuelle pour avoir la liste des enfants existants
    const currentPeriod = await dbQuery(`
      SELECT children FROM periods.periods WHERE id = $1
    `, [id]);

    if (currentPeriod.rows.length === 0) {
      return res.status(404).json({ error: 'Période non trouvée' });
    }

    // Fusionner les enfants existants avec les nouveaux
    const existingChildren = currentPeriod.rows[0].children || [];
    const newChildren = [...new Set([...existingChildren, ...children])];

    // Mettre à jour les enfants de la période cible
    const result = await dbQuery(`
      UPDATE periods.periods
      SET 
        children = $1::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [JSON.stringify(newChildren), id]);

    // Vérifier que les enfants ont été correctement enregistrés
    const updatedPeriod = result.rows[0];
    if (!Array.isArray(updatedPeriod.children)) {
      console.error('[API] Les enfants n\'ont pas été correctement enregistrés comme un tableau');
      return res.status(500).json({ error: 'Erreur lors de la mise à jour des enfants' });
    }

    res.json(updatedPeriod);
  } catch (error: any) {
    console.error('[API] Erreur PATCH /periods/:id/children:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour mettre à jour le statut has_parent d'une période
router.patch('/periods/:id/has_parent', async (req, res) => {
  try {
    const { id } = req.params;
    const { has_parent } = req.body;

    // Mettre à jour has_parent
    const result = await dbQuery(`
      UPDATE periods.periods
      SET 
        has_parent = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [has_parent, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Période non trouvée' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('[API] Erreur PATCH /periods/:id/has_parent:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 