import express from 'express';
import { query as dbQuery } from './database.js';
import type { Event } from '../types/geological.js';
import axios from 'axios';

const router = express.Router();

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
    res.json(result.rows);
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
        e.wikidata_id,
        e.label_fr,
        e.description_fr,
        c.label_fr as category_label
      FROM events.events e
      LEFT JOIN categories.event_categories ec ON e.id = ec.event_id
      LEFT JOIN categories.categories c ON ec.category_id = c.id
      ORDER BY e.id
    `;

    const result = await dbQuery(sqlQuery);
    console.log(`[API] ${result.rows.length} événements trouvés dans la base de données`);
    
    // Récupérer les dates depuis Wikidata pour chaque événement
    console.log('[API] Début de la récupération des dates depuis Wikidata');
    const eventsWithDates = await Promise.all(
      result.rows.map(async (row: any) => {
        console.log(`[API] Traitement de l'événement ${row.id} (Wikidata ID: ${row.wikidata_id})`);
        const date = await getEventDateFromWikidata(row.wikidata_id);
        const event = {
          id: row.id,
          label: row.label_fr,
          date: date || 'Date inconnue',
          description: row.description_fr,
          category: row.category_label,
          source: 'Wikidata'
        };
        console.log(`[API] Événement traité :`, event);
        return event;
      })
    );

    console.log('[API] Envoi de la réponse avec les événements');
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

interface TimelineEvent {
  id: string;
  label: string;
  date: string;
  description: string;
  category: string;
  source: string;
}

const eventIds: Record<string, string> = {
  'EVT_BIGBANG': 'Big Bang',
  'EVT_FIRST_STARS': 'Formation des premières étoiles',
  'EVT_GLOB_CLUSTERS': 'Formation des amas globulaires',
  'EVT_SOLAR_NEB': 'Formation de la nébuleuse solaire',
  'EVT_SUN_FORM': 'Formation du Soleil',
  'EVT_EARTH_FORM': 'Formation de la Terre',
  'EVT_MOON_FORM': 'Formation de la Lune',
  'EVT_OCEAN_FORM': 'Formation des océans',
  'EVT_FIRST_MIN': 'Premiers minéraux connus (zircons)',
  'EVT_FIRST_LIFE': 'Premières traces de vie',
  'EVT_CYANOBACT': 'Formation des premières cyanobactéries',
  'EVT_GOE': 'Apparition de l\'oxygène atmosphérique (Grande Oxydation)',
  'EVT_EUKAR': 'Apparition des premiers eucaryotes',
  'EVT_HURON_GLAC': 'Glaciation huronienne',
  'EVT_COLUMBIA': 'Formation du supercontinent Columbia',
  'EVT_STURT_GLAC': 'Glaciation sturtienne',
  'EVT_EDIACARA': 'Faune d\'Édiacara',
  'EVT_CAMBRIAN': 'Explosion cambrienne',
  'EVT_FIRST_FISH': 'Premiers poissons',
  'EVT_LAND_PLANTS': 'Colonisation des terres par les plantes',
  'EVT_INSECTS': 'Apparition des insectes',
  'EVT_AMPHIBIANS': 'Apparition des premiers amphibiens',
  'EVT_REPTILES': 'Apparition des reptiles',
  'EVT_PANGAEA': 'Formation de la Pangée',
  'EVT_DINOSAURS': 'Apparition des dinosaures',
  'EVT_MAMMALS': 'Apparition des premiers mammifères',
  'EVT_PT_EXT': 'Extinction Permien-Trias',
  'EVT_KT_EXT': 'Extinction Crétacé-Tertiaire',
  'EVT_PRIMATES': 'Apparition des premiers primates',
  'EVT_HOMINIDS': 'Apparition des premiers hominidés',
  'EVT_HOMO': 'Apparition du genre Homo',
  'EVT_FIRE_USE': 'Première utilisation contrôlée du feu',
  'EVT_SAPIENS': 'Apparition d\'Homo sapiens',
  'EVT_CAVE_ART': 'Début de l\'art pariétal',
  'EVT_LAST_GLAC': 'Fin de la dernière période glaciaire',
  'EVT_AGRICULTURE': 'Début de l\'agriculture',
  'EVT_WRITING': 'Invention de l\'écriture',
  'EVT_PYRAMIDS': 'Construction des pyramides de Gizeh',
  'EVT_BUDDHA': 'Naissance de Bouddha',
  'EVT_ROME': 'Fondation de Rome',
  'EVT_JESUS': 'Naissance de Jésus-Christ',
  'EVT_HEGIRA': 'Début de l\'Hégire',
  'EVT_ROME_FALL': 'Chute de l\'Empire romain d\'Occident',
  'EVT_FR_REV': 'Révolution française',
  'EVT_IND_REV': 'Révolution industrielle',
  'EVT_WW1': 'Première Guerre mondiale',
  'EVT_WW2': 'Seconde Guerre mondiale',
  'EVT_MOON_LAND': 'Premier pas sur la Lune'
};

async function getEvents(): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];
  
  for (const [id, label] of Object.entries(eventIds)) {
    try {
      const wikidataId = id.split('_')[1];
      const date = await getEventDateFromWikidata(wikidataId);
      events.push({
        id,
        label,
        date: date || 'Date inconnue',
        description: 'À venir',
        category: 'À venir',
        source: 'Wikidata'
      });
    } catch (error) {
      console.error(`[API] Erreur lors de la récupération de l'événement ${id}:`, error);
      events.push({
        id,
        label,
        date: 'Date inconnue',
        description: 'À venir',
        category: 'À venir',
        source: 'Wikidata'
      });
    }
  }

  return events;
}

export default router; 