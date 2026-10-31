import type { Period, WikidataBinding } from '../types/geological';
import { sparql, mediaWiki, normalizeWikidataId, type WikidataReadOptions } from './wikidataTransport';
import { WIKIDATA_MEDIAWIKI_API_URL } from '@/lib/wikidataMediaWikiConstants';

const wdLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

/** A single bounded SPARQL response supplies finder children and import counts. */
const MAX_FINDER_CHILDREN_FROM_WIKIDATA = 400;

/**
 * Racines Wikidata pour « période temporelle » (P31 / sous-classes P279*).
 * Exclut les entités P361 qui ne sont pas des intervalles (provinces, villes, etc.).
 * @see https://www.wikidata.org/wiki/Q4005761 geochronological unit
 * @see https://www.wikidata.org/wiki/Q4005689 chronostratigraphic unit
 * @see https://www.wikidata.org/wiki/Q11514315 historical period
 * @see https://www.wikidata.org/wiki/Q15401633 archaeological period
 */
const WIKIDATA_TEMPORAL_PERIOD_ROOT_CLASSES = [
  'Q4005761', // geochronological unit
  'Q4005689', // chronostratigraphic unit
  'Q11514315', // historical period
  'Q15401633', // archaeological period
] as const;

export class WikidataQueryService {
  private static instance: WikidataQueryService;
  private defaultLanguages: string[];

  private constructor() {
    this.defaultLanguages = ['fr', 'en'];
  }

  static getInstance(): WikidataQueryService {
    if (!WikidataQueryService.instance) {
      WikidataQueryService.instance = new WikidataQueryService();
    }
    return WikidataQueryService.instance;
  }

  private buildTemporalQuery(periodId: string): string {
    return `
      SELECT ?item ?itemLabelFr ?itemLabelEn ?itemDescriptionfr ?itemDescriptionen ?startDate ?endDate ?startDateQualifier ?endDateQualifier ?inceptionDate ?replacedByDate ?dissolvedDate WHERE {
        VALUES ?item { wd:${periodId} }

        # Dates directes (P580/P582) - priorité haute
        OPTIONAL { ?item wdt:P580 ?startDate. }
        OPTIONAL { ?item wdt:P582 ?endDate. }

        # Dates via qualificateurs de P31 (instance of) - fallback
        OPTIONAL {
          ?item p:P31 ?statement.
          ?statement ps:P31 ?class.
          OPTIONAL { ?statement pq:P580 ?startDateQualifier. }
          OPTIONAL { ?statement pq:P582 ?endDateQualifier. }
        }

        # Date d'inception (P571) - fallback pour startDate
        OPTIONAL { ?item wdt:P571 ?inceptionDate. }

        # Date de remplacement (P1366 + P585) - fallback pour endDate
        OPTIONAL {
          ?item p:P1366 ?replacedByStatement.
          ?replacedByStatement ps:P1366 ?replacedBy.
          OPTIONAL { ?replacedByStatement pq:P585 ?replacedByDate. }
        }

        # Date de dissolution/abolition (P576) - fallback pour endDate
        OPTIONAL { ?item wdt:P576 ?dissolvedDate. }

        # Labels multilingues
        OPTIONAL { ?item rdfs:label ?itemLabelFr. FILTER(LANG(?itemLabelFr) = "fr") }
        OPTIONAL { ?item rdfs:label ?itemLabelEn. FILTER(LANG(?itemLabelEn) = "en") }

        OPTIONAL {
          ?item schema:description ?itemDescriptionfr.
          FILTER(LANG(?itemDescriptionfr) = "fr")
        }
        OPTIONAL {
          ?item schema:description ?itemDescriptionen.
          FILTER(LANG(?itemDescriptionen) = "en")
        }

        SERVICE wikibase:label {
          bd:serviceParam wikibase:language "fr,en".
          ?item rdfs:label ?itemLabel.
        }
      }
    `;
  }

  /** Filtre P31/P279* : l'entité est une période temporelle reconnue (géologie, histoire, archéo). */
  private buildTemporalPeriodTypeFilter(entityVar: string): string {
    const exists = WIKIDATA_TEMPORAL_PERIOD_ROOT_CLASSES.map(
      q => `EXISTS { ${entityVar} wdt:P31/wdt:P279* wd:${q}. }`
    ).join('\n        || ');
    return `FILTER ( ${exists} )`;
  }

  private buildChildrenQuery(periodId: string): string {
    const childTypeFilter = this.buildTemporalPeriodTypeFilter('?child');
    const grandChildTypeFilter = this.buildTemporalPeriodTypeFilter('?grandChild');
    return `
      SELECT DISTINCT
        ?child ?childLabel
        (MIN(?startDateRaw) AS ?startDate)
        (MAX(?endDateRaw) AS ?endDate)
        (COUNT(DISTINCT ?grandChild) AS ?childCount)
      WHERE {
        ?child wdt:P361 wd:${periodId}.
        ${childTypeFilter}
        OPTIONAL { ?child wdt:P580 ?startDateRaw. }
        OPTIONAL { ?child wdt:P582 ?endDateRaw. }
        SERVICE wikibase:label {
          bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
          ?child rdfs:label ?childLabel.
        }
        OPTIONAL {
          ?grandChild wdt:P361 ?child.
          ${grandChildTypeFilter}
        }
      }
      GROUP BY ?child ?childLabel
      ORDER BY ?child
      LIMIT ${MAX_FINDER_CHILDREN_FROM_WIKIDATA}
    `;
  }

  /**
   * Enfants directs (P361) pour le finder : une seule requête SPARQL (labels dans le résultat).
   * Évite le N+1 temporel : ex. l'Empire romain (~160 enfants) saturait Wikidata (429).
   */
  async loadPeriodChildrenByWikidataId(parentWikidataId: string, options: WikidataReadOptions = {}): Promise<Period[]> {
    return this.fetchFinderChildPeriodSummaries(normalizeWikidataId(parentWikidataId), options);
  }

  private parseListBindingChildLabel(binding: WikidataBinding): { fr: string; en: string } {
    const node = binding.childLabel as { value?: string; 'xml:lang'?: string } | undefined;
    const v = node?.value ?? '';
    const lang = node?.['xml:lang'];
    if (!v) return { fr: '', en: '' };
    if (lang === 'fr') return { fr: v, en: '' };
    if (lang === 'en') return { fr: '', en: v };
    return { fr: v, en: v };
  }

  private async fetchFinderChildPeriodSummaries(parentWikidataId: string, options: WikidataReadOptions): Promise<Period[]> {
    const bindings = await sparql(this.buildChildrenQuery(parentWikidataId), options);

    const byId = new Map<string, Period>();
    for (const binding of bindings) {
      const childId = binding.child?.value.split('/').pop() || '';
      if (!childId) continue;
      const { fr: lFr, en: lEn } = this.parseListBindingChildLabel(binding);
      const hasSub = parseInt(binding.childCount?.value || '0', 10) > 0;
      const existing = byId.get(childId);
      if (!existing) {
        const fr = lFr || lEn || childId;
        const en = lEn || lFr || childId;
        const startDate = binding.startDate?.value ?? '';
        const endDate = binding.endDate?.value ?? 'TODAY';
        byId.set(childId, {
          id: childId,
          label: { fr, en },
          description: { fr: '', en: '' },
          temporalData: [{ startDate, endDate, location: 'Globale' }],
          hasChildren: hasSub,
          children: [],
          childrenPreloaded: false,
        });
      } else {
        if (lFr) existing.label.fr = lFr;
        if (lEn) existing.label.en = lEn;
        if (!existing.label.fr && (lEn || lFr)) existing.label.fr = lFr || lEn;
        if (!existing.label.en && (lFr || lEn)) existing.label.en = lEn || lFr;
        existing.hasChildren = existing.hasChildren || hasSub;
      }
    }

    return Array.from(byId.values()).slice(0, MAX_FINDER_CHILDREN_FROM_WIKIDATA);
  }

  async loadPeriod(periodId: string, options: WikidataReadOptions = {}): Promise<Period & { warnings?: string[] }> {
    periodId = normalizeWikidataId(periodId);
    const query = this.buildTemporalQuery(periodId);
    wdLog('[WikidataQueryService] Requête SPARQL:', query);

    const bindings = await sparql(query, options);
    if (!bindings.length) throw new Error(`Aucune donnée trouvée pour la période ${periodId}`);

    // Extraire les dates des différents bindings
    let startDate = '';
    let endDate = '';
    let itemLabelFr = '';
    let itemLabelEn = '';
    let itemDescriptionFr = '';
    let itemDescriptionEn = '';
    let inceptionDate = '';
    let replacedByDate = '';
    let dissolvedDate = '';

    bindings.forEach(binding => {
      if (binding.itemLabelFr?.value && !itemLabelFr) {
        itemLabelFr = binding.itemLabelFr.value;
      }
      if (binding.itemLabelEn?.value && !itemLabelEn) {
        itemLabelEn = binding.itemLabelEn.value;
      }
      if (binding.itemDescriptionfr?.value && !itemDescriptionFr) {
        itemDescriptionFr = binding.itemDescriptionfr.value;
      }
      if (binding.itemDescriptionen?.value && !itemDescriptionEn) {
        itemDescriptionEn = binding.itemDescriptionen.value;
      }
      if (binding.inceptionDate?.value && !inceptionDate) {
        inceptionDate = binding.inceptionDate.value;
      }
      if (binding.replacedByDate?.value && !replacedByDate) {
        replacedByDate = binding.replacedByDate.value;
      }
      if (binding.dissolvedDate?.value && !dissolvedDate) {
        dissolvedDate = binding.dissolvedDate.value;
      }
      // Pour startDate, priorité aux dates directes (P580), puis qualificateurs, puis inception
      if (binding.startDate?.value) {
        if (!startDate || binding.startDate.value < startDate) {
          startDate = binding.startDate.value;
        }
      }
      if (binding.startDateQualifier?.value && !startDate) {
        if (!startDate || binding.startDateQualifier.value < startDate) {
          startDate = binding.startDateQualifier.value;
        }
      }
      // Pour endDate, priorité aux dates directes (P582), puis qualificateurs
      if (binding.endDate?.value) {
        if (!endDate || binding.endDate.value > endDate) {
          endDate = binding.endDate.value;
        }
      }
      if (binding.endDateQualifier?.value && !endDate) {
        if (!endDate || binding.endDateQualifier.value > endDate) {
          endDate = binding.endDateQualifier.value;
        }
      }
    });

    // Utiliser inceptionDate comme fallback pour startDate si aucune date de début n'est trouvée
    if (!startDate && inceptionDate) {
      startDate = inceptionDate;
    }

    // Utiliser replacedByDate comme fallback pour endDate si aucune date de fin n'est trouvée
    if (!endDate && replacedByDate) {
      endDate = replacedByDate;
    }

    // Utiliser dissolvedDate comme fallback pour endDate si aucune date de fin n'est trouvée
    if (!endDate && dissolvedDate) {
      endDate = dissolvedDate;
    }

    wdLog('[WikidataQueryService] Dates extraites:', { startDate, endDate, inceptionDate, replacedByDate, dissolvedDate, itemLabelFr, itemLabelEn, itemDescriptionFr, itemDescriptionEn });

    // Créer la période avec les données extraites
    const period: Period = {
      id: periodId,
      label: {
        fr: itemLabelFr,
        en: itemLabelEn
      },
      description: {
        fr: itemDescriptionFr,
        en: itemDescriptionEn
      },
      temporalData: [{
        startDate: startDate,
        endDate: endDate || 'TODAY',
        location: "Globale"
      }],
      hasChildren: false,
      children: [],
      childrenPreloaded: false,
    };

    wdLog('[WikidataQueryService] Période créée:', period);

    let children: Period[] = [];
    let warnings: string[] | undefined;
    try { children = await this.loadPeriodChildrenByWikidataId(periodId, options); }
    catch (error) {
      if (options.signal?.aborted) throw error;
      warnings = ['Les sous-périodes Wikidata n’ont pas pu être chargées. Leur nombre reste indéterminé.'];
    }

    if (children.length >= MAX_FINDER_CHILDREN_FROM_WIKIDATA) {
      warnings = ['La liste des sous-périodes Wikidata est limitée ; leur nombre exact reste indéterminé.'];
    }
    // Return successful primary data even when the optional child count is unavailable.
    const result = {
      ...period,
      children,
      hasChildren: children.length > 0,
      childrenPreloaded: !warnings,
      ...(warnings ? { warnings } : {})
    };

    wdLog('[WikidataQueryService] Résultat final:', result);
    return result;
  }


  /**
   * Récupère les Q-ids des classes P31 (instance of) et P279 (subclass of)
   * directes d'une entité Wikidata — utilisé pour suggérer des catégories.
   */
  async getEntityClasses(qid: string, options: WikidataReadOptions = {}): Promise<string[]> {
    qid = normalizeWikidataId(qid);
    const query = `
      SELECT DISTINCT ?class WHERE {
        VALUES ?item { wd:${qid} }
        ?item wdt:P31/wdt:P279? ?class.
      }
      LIMIT 50
    `;
    return (await sparql(query, options)).map(b => b.class?.value?.split('/').pop() ?? '').filter(Boolean);
  }

  // Charger un événement depuis Wikidata par Q-id
  async loadEvent(eventId: string, options: WikidataReadOptions = {}): Promise<{ label: string | { fr?: string; en?: string }, description?: { fr: string, en: string }, date?: string }> {
    eventId = normalizeWikidataId(eventId);
    const query = `
      SELECT DISTINCT
        ?item ?itemLabel
        ?descriptionfr
        ?descriptionen
        ?startDate
        ?endDate
        ?pointInTime
        ?birthDate
        ?earliestDate
        ?inceptionDate
        ?officialOpening
        ?historicalEvent
      WHERE {
        VALUES ?item { wd:${eventId} }

        SERVICE wikibase:label {
          bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
          ?item rdfs:label ?itemLabel.
        }

        OPTIONAL {
          ?item schema:description ?descriptionfr.
          FILTER(LANG(?descriptionfr) = "fr")
        }
        OPTIONAL {
          ?item schema:description ?descriptionen.
          FILTER(LANG(?descriptionen) = "en")
        }

        # Dates principales (bâtiments / monuments : P571, P1619 souvent plus pertinents que P580)
        OPTIONAL { ?item wdt:P580 ?startDate. }    # Date de début
        OPTIONAL { ?item wdt:P582 ?endDate. }      # Date de fin
        OPTIONAL { ?item wdt:P585 ?pointInTime. }  # Point dans le temps
        OPTIONAL { ?item wdt:P569 ?birthDate. }    # Date de naissance
        OPTIONAL { ?item wdt:P1319 ?earliestDate. } # Date la plus ancienne
        OPTIONAL { ?item wdt:P571 ?inceptionDate. } # Date de création / construction
        OPTIONAL { ?item wdt:P1619 ?officialOpening. } # Date d'ouverture officielle
        OPTIONAL { ?item wdt:P837 ?historicalEvent. }
      }
    `;

    const bindings = await sparql(query, options);
    if (!bindings.length) throw new Error(`Aucune donnée trouvée pour l’événement ${eventId}`);
    const binding = bindings[0];
    wdLog('[WikidataQueryService] Binding événement Wikidata:', binding);

    // Ordre de priorité : instant ponctuel → ouverture / création → autres
    let eventDate = '';
    if (binding.pointInTime?.value) {
      eventDate = binding.pointInTime.value;
    } else if (binding.officialOpening?.value) {
      eventDate = binding.officialOpening.value;
    } else if (binding.inceptionDate?.value) {
      eventDate = binding.inceptionDate.value;
    } else if (binding.startDate?.value) {
      eventDate = binding.startDate.value;
    } else if (binding.endDate?.value) {
      eventDate = binding.endDate.value;
    } else if (binding.birthDate?.value) {
      eventDate = binding.birthDate.value;
    } else if (binding.earliestDate?.value) {
      eventDate = binding.earliestDate.value;
    }

    return {
      label: binding.itemLabel?.value || '',
      description: {
        fr: binding['descriptionfr']?.value || binding['descriptionFr']?.value || '',
        en: binding['descriptionen']?.value || binding['descriptionEn']?.value || ''
      },
      date: eventDate
    };
  }


  /**
   * Q-id de la première valeur P361 « partie de » sur l'entité (parent hiérarchique fréquent pour les périodes).
   */
  async getPartOfParentQid(entityQid: string, options: WikidataReadOptions = {}): Promise<string | null> {
    const id = normalizeWikidataId(entityQid);
    const params = new URLSearchParams({ action: 'wbgetentities', ids: id, props: 'claims', languages: 'fr', format: 'json', origin: '*' });
    const data = await mediaWiki(`${WIKIDATA_MEDIAWIKI_API_URL}?${params}`, options);
    const entity = data.entities![id];
    const value = entity?.claims?.P361?.[0]?.mainsnak?.datavalue?.value;
    return value && typeof value === 'object' && 'id' in value && typeof value.id === 'string' && /^Q[1-9]\d*$/i.test(value.id) ? value.id.toUpperCase() : null;
  }
}
