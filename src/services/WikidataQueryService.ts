import axios from 'axios';
import type { Period, WikidataResponse, WikidataBinding, TemporalLocation } from '../types/geological';
import { MAIN_EONS } from '../types/geological';
import { retryAsyncOperation } from '@/lib/retryAsyncOperation';
function getWikidataSparqlUrl(): string {
  const custom =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_WIKIDATA_SPARQL_URL;
  if (typeof custom === 'string' && custom.trim()) return custom.trim();
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) return '/api/wikidata/sparql';
  return 'https://query.wikidata.org/sparql';
}

const REQUEST_TIMEOUT = 30000; // 30 secondes
/** Limite d’enfants renvoyés pour le finder (évite réponses énormes). */
const MAX_FINDER_CHILDREN_FROM_WIKIDATA = 400;
/** Requêtes temporelles en parallèle pour loadPeriod (évite 429 Wikidata). */
const CHILD_TEMPORAL_FETCH_CONCURRENCY = 5;

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
      SELECT ?item ?itemLabelFr ?itemLabelEn ?itemDescriptionfr ?itemDescriptionen ?startDate ?endDate ?inceptionDate ?replacedByDate ?dissolvedDate WHERE {
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

  /** Filtre P31/P279* : l’entité est une période temporelle reconnue (géologie, histoire, archéo). */
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
    `;
  }

  private transformToPeriod(binding: WikidataBinding): Period | null {
    console.log('[WikidataQueryService] Transformation du binding:', binding);
    
    if (!binding.item?.value) {
      console.log('[WikidataQueryService] Pas de valeur item dans le binding');
      return null;
    }

    const periodId = binding.item.value.split('/').pop() || '';
    const locations = new Set<string>();

    // Debug des dates
    console.log('[WikidataQueryService] Debug des dates:');
    console.log('  - startDate:', binding.startDate?.value);
    console.log('  - endDate:', binding.endDate?.value);
    console.log('  - startDate type:', typeof binding.startDate?.value);
    console.log('  - startDate length:', binding.startDate?.value?.length);
    console.log('  - startDate trimmed:', binding.startDate?.value?.trim());
    console.log('  - endDate type:', typeof binding.endDate?.value);
    console.log('  - endDate length:', binding.endDate?.value?.length);
    console.log('  - endDate trimmed:', binding.endDate?.value?.trim());

    // Créer les données temporelles avec les dates disponibles
    const temporalData: TemporalLocation[] = [{
      startDate: (binding.startDate?.value && binding.startDate.value.trim() !== '') ? binding.startDate.value : '',
      endDate: (binding.endDate?.value && binding.endDate.value.trim() !== '') ? binding.endDate.value : 'TODAY',
      location: "Globale"
    }];

    console.log('[WikidataQueryService] Date de fin finale:', temporalData[0].endDate);

    // Gestion des labels et descriptions
    const label = {
      fr: binding.itemLabelFr?.value || '',
      en: binding.itemLabelEn?.value || ''
    };
    const description = {
      fr: binding.itemDescriptionfr?.value || '',
      en: binding.itemDescriptionen?.value || ''
    };

    console.log('[WikidataQueryService] Données extraites:', {
      periodId,
      label,
      description,
      temporalData,
      locations: Array.from(locations)
    });

    if (!label.fr && !label.en) {
      console.log('[WikidataQueryService] Pas de label trouvé');
      return null;
    }

    // Créer la période avec les données de base
    const period: Period = {
      id: periodId,
      label,
      description,
      temporalData,
      hasChildren: false,
      isMainEon: this.isMainEon(periodId),
      categoryIds: [],
      categoryLabels: [],
      children: [],
      loading: false,
      childrenPreloaded: false,
      locations: Array.from(locations),
      directLocations: Array.from(locations)
    };

    return period;
  }

  private isMainEon(id: string): boolean {
    return Object.values(MAIN_EONS).includes(id as any);
  }

  /**
   * Enfants directs (P361) pour le finder : une seule requête SPARQL (labels dans le résultat).
   * Évite le N+1 temporel : ex. l’Empire romain (~160 enfants) saturait Wikidata (429).
   */
  async loadPeriodChildrenByWikidataId(parentWikidataId: string): Promise<Period[]> {
    return retryAsyncOperation(() => this.fetchFinderChildPeriodSummaries(parentWikidataId));
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

  private async fetchFinderChildPeriodSummaries(parentWikidataId: string): Promise<Period[]> {
    const childrenResponse = await axios.get<WikidataResponse>(getWikidataSparqlUrl(), {
      params: { query: this.buildChildrenQuery(parentWikidataId), format: 'json' },
      timeout: REQUEST_TIMEOUT,
      headers: { 'Accept': 'application/sparql-results+json' }
    });

    console.log('[WikidataQueryService] Réponse enfants brute (finder):', childrenResponse.data);

    const bindings = childrenResponse.data?.results?.bindings ?? [];

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
          isMainEon: this.isMainEon(childId),
          categoryIds: [],
          categoryLabels: [],
          children: [],
          loading: false,
          childrenPreloaded: false,
          locations: [],
          directLocations: []
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

  /** Enfants avec dates détaillées — utilisé par loadPeriod ; requêtes temporelles par paquets. */
  private async fetchChildPeriodsForWikidataParent(parentWikidataId: string): Promise<Period[]> {
    const childrenResponse = await axios.get<WikidataResponse>(getWikidataSparqlUrl(), {
      params: { query: this.buildChildrenQuery(parentWikidataId), format: 'json' },
      timeout: REQUEST_TIMEOUT,
      headers: { 'Accept': 'application/sparql-results+json' }
    });

    console.log('[WikidataQueryService] Réponse enfants brute:', childrenResponse.data);

    const bindings = childrenResponse.data?.results?.bindings ?? [];
    const out: Period[] = [];
    for (let i = 0; i < bindings.length; i += CHILD_TEMPORAL_FETCH_CONCURRENCY) {
      const slice = bindings.slice(i, i + CHILD_TEMPORAL_FETCH_CONCURRENCY);
      const chunk = await Promise.all(
        slice.map((b: WikidataBinding) => this.mapBindingToFullChildPeriod(b))
      );
      for (const c of chunk) {
        if (c && c.id.length > 0) out.push(c);
      }
    }
    return out;
  }

  private async mapBindingToFullChildPeriod(binding: WikidataBinding): Promise<Period | null> {
    const childId = binding.child?.value.split('/').pop() || '';
    if (!childId) return null;

    const childTemporalResponse = await axios.get<WikidataResponse>(getWikidataSparqlUrl(), {
      params: { query: this.buildTemporalQuery(childId), format: 'json' },
      timeout: REQUEST_TIMEOUT,
      headers: { 'Accept': 'application/sparql-results+json' }
    });

    let childStartDate = '';
    let childEndDate = '';
    let childLabelFr = '';
    let childLabelEn = '';
    let childDescriptionFr = '';
    let childDescriptionEn = '';
    let childInceptionDate = '';
    let childReplacedByDate = '';
    let childDissolvedDate = '';

    const childBindings = childTemporalResponse.data?.results?.bindings ?? [];
    childBindings.forEach(childBinding => {
      if (childBinding.itemLabelFr?.value && !childLabelFr) {
        childLabelFr = childBinding.itemLabelFr.value;
      }
      if (childBinding.itemLabelEn?.value && !childLabelEn) {
        childLabelEn = childBinding.itemLabelEn.value;
      }
      if (childBinding.itemDescriptionfr?.value && !childDescriptionFr) {
        childDescriptionFr = childBinding.itemDescriptionfr.value;
      }
      if (childBinding.itemDescriptionen?.value && !childDescriptionEn) {
        childDescriptionEn = childBinding.itemDescriptionen.value;
      }
      if (childBinding.inceptionDate?.value && !childInceptionDate) {
        childInceptionDate = childBinding.inceptionDate.value;
      }
      if (childBinding.replacedByDate?.value && !childReplacedByDate) {
        childReplacedByDate = childBinding.replacedByDate.value;
      }
      if (childBinding.dissolvedDate?.value && !childDissolvedDate) {
        childDissolvedDate = childBinding.dissolvedDate.value;
      }
      if (childBinding.startDate?.value) {
        if (!childStartDate || childBinding.startDate.value < childStartDate) {
          childStartDate = childBinding.startDate.value;
        }
      }
      if (childBinding.startDateQualifier?.value && !childStartDate) {
        if (!childStartDate || childBinding.startDateQualifier.value < childStartDate) {
          childStartDate = childBinding.startDateQualifier.value;
        }
      }
      if (childBinding.endDate?.value) {
        if (!childEndDate || childBinding.endDate.value > childEndDate) {
          childEndDate = childBinding.endDate.value;
        }
      }
      if (childBinding.endDateQualifier?.value && !childEndDate) {
        if (!childEndDate || childBinding.endDateQualifier.value > childEndDate) {
          childEndDate = childBinding.endDateQualifier.value;
        }
      }
    });

    if (!childStartDate && childInceptionDate) {
      childStartDate = childInceptionDate;
    }
    if (!childEndDate && childReplacedByDate) {
      childEndDate = childReplacedByDate;
    }
    if (!childEndDate && childDissolvedDate) {
      childEndDate = childDissolvedDate;
    }

    return {
      id: childId,
      label: {
        fr: childLabelFr,
        en: childLabelEn
      },
      description: {
        fr: childDescriptionFr,
        en: childDescriptionEn
      },
      temporalData: [{
        startDate: childStartDate,
        endDate: childEndDate || 'TODAY',
        location: "Globale"
      }],
      hasChildren: parseInt(binding.childCount?.value || '0', 10) > 0,
      isMainEon: this.isMainEon(childId),
      categoryIds: [],
      categoryLabels: [],
      children: [],
      loading: false,
      childrenPreloaded: false,
      locations: [],
      directLocations: []
    };
  }

  async loadPeriod(periodId: string): Promise<Period> {
    return retryAsyncOperation(async () => {
      try {
        const query = this.buildTemporalQuery(periodId);
        console.log('[WikidataQueryService] Requête SPARQL:', query);

        const temporalResponse = await axios.get<WikidataResponse>(getWikidataSparqlUrl(), {
          params: { query, format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        console.log('[WikidataQueryService] Réponse Wikidata brute:', temporalResponse.data);

        if (!temporalResponse.data?.results?.bindings?.length) {
          throw new Error(`Aucune donnée trouvée pour la période ${periodId}`);
        }

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
        
        temporalResponse.data.results.bindings.forEach(binding => {
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

        console.log('[WikidataQueryService] Dates extraites:', { startDate, endDate, inceptionDate, replacedByDate, dissolvedDate, itemLabelFr, itemLabelEn, itemDescriptionFr, itemDescriptionEn });

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
          isMainEon: this.isMainEon(periodId),
          categoryIds: [],
          categoryLabels: [],
          children: [],
          loading: false,
          childrenPreloaded: false,
          locations: [],
          directLocations: []
        };

        console.log('[WikidataQueryService] Période créée:', period);

        const children = await this.fetchChildPeriodsForWikidataParent(periodId);

        // 6. Retourner la période avec ses enfants
        const result = {
          ...period,
          children,
          childrenPreloaded: true
        };

        console.log('[WikidataQueryService] Résultat final:', result);
        return result;
      } catch (error) {
        console.error(`[Debug] Erreur lors du chargement de la période ${periodId}:`, error);
        throw error;
      }
    });
  }

  private buildStoryQuery(storyId: string): string {
    return `
      SELECT DISTINCT 
        ?item ?itemLabel 
        ?startDate ?endDate 
        ?startLocationLabel ?endLocationLabel
        (COUNT(DISTINCT ?child) AS ?childCount)
      WHERE {
        VALUES ?item { wd:${storyId} }
        
        # Filtrage : au moins une date doit exister
        {
          ?item p:P580 ?startStatement.
          ?startStatement ps:P580 ?startDate.
        } UNION {
          ?item p:P582 ?endStatement.
          ?endStatement ps:P582 ?endDate.
        }
        
        # Labels
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
          ?item rdfs:label ?itemLabel.
        }

        # Start time avec localisations
        OPTIONAL {
          ?item p:P580 ?startStatement.
          ?startStatement ps:P580 ?startDate.
          OPTIONAL {
            ?startStatement pq:P518 ?startLocation.
            SERVICE wikibase:label { 
              bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
              ?startLocation rdfs:label ?startLocationLabel.
            }
          }
        }

        # End time avec localisations
        OPTIONAL {
          ?item p:P582 ?endStatement.
          ?endStatement ps:P582 ?endDate.
          OPTIONAL {
            ?endStatement pq:P518 ?endLocation.
            SERVICE wikibase:label { 
              bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
              ?endLocation rdfs:label ?endLocationLabel.
            }
          }
        }

        # Enfants (éons principaux)
        VALUES ?child {
          wd:${MAIN_EONS.PHANEROZOIC}
          wd:${MAIN_EONS.PROTEROZOIC}
          wd:${MAIN_EONS.ARCHEAN}
          wd:${MAIN_EONS.HADEAN}
        }
        ?child wdt:P361 ?item.
      }
      GROUP BY ?item ?itemLabel ?startDate ?endDate ?startLocationLabel ?endLocationLabel
      ORDER BY ?startDate
    `;
  }

  async loadStory(storyId: string): Promise<Period> {
    return retryAsyncOperation(async () => {
      try {
        const storyResponse = await axios.get<WikidataResponse>(getWikidataSparqlUrl(), {
          params: { query: this.buildStoryQuery(storyId), format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        if (!storyResponse.data?.results?.bindings?.length) {
          throw new Error(`Aucune donnée trouvée pour la story ${storyId}`);
        }

        // Transformation de la story
        const story = this.transformToPeriod(storyResponse.data.results.bindings[0]);
        if (!story) {
          throw new Error(`Story invalide pour ${storyId}`);
        }

        // Charger les éons principaux
        const mainEons = await Promise.all([
          this.loadPeriod(MAIN_EONS.PHANEROZOIC),
          this.loadPeriod(MAIN_EONS.PROTEROZOIC),
          this.loadPeriod(MAIN_EONS.ARCHEAN),
          this.loadPeriod(MAIN_EONS.HADEAN)
        ]);

        return {
          ...story,
          children: mainEons,
          childrenPreloaded: true
        };
      } catch (error) {
        console.error(`[Debug] Erreur lors du chargement de la story ${storyId}:`, error);
        throw error;
      }
    });
  }

  /**
   * Récupère les Q-ids des classes P31 (instance of) et P279 (subclass of)
   * directes d'une entité Wikidata — utilisé pour suggérer des catégories.
   */
  async getEntityClasses(qid: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT ?class WHERE {
        VALUES ?item { wd:${qid} }
        ?item wdt:P31/wdt:P279? ?class.
      }
      LIMIT 50
    `;
    try {
      const response = await axios.get<WikidataResponse>(getWikidataSparqlUrl(), {
        params: { query, format: 'json' },
        timeout: 15000,
        headers: { 'Accept': 'application/sparql-results+json' },
      });
      return (response.data?.results?.bindings ?? [])
        .map(b => b.class?.value?.split('/').pop() ?? '')
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  // Charger un événement depuis Wikidata par Q-id
  async loadEvent(eventId: string): Promise<{ label: string | { fr?: string; en?: string }, description?: { fr: string, en: string }, date?: string }> {
    return retryAsyncOperation(async () => {
      try {
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

        const response = await axios.get<WikidataResponse>(getWikidataSparqlUrl(), {
          params: { query, format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        if (!response.data?.results?.bindings?.length) {
          throw new Error(`Aucune donnée trouvée pour l'événement ${eventId}`);
        }

        const binding = response.data.results.bindings[0];
        console.log('[WikidataQueryService] Binding événement Wikidata:', binding);
        
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
      } catch (error) {
        console.error('Erreur lors du chargement de l\'événement:', error);
        throw error;
      }
    });
  }
} 