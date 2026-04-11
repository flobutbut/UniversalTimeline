import express from 'express';
import { query as dbQuery } from './database.js';
import type { Event } from '../types/geological.js';
import axios from 'axios';

const router = express.Router();

console.log('########################## BACKEND CODE ACTIF ##########################');

// ─── Calcul de years_bp côté serveur ─────────────────────────────────────────
// Miroir simplifié de DateService.parse() — retourne les années avant le présent.
// Utilisé pour renseigner les colonnes start_years_bp / end_years_bp / date_years_bp.

const CURRENT_YEAR = new Date().getFullYear();
const GA = 1_000_000_000;
const MA = 1_000_000;
const KA = 1_000;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** CE calendar UTC — évite le piège ECMAScript (années 0–99 → 1900+n dans Date.UTC). */
function calendarUtcCE(year: number, month: number, day: number, hour: number, minute: number): Date {
  const d = new Date(Date.UTC(2000, month - 1, day, hour, minute));
  d.setUTCFullYear(year);
  return d;
}

function computeYearsBP(dateStr: string | null | undefined): number | null {
  if (!dateStr || dateStr === 'NOW' || dateStr === 'TODAY') return 0;

  // Format canonique G/M/K/A
  const canonical = dateStr.match(/^([GMKA])(\d+(?:\.\d+)?)$/);
  if (canonical) {
    const v = parseFloat(canonical[2]);
    switch (canonical[1]) {
      case 'G': return v * GA;
      case 'M': return v * MA;
      case 'K': return v * KA;
      case 'A': return v;
    }
  }

  // Wikidata ISO étendu négatif (BCE) : -65000000-01-01T00:00:00Z
  const wikiNeg = dateStr.match(/^-(\d+)-\d{2}-\d{2}T/);
  if (wikiNeg) return parseInt(wikiNeg[1]) + CURRENT_YEAR;

  // Wikidata ISO étendu positif (CE) : +1944-06-06T14:32:00Z
  const wikiPos = dateStr.match(/^\+?(\d+)-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (wikiPos) {
    const y = +wikiPos[1];
    const d =
      y < 100
        ? calendarUtcCE(y, +wikiPos[2], +wikiPos[3], +wikiPos[4], +wikiPos[5])
        : new Date(Date.UTC(y, +wikiPos[2] - 1, +wikiPos[3], +wikiPos[4], +wikiPos[5]));
    return Math.max(0, (Date.now() - d.getTime()) / MS_PER_YEAR);
  }

  // Calendrier ISO moderne : 1944-06-06 ou 1944-06-06T14:32
  const cal = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (cal) {
    const y = +cal[1];
    const d =
      y < 100
        ? calendarUtcCE(y, +cal[2], +cal[3], +(cal[4] || 0), +(cal[5] || 0))
        : new Date(Date.UTC(y, +cal[2] - 1, +cal[3], +(cal[4] || 0), +(cal[5] || 0)));
    return Math.max(0, (Date.now() - d.getTime()) / MS_PER_YEAR);
  }

  // Géologique legacy : "65 Ma", "4.6 Ga"
  const geo = dateStr.match(/^(\d+(?:\.\d+)?)\s*(Ga|Ma|ka|ans?)$/i);
  if (geo) {
    const v = parseFloat(geo[1]);
    const u = geo[2].toLowerCase();
    if (u === 'ga')  return v * GA;
    if (u === 'ma')  return v * MA;
    if (u === 'ka')  return v * KA;
    return v;
  }

  // Année seule : "1789"
  const yr = dateStr.match(/^(\d{4})$/);
  if (yr) return Math.max(0, CURRENT_YEAR - parseInt(yr[1]));

  return null; // format inconnu
}

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

// Route de recherche globale (périodes + événements)
router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json({ periods: [], events: [] });

    const pattern = `%${q}%`;

    const [periodsResult, eventsResult] = await Promise.all([
      dbQuery(`
        SELECT p.id, p.wikidata_id, p.label_fr, p.label_en,
               p.start_date, p.end_date, p.parent_id,
               p.start_years_bp, p.end_years_bp,
               EXISTS(SELECT 1 FROM public.periods c WHERE c.parent_id = p.id) AS has_children
        FROM public.periods p
        WHERE p.label_fr ILIKE $1 OR p.label_en ILIKE $1
        ORDER BY p.start_years_bp DESC NULLS LAST
        LIMIT 20
      `, [pattern]),
      dbQuery(`
        SELECT e.id, e.wikidata_id, e.label_fr, e.label_en,
               e.description_fr, e.date, e.date_years_bp
        FROM public.events e
        WHERE e.label_fr ILIKE $1 OR e.label_en ILIKE $1
        ORDER BY e.date_years_bp DESC NULLS LAST
        LIMIT 20
      `, [pattern]),
    ]);

    const periods = periodsResult.rows.map(r => ({
      id: r.id,
      wikidataId: r.wikidata_id,
      label: { fr: r.label_fr, en: r.label_en || r.label_fr },
      startDate: r.start_date,
      endDate: r.end_date,
      parentId: r.parent_id,
      startYearsBP: r.start_years_bp != null ? Number(r.start_years_bp) : null,
      endYearsBP: r.end_years_bp != null ? Number(r.end_years_bp) : null,
      hasChildren: r.has_children,
    }));

    const events = eventsResult.rows.map(r => ({
      id: r.id,
      wikidataId: r.wikidata_id,
      label: { fr: r.label_fr, en: r.label_en || r.label_fr },
      description: r.description_fr,
      date: r.date,
      dateYearsBP: r.date_years_bp != null ? Number(r.date_years_bp) : null,
    }));

    res.json({ periods, events });
  } catch (error) {
    console.error('[API] Erreur recherche:', error);
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
});

// Route pour obtenir les périodes
router.get('/periods', async (req, res) => {
  try {
    console.log('[API] Récupération des périodes');
    const result = await dbQuery(`
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
        p.start_years_bp,
        p.end_years_bp,
        EXISTS(SELECT 1 FROM public.periods child WHERE child.parent_id = p.id) AS has_children,
        c.id as category_id,
        c.label_fr as category_label_fr,
        c.label_en as category_label_en
      FROM public.periods p
      LEFT JOIN public.period_categories pc ON p.id = pc.period_id
      LEFT JOIN public.categories c ON pc.category_id = c.id
      WHERE p.parent_id IS NULL
      ORDER BY p.start_years_bp DESC NULLS LAST
    `);

    // Grouper les périodes avec leurs catégories
    const periodsMap = new Map();
    result.rows.forEach(row => {
      if (!periodsMap.has(row.id)) {
        periodsMap.set(row.id, {
          id: row.id,
          wikidata_id: row.wikidata_id,
          label_fr: row.label_fr,
          label_en: row.label_en,
          description_fr: row.description_fr,
          description_en: row.description_en,
          start_date: row.start_date,
          end_date: row.end_date,
          parent_id: row.parent_id,
          start_years_bp: row.start_years_bp,
          end_years_bp: row.end_years_bp,
          has_children: row.has_children,
          categories: []
        });
      }
      
      if (row.category_id) {
        const period = periodsMap.get(row.id);
        period.categories.push({
          id: row.category_id,
          label: {
            fr: row.category_label_fr,
            en: row.category_label_en || row.category_label_fr
          }
        });
      }
    });

    const periods = Array.from(periodsMap.values());

    res.json(periods);
  } catch (error) {
    console.error('[API] Erreur lors de la récupération des périodes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des périodes' });
  }
});

// Route pour obtenir les événements
router.get('/events', async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT
        e.id,
        e.wikidata_id,
        e.label_fr,
        e.label_en,
        e.description_fr,
        e.description_en,
        e.date,
        e.date_years_bp,
        e.created_at,
        e.updated_at,
        c.id            AS category_id,
        c.label_fr      AS category_label_fr,
        c.label_en      AS category_label_en
      FROM public.events e
      LEFT JOIN public.event_categories ec ON e.id = ec.event_id
      LEFT JOIN public.categories        c  ON ec.category_id = c.id
      ORDER BY e.date_years_bp DESC NULLS LAST
    `);

    const eventsMap = new Map<string, any>();
    for (const row of result.rows) {
      if (!eventsMap.has(row.id)) {
        eventsMap.set(row.id, {
          id: row.id,
          wikidata_id: row.wikidata_id,
          label: { fr: row.label_fr, en: row.label_en || row.label_fr },
          description: row.description_fr
            ? { fr: row.description_fr, en: row.description_en || row.description_fr }
            : undefined,
          date: row.date || '',
          date_years_bp: row.date_years_bp,
          categories: [],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
      if (row.category_id) {
        eventsMap.get(row.id).categories.push({
          id: row.category_id,
          label: { fr: row.category_label_fr, en: row.category_label_en || row.category_label_fr },
        });
      }
    }

    res.json(Array.from(eventsMap.values()));
  } catch (error) {
    console.error('[API] Erreur lors de la récupération des événements:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des événements' });
  }
});

// Route pour créer un événement
router.post('/events', async (req, res) => {
  try {
    const { id, wikidata_id, label, description, date, categories } = req.body;

    console.log('[API] Création d\'un événement avec les données:', req.body);

    if (!label || !label.fr) {
      console.error('[API] label.fr manquant dans les données');
      return res.status(400).json({ error: 'label.fr est requis' });
    }

    // Création de l'événement
    const createEventQuery = `
      INSERT INTO public.events (
        id,
        wikidata_id,
        label_fr,
        label_en,
        description_fr,
        description_en,
        date,
        date_years_bp,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await dbQuery(createEventQuery, [
      id,
      wikidata_id || null,
      label.fr,
      label.en || label.fr,
      description?.fr || null,
      description?.en || description?.fr || null,
      date,
      computeYearsBP(date)
    ]);

    // Catégories
    if (categories && Array.isArray(categories) && categories.length > 0) {
      const validCats = categories.filter((c: any) => c?.id);
      if (validCats.length > 0) {
        const vals = validCats.map((_: any, i: number) => `($1, $${i + 2})`).join(',');
        await dbQuery(`INSERT INTO public.event_categories (event_id, category_id) VALUES ${vals}`,
          [result.rows[0].id, ...validCats.map((c: any) => c.id)]);
      }
    }

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
        s.created_at,
        s.updated_at,
        sb.start_date,
        sb.end_date,
        c.id as category_id,
        c.label_fr as category_label_fr,
        c.label_en as category_label_en
      FROM public.stories s
      LEFT JOIN (
        SELECT
          story_id,
          MIN(start_candidate) AS start_date,
          MAX(end_candidate) AS end_date
        FROM (
          SELECT
            sp.story_id,
            p.start_date::text AS start_candidate,
            CAST(NULL AS text) AS end_candidate
          FROM public.story_periods sp
          INNER JOIN public.periods p ON p.id = sp.period_id
          WHERE p.start_date IS NOT NULL AND btrim(p.start_date::text) <> ''
          UNION ALL
          SELECT
            sp.story_id,
            CAST(NULL AS text),
            p.end_date::text
          FROM public.story_periods sp
          INNER JOIN public.periods p ON p.id = sp.period_id
          WHERE p.end_date IS NOT NULL AND btrim(p.end_date::text) <> ''
          UNION ALL
          SELECT
            se.story_id,
            e.date::text,
            e.date::text
          FROM public.story_events se
          INNER JOIN public.events e ON e.id = se.event_id
          WHERE e.date IS NOT NULL AND btrim(e.date::text) <> ''
        ) story_temporal_bounds
        GROUP BY story_id
      ) sb ON sb.story_id::text = s.id::text
      LEFT JOIN public.story_categories sc ON s.id = sc.story_id
      LEFT JOIN public.categories c ON sc.category_id = c.id
      ORDER BY s.created_at DESC
    `;

    const result = await dbQuery(sqlQuery);
    
    // Grouper les stories avec leurs catégories
    const storiesMap = new Map();
    result.rows.forEach(row => {
      if (!storiesMap.has(row.id)) {
        storiesMap.set(row.id, {
          id: row.id,
          title_fr: row.title_fr,
          title_en: row.title_en,
          description_fr: row.description_fr,
          description_en: row.description_en,
          author: row.author,
          is_public: row.is_public,
          created_at: row.created_at,
          updated_at: row.updated_at,
          start_date: row.start_date ?? null,
          end_date: row.end_date ?? null,
          categories: []
        });
      }
      
      if (row.category_id) {
        const story = storiesMap.get(row.id);
        story.categories.push({
          id: row.category_id,
          label: {
            fr: row.category_label_fr,
            en: row.category_label_en || row.category_label_fr
          }
        });
      }
    });

    const stories = Array.from(storiesMap.values());
    res.json(stories);
  } catch (error) {
    console.error('Erreur lors de la récupération des stories:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des stories' });
  }
});

/** Bornes temporelles par story (débuts périodes + dates événements / fins périodes + dates événements). Route statique avant /stories/:id. */
router.get('/stories/temporal-bounds', async (_req, res) => {
  try {
    const sqlQuery = `
      SELECT
        story_id::text AS story_id,
        MIN(start_candidate) AS start_date,
        MAX(end_candidate) AS end_date
      FROM (
        SELECT
          sp.story_id,
          p.start_date::text AS start_candidate,
          CAST(NULL AS text) AS end_candidate
        FROM public.story_periods sp
        INNER JOIN public.periods p ON p.id = sp.period_id
        WHERE p.start_date IS NOT NULL AND btrim(p.start_date::text) <> ''
        UNION ALL
        SELECT
          sp.story_id,
          CAST(NULL AS text),
          p.end_date::text
        FROM public.story_periods sp
        INNER JOIN public.periods p ON p.id = sp.period_id
        WHERE p.end_date IS NOT NULL AND btrim(p.end_date::text) <> ''
        UNION ALL
        SELECT
          se.story_id,
          e.date::text,
          e.date::text
        FROM public.story_events se
        INNER JOIN public.events e ON e.id = se.event_id
        WHERE e.date IS NOT NULL AND btrim(e.date::text) <> ''
      ) z
      GROUP BY story_id
    `;
    const result = await dbQuery(sqlQuery);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur /stories/temporal-bounds:', error);
    res.status(500).json({ error: 'Erreur lors du calcul des bornes temporelles' });
  }
});

// Route pour créer une nouvelle story
router.post('/stories', async (req, res) => {
  try {
    const { title, description, author, isPublic } = req.body;
    
    const sqlQuery = `
      INSERT INTO public.stories (
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
      INSERT INTO public.story_periods (story_id, period_id)
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
      INSERT INTO public.story_events (story_id, event_id)
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
      DELETE FROM public.story_periods
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
      DELETE FROM public.story_events
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
      FROM public.periods p
      JOIN public.story_periods sp ON p.id = sp.period_id
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
      FROM public.events e
      JOIN public.story_events se ON e.id = se.event_id
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
      FROM public.categories c
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

    if (!label || !label.fr) {
      console.error('[API] label.fr manquant dans les données');
      return res.status(400).json({ error: 'label.fr est requis' });
    }

    // Mise à jour de l'événement
    const updateEventQuery = `
      UPDATE public.events
      SET
        label_fr = $1,
        label_en = $2,
        description_fr = $3,
        description_en = $4,
        wikidata_id = $5,
        date = $6,
        date_years_bp = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;

    const result = await dbQuery(updateEventQuery, [
      label.fr,
      label.en || label.fr,
      description?.fr,
      description?.en || description?.fr,
      wikidata_id,
      date,
      id,
      computeYearsBP(date),
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
      await dbQuery('DELETE FROM public.event_categories WHERE event_id = $1', [id]);

      // Filtrer les catégories valides (avec un ID)
      const validCategories = categories.filter(cat => cat && cat.id);
      
      if (validCategories.length > 0) {
        // Ajouter les nouvelles catégories
        const categoryValues = validCategories.map((_, index) => `($1, $${index + 2})`).join(',');
        const categoryParams = [id, ...validCategories.map(cat => cat.id)];
        
        const insertCategoryQuery = `
          INSERT INTO public.event_categories (event_id, category_id)
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
    const { label, description, start_date, end_date, wikidata_id, categories } = req.body;

    console.log(`[API] Mise à jour de la période ${id} avec les données:`, req.body);

    if (!label || !label.fr) {
      console.error('[API] label.fr manquant dans les données');
      return res.status(400).json({ error: 'label.fr est requis' });
    }

    // Si end_date est vide, utiliser "TODAY"
    const finalEndDate = end_date || 'TODAY';

    // Vérification du format des données
    console.log('[API] Vérification des données:');
    console.log('- label:', label);
    console.log('- description:', description);
    console.log('- start_date:', start_date);
    console.log('- end_date:', finalEndDate);
    console.log('- wikidata_id:', wikidata_id);
    console.log('- categories:', categories);

    // Mise à jour de la période
    const updatePeriodQuery = `
      UPDATE public.periods
      SET
        label_fr = $1,
        label_en = $2,
        description_fr = $3,
        description_en = $4,
        start_date = NULLIF($5, ''),
        end_date = $6,
        wikidata_id = $7,
        start_years_bp = $8,
        end_years_bp = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;

    const params = [
      label.fr,
      label.en || label.fr,
      description?.fr || null,
      description?.en || description?.fr || null,
      start_date || null,
      finalEndDate,
      wikidata_id,
      computeYearsBP(start_date),
      computeYearsBP(finalEndDate),
      id,
    ];

    console.log('[API] Requête SQL:', updatePeriodQuery);
    console.log('[API] Paramètres:', params);

    const result = await dbQuery(updatePeriodQuery, params);

    if (result.rows.length === 0) {
      console.log('[API] Aucune période trouvée avec l\'ID:', id);
      return res.status(404).json({ error: 'Période non trouvée' });
    }

    console.log('[API] Période mise à jour:', result.rows[0]);

    // Mise à jour des catégories
    if (categories && Array.isArray(categories) && categories.length > 0) {
      console.log('[API] Mise à jour des catégories:', categories);
      
      // Supprimer les anciennes catégories
      await dbQuery('DELETE FROM public.period_categories WHERE period_id = $1', [id]);

      // Filtrer les catégories valides (avec un ID)
      const validCategories = categories.filter(cat => cat && cat.id);
      
      if (validCategories.length > 0) {
        // Ajouter les nouvelles catégories
        const categoryValues = validCategories.map((_, index) => `($1, $${index + 2})`).join(',');
        const categoryParams = [id, ...validCategories.map(cat => cat.id)];
        
        const insertCategoryQuery = `
          INSERT INTO public.period_categories (period_id, category_id)
          VALUES ${categoryValues}
        `;
        
        console.log('[API] Requête SQL pour les catégories:', insertCategoryQuery);
        console.log('[API] Paramètres des catégories:', categoryParams);
        
        await dbQuery(insertCategoryQuery, categoryParams);
      }
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('[API] Erreur lors de la mise à jour de la période:', error);
    console.error('[API] Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour de la période',
      details: error.message,
      stack: error.stack
    });
  }
});

// Route pour supprimer un événement
router.delete('/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Supprimer les catégories associées (si besoin)
    await dbQuery('DELETE FROM public.event_categories WHERE event_id = $1', [id]);
    // Supprimer l'événement
    const result = await dbQuery('DELETE FROM public.events WHERE id = $1 RETURNING *', [id]);
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
      FROM public.stories s
      WHERE s.id = $1
    `;
    const storyResult = await dbQuery(storyQuery, [id]);
    if (storyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Story non trouvée' });
    }
    const story = storyResult.rows[0];

    // Récupérer les catégories de la story
    const storyCategoriesQuery = `
      SELECT 
        c.id,
        c.label_fr,
        c.label_en,
        c.description_fr,
        c.description_en
      FROM public.categories c
      JOIN public.story_categories sc ON c.id = sc.category_id
      WHERE sc.story_id = $1
      ORDER BY c.label_fr
    `;
    const storyCategoriesResult = await dbQuery(storyCategoriesQuery, [id]);
    const storyCategories = storyCategoriesResult.rows.map(cat => ({
      id: cat.id,
      label: {
        fr: cat.label_fr,
        en: cat.label_en || cat.label_fr
      },
      description: cat.description_fr ? {
        fr: cat.description_fr,
        en: cat.description_en || cat.description_fr
      } : undefined
    }));

    // Récupérer les périodes associées avec leurs catégories
    const periodsQuery = `
      SELECT 
        p.*,
        c.id as category_id,
        c.label_fr as category_label_fr,
        c.label_en as category_label_en
      FROM public.periods p
      JOIN public.story_periods sp ON p.id = sp.period_id
      LEFT JOIN public.period_categories pc ON p.id = pc.period_id
      LEFT JOIN public.categories c ON pc.category_id = c.id
      WHERE sp.story_id = $1
      ORDER BY p.start_date
    `;
    const periodsResult = await dbQuery(periodsQuery, [id]);
    
    // Grouper les périodes avec leurs catégories
    const periodsMap = new Map();
    periodsResult.rows.forEach(row => {
      if (!periodsMap.has(row.id)) {
        periodsMap.set(row.id, {
          id: row.id,
          label: { fr: row.label_fr, en: row.label_en || row.label_fr },
          description: row.description_fr ? { fr: row.description_fr, en: row.description_en || row.description_fr } : undefined,
          startDate: row.start_date,
          endDate: row.end_date,
          parentId: row.parent_id,
          startYearsBP: row.start_years_bp != null ? Number(row.start_years_bp) : null,
          endYearsBP: row.end_years_bp != null ? Number(row.end_years_bp) : null,
          categories: [],
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      }
      
      if (row.category_id) {
        const period = periodsMap.get(row.id);
        period.categories.push({
          id: row.category_id,
          label: {
            fr: row.category_label_fr,
            en: row.category_label_en || row.category_label_fr
          }
        });
      }
    });
    const periods = Array.from(periodsMap.values());

    // Récupérer les événements associés avec leurs catégories
    const eventsQuery = `
      SELECT 
        e.*,
        c.id as category_id,
        c.label_fr as category_label_fr,
        c.label_en as category_label_en
      FROM public.events e
      JOIN public.story_events se ON e.id = se.event_id
      LEFT JOIN public.event_categories ec ON e.id = ec.event_id
      LEFT JOIN public.categories c ON ec.category_id = c.id
      WHERE se.story_id = $1
      ORDER BY e.date
    `;
    const eventsResult = await dbQuery(eventsQuery, [id]);
    
    // Grouper les événements avec leurs catégories
    const eventsMap = new Map();
    eventsResult.rows.forEach(row => {
      if (!eventsMap.has(row.id)) {
        eventsMap.set(row.id, {
          id: row.id,
          label: { fr: row.label_fr, en: row.label_en || row.label_fr },
          description: row.description_fr ? { fr: row.description_fr, en: row.description_en || row.description_fr } : undefined,
          date: row.date,
          categories: [],
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      }
      
      if (row.category_id) {
        const event = eventsMap.get(row.id);
        event.categories.push({
          id: row.category_id,
          label: {
            fr: row.category_label_fr,
            en: row.category_label_en || row.category_label_fr
          }
        });
      }
    });
    const events = Array.from(eventsMap.values());

    // Construction de l'objet final
    const storyData = {
      id: story.id,
      title: { fr: story.title_fr, en: story.title_en || story.title_fr },
      description: story.description_fr ? { fr: story.description_fr, en: story.description_en || story.description_fr } : undefined,
      author: story.author,
      isPublic: story.is_public,
      categories: storyCategories,
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
    await dbQuery('DELETE FROM public.story_events WHERE story_id = $1', [id]);
    await dbQuery('DELETE FROM public.story_periods WHERE story_id = $1', [id]);
    await dbQuery('DELETE FROM public.story_categories WHERE story_id = $1', [id]);
    // Supprimer la story elle-même
    const result = await dbQuery('DELETE FROM public.stories WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Story non trouvée' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de la story:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la story' });
  }
});

// Route pour mettre à jour une story
router.put('/stories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, author, isPublic, categories } = req.body;

    console.log(`[API] Mise à jour de la story ${id} avec les données:`, req.body);

    // Validation des données requises
    if (!title || !title.fr) {
      console.error('[API] title.fr manquant dans les données');
      return res.status(400).json({ error: 'title.fr est requis' });
    }

    if (!author) {
      console.error('[API] author manquant dans les données');
      return res.status(400).json({ error: 'author est requis' });
    }

    // Mise à jour de la story
    const updateStoryQuery = `
      UPDATE public.stories
      SET 
        title_fr = $1,
        title_en = $2,
        description_fr = $3,
        description_en = $4,
        author = $5,
        is_public = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;

    const params = [
      title.fr,
      title.en || title.fr,
      description?.fr || null,
      description?.en || description?.fr || null,
      author,
      isPublic !== undefined ? isPublic : true,
      id
    ];

    console.log('[API] Requête SQL:', updateStoryQuery);
    console.log('[API] Paramètres:', params);

    const result = await dbQuery(updateStoryQuery, params);

    if (result.rows.length === 0) {
      console.log('[API] Aucune story trouvée avec l\'ID:', id);
      return res.status(404).json({ error: 'Story non trouvée' });
    }

    console.log('[API] Story mise à jour:', result.rows[0]);

    // Mise à jour des catégories
    if (categories && Array.isArray(categories) && categories.length > 0) {
      console.log('[API] Mise à jour des catégories:', categories);
      
      // Supprimer les anciennes catégories
      await dbQuery('DELETE FROM public.story_categories WHERE story_id = $1', [id]);

      // Filtrer les catégories valides (avec un ID)
      const validCategories = categories.filter(cat => cat && cat.id);
      
      if (validCategories.length > 0) {
        // Ajouter les nouvelles catégories
        const categoryValues = validCategories.map((_, index) => `($1, $${index + 2})`).join(',');
        const categoryParams = [id, ...validCategories.map(cat => cat.id)];
        
        const insertCategoryQuery = `
          INSERT INTO public.story_categories (story_id, category_id)
          VALUES ${categoryValues}
        `;
        
        console.log('[API] Requête SQL pour les catégories:', insertCategoryQuery);
        console.log('[API] Paramètres des catégories:', categoryParams);
        
        await dbQuery(insertCategoryQuery, categoryParams);
      }
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('[API] Erreur lors de la mise à jour de la story:', error);
    console.error('[API] Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour de la story',
      details: error.message,
      stack: error.stack
    });
  }
});

// Route pour créer une période
router.post('/periods', async (req, res) => {
  try {
    const { id, wikidata_id, label, description, start_date, end_date } = req.body;

    // Validation des données requises
    if (!wikidata_id) {
      console.error('[API] wikidata_id manquant dans les données');
      return res.status(400).json({ error: 'wikidata_id est requis' });
    }

    if (!label || !label.fr) {
      console.error('[API] label.fr manquant dans les données');
      return res.status(400).json({ error: 'label.fr est requis' });
    }

    const finalEndDateCreate = end_date || 'NOW';
    const sqlQuery = `
      INSERT INTO public.periods (
        id, wikidata_id, label_fr, label_en,
        description_fr, description_en,
        start_date, end_date,
        start_years_bp, end_years_bp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await dbQuery(sqlQuery, [
      id,
      wikidata_id,
      label.fr,
      label.en || label.fr,
      description?.fr,
      description?.en || description?.fr,
      start_date,
      finalEndDateCreate,
      computeYearsBP(start_date),
      computeYearsBP(finalEndDateCreate),
    ]);

    console.log('[API] Période créée:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[API] Erreur lors de la création de la période:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la période' });
  }
});

// Route pour obtenir les enfants directs d'une période
router.get('/periods/:id/children', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dbQuery(`
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
        p.start_years_bp,
        p.end_years_bp,
        EXISTS(SELECT 1 FROM public.periods child WHERE child.parent_id = p.id) AS has_children,
        c.id as category_id,
        c.label_fr as category_label_fr,
        c.label_en as category_label_en
      FROM public.periods p
      LEFT JOIN public.period_categories pc ON p.id = pc.period_id
      LEFT JOIN public.categories c ON pc.category_id = c.id
      WHERE p.parent_id = $1
      ORDER BY p.start_years_bp DESC NULLS LAST
    `, [id]);

    const periodsMap = new Map();
    result.rows.forEach(row => {
      if (!periodsMap.has(row.id)) {
        periodsMap.set(row.id, {
          id: row.id,
          wikidata_id: row.wikidata_id,
          label_fr: row.label_fr,
          label_en: row.label_en,
          description_fr: row.description_fr,
          description_en: row.description_en,
          start_date: row.start_date,
          end_date: row.end_date,
          parent_id: row.parent_id,
          start_years_bp: row.start_years_bp,
          end_years_bp: row.end_years_bp,
          has_children: row.has_children,
          categories: [],
        });
      }
      if (row.category_id) {
        periodsMap.get(row.id).categories.push({
          id: row.category_id,
          label: { fr: row.category_label_fr, en: row.category_label_en || row.category_label_fr },
        });
      }
    });

    res.json(Array.from(periodsMap.values()));
  } catch (error) {
    console.error('[API] Erreur GET /periods/:id/children:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des enfants' });
  }
});

// Route pour obtenir une période par son ID
router.get('/periods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[API] Récupération de la période ${id}`);

    // Récupérer la période
    const periodQuery = `
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
        p.start_years_bp,
        p.end_years_bp,
        p.created_at,
        p.updated_at
      FROM public.periods p
      WHERE p.id = $1
    `;

    const periodResult = await dbQuery(periodQuery, [id]);

    if (periodResult.rows.length === 0) {
      console.log(`[API] Période ${id} non trouvée`);
      return res.status(404).json({ error: 'Période non trouvée' });
    }

    const periodData = periodResult.rows[0];

    // Récupérer les catégories
    const categoriesQuery = `
      SELECT 
        c.id,
        c.label_fr,
        c.label_en,
        c.description_fr,
        c.description_en
      FROM public.categories c
      JOIN public.period_categories pc ON c.id = pc.category_id
      WHERE pc.period_id = $1
      ORDER BY c.label_fr
    `;

    const categoriesResult = await dbQuery(categoriesQuery, [id]);
    const categories = categoriesResult.rows.map(cat => ({
      id: cat.id,
      label: {
        fr: cat.label_fr,
        en: cat.label_en || cat.label_fr
      },
      description: cat.description_fr ? {
        fr: cat.description_fr,
        en: cat.description_en || cat.description_fr
      } : undefined
    }));

    const period = {
      id: periodData.id,
      wikidata_id: periodData.wikidata_id,
      label: {
        fr: periodData.label_fr,
        en: periodData.label_en || periodData.label_fr
      },
      description: periodData.description_fr ? {
        fr: periodData.description_fr,
        en: periodData.description_en || periodData.description_fr
      } : undefined,
      startDate: periodData.start_date,
      endDate: periodData.end_date,
      parentId: periodData.parent_id,
      startYearsBP: periodData.start_years_bp != null ? Number(periodData.start_years_bp) : null,
      endYearsBP: periodData.end_years_bp != null ? Number(periodData.end_years_bp) : null,
      categories,
      createdAt: periodData.created_at,
      updatedAt: periodData.updated_at
    };

    console.log(`[API] Période ${id} trouvée:`, period);
    res.json(period);
  } catch (error) {
    console.error('[API] Erreur lors de la récupération de la période:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la période' });
  }
});

// Route pour définir le parent d'une période (remplace l'ancien PATCH /children + /has_parent)
router.patch('/periods/:id/parent', async (req, res) => {
  try {
    const { id } = req.params;
    const { parent_id } = req.body; // null pour retirer le parent

    const result = await dbQuery(`
      UPDATE public.periods
      SET parent_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [parent_id ?? null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Période non trouvée' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('[API] Erreur PATCH /periods/:id/parent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour obtenir une période par son ID Wikidata
router.get('/periods/wikidata/:wikidataId', async (req, res) => {
  try {
    const { wikidataId } = req.params;
    console.log(`[API] Récupération de la période avec l'ID Wikidata ${wikidataId}`);

    // Récupérer la période
    const periodQuery = `
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
        p.start_years_bp,
        p.end_years_bp,
        p.created_at,
        p.updated_at
      FROM public.periods p
      WHERE p.wikidata_id = $1
    `;

    const periodResult = await dbQuery(periodQuery, [wikidataId]);

    if (periodResult.rows.length === 0) {
      console.log(`[API] Période avec l'ID Wikidata ${wikidataId} non trouvée`);
      return res.status(404).json({ error: 'Période non trouvée' });
    }

    const periodData = periodResult.rows[0];

    // Récupérer les catégories
    const categoriesQuery = `
      SELECT 
        c.id,
        c.label_fr,
        c.label_en,
        c.description_fr,
        c.description_en
      FROM public.categories c
      JOIN public.period_categories pc ON c.id = pc.category_id
      WHERE pc.period_id = $1
      ORDER BY c.label_fr
    `;

    const categoriesResult = await dbQuery(categoriesQuery, [periodData.id]);
    const categories = categoriesResult.rows.map(cat => ({
      id: cat.id,
      label: {
        fr: cat.label_fr,
        en: cat.label_en || cat.label_fr
      },
      description: cat.description_fr ? {
        fr: cat.description_fr,
        en: cat.description_en || cat.description_fr
      } : undefined
    }));

    const period = {
      id: periodData.id,
      wikidata_id: periodData.wikidata_id,
      label: {
        fr: periodData.label_fr,
        en: periodData.label_en || periodData.label_fr
      },
      description: periodData.description_fr ? {
        fr: periodData.description_fr,
        en: periodData.description_en || periodData.description_fr
      } : undefined,
      startDate: periodData.start_date,
      endDate: periodData.end_date,
      parentId: periodData.parent_id,
      startYearsBP: periodData.start_years_bp != null ? Number(periodData.start_years_bp) : null,
      endYearsBP: periodData.end_years_bp != null ? Number(periodData.end_years_bp) : null,
      categories,
      createdAt: periodData.created_at,
      updatedAt: periodData.updated_at
    };

    console.log(`[API] Période avec l'ID Wikidata ${wikidataId} trouvée:`, period);
    res.json(period);
  } catch (error) {
    console.error('[API] Erreur lors de la récupération de la période par Wikidata ID:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la période' });
  }
});

export default router; 