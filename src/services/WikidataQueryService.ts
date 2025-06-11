import axios from 'axios';
import type { Period, WikidataResponse, WikidataBinding, TemporalLocation } from '../types/geological';
import { MAIN_EONS } from '../types/geological';
import { DateFormatter } from '../utils/dateFormatter';

const WIKIDATA_API_URL = '/api/wikidata/sparql';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 seconde
const REQUEST_TIMEOUT = 30000; // 30 secondes

export class WikidataQueryService {
  private static instance: WikidataQueryService;
  private defaultLanguages: string[];
  private dateFormatter: DateFormatter;

  private constructor() {
    this.defaultLanguages = ['fr', 'en'];
    this.dateFormatter = new DateFormatter();
  }

  static getInstance(): WikidataQueryService {
    if (!WikidataQueryService.instance) {
      WikidataQueryService.instance = new WikidataQueryService();
    }
    return WikidataQueryService.instance;
  }

  private buildTemporalQuery(periodId: string): string {
    return `
      SELECT DISTINCT 
        ?item ?itemLabel 
        ?startDate ?endDate 
        ?startLocationLabel ?endLocationLabel
        (COUNT(DISTINCT ?child) AS ?childCount)
      WHERE {
        VALUES ?item { wd:${periodId} }
        
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

        # Enfants
        OPTIONAL {
          ?child wdt:P361 ?item.
        }
      }
      GROUP BY ?item ?itemLabel ?startDate ?endDate ?startLocationLabel ?endLocationLabel
      ORDER BY ?startDate
    `;
  }

  private buildChildrenQuery(periodId: string): string {
    return `
      SELECT DISTINCT 
        ?child ?childLabel
        (COUNT(DISTINCT ?grandChild) AS ?childCount)
      WHERE {
        ?child wdt:P361 wd:${periodId}.
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
          ?child rdfs:label ?childLabel.
        }
        OPTIONAL {
          ?grandChild wdt:P361 ?child.
        }
      }
      GROUP BY ?child ?childLabel
    `;
  }

  private isValidPeriod(binding: WikidataBinding): boolean {
    // Vérification de la présence d'au moins une date
    const hasStartDate = !!binding.startDate?.value;
    const hasEndDate = !!binding.endDate?.value;
    
    if (!hasStartDate && !hasEndDate) {
      return false;
    }

    // Vérification du label
    if (!binding.itemLabel?.value) {
      return false;
    }

    return true;
  }

  private transformToPeriod(binding: WikidataBinding): Period | null {
    // Validation des données
    if (!this.isValidPeriod(binding)) {
      return null;
    }

    const periodId = binding.item?.value.split('/').pop() || '';
    const startLocation = binding.startLocationLabel?.value || "Globale";
    const endLocation = binding.endLocationLabel?.value || "Globale";
    const locations = new Set([startLocation, endLocation]);

    // Créer un objet TemporalLocation pour chaque combinaison de dates et localisations
    const temporalData: TemporalLocation[] = [];
    
    // Si les localisations sont identiques, créer un seul objet avec les deux dates
    if (startLocation === endLocation) {
      temporalData.push({
        startDate: binding.startDate?.value,
        endDate: binding.endDate?.value,
        location: startLocation
      });
    } else {
      // Sinon, créer des objets séparés pour chaque localisation
      if (binding.startDate?.value) {
        temporalData.push({
          startDate: binding.startDate.value,
          location: startLocation
        });
      }
      
      if (binding.endDate?.value) {
        temporalData.push({
          endDate: binding.endDate.value,
          location: endLocation
        });
      }
    }

    return {
      id: periodId,
      label: binding.itemLabel?.value || '',
      temporalData,
      hasChildren: parseInt(binding.childCount?.value || '0') > 0,
      isMainEon: this.isMainEon(periodId),
      categoryIds: [],
      categoryLabels: [],
      children: [],
      loading: false,
      childrenPreloaded: false,
      locations: Array.from(locations),
      directLocations: Array.from(locations)
    };
  }

  private transformChildToPeriod(binding: WikidataBinding): Period {
    const periodId = binding.child?.value.split('/').pop() || '';
    
    return {
      id: periodId,
      label: binding.childLabel?.value || '',
      temporalData: [],
      hasChildren: parseInt(binding.childCount?.value || '0') > 0,
      isMainEon: this.isMainEon(periodId),
      categoryIds: [],
      categoryLabels: [],
      children: [],
      loading: false,
      childrenPreloaded: false,
      locations: [],
      directLocations: []
    };
  }

  private isMainEon(id: string): boolean {
    return Object.values(MAIN_EONS).includes(id as any);
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }
    
    throw lastError;
  }

  async loadPeriod(periodId: string): Promise<Period> {
    return this.retryOperation(async () => {
      try {
        const temporalResponse = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { query: this.buildTemporalQuery(periodId), format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        if (!temporalResponse.data?.results?.bindings?.length) {
          throw new Error(`Aucune donnée trouvée pour la période ${periodId}`);
        }

        // Transformation et filtrage des périodes
        const periods = temporalResponse.data.results.bindings
          .map(binding => this.transformToPeriod(binding))
          .filter((period): period is Period => period !== null);

        if (periods.length === 0) {
          throw new Error(`Aucune période valide trouvée pour ${periodId}`);
        }

        // 2. Regrouper les périodes par localisation
        const groupedPeriods = this.groupPeriodsByLocation(periods);

        // 4. Charger les enfants
        const childrenResponse = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { query: this.buildChildrenQuery(periodId), format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        // 5. Charger les données temporelles pour chaque enfant
        const childrenPromises = childrenResponse.data.results.bindings.map(async binding => {
          const childId = binding.child?.value.split('/').pop() || '';
          
          // Charger les données temporelles de l'enfant
          const childTemporalResponse = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
            params: { query: this.buildTemporalQuery(childId), format: 'json' },
            timeout: REQUEST_TIMEOUT,
            headers: { 'Accept': 'application/sparql-results+json' }
          });

          // Transformer les données de l'enfant
          const childPeriods = childTemporalResponse.data.results.bindings
            .map(binding => this.transformToPeriod(binding))
            .filter((period): period is Period => period !== null);

          // Regrouper les périodes de l'enfant par localisation
          const groupedChildPeriods = this.groupPeriodsByLocation(childPeriods);

          return groupedChildPeriods.map(period => ({
            ...period,
            hasChildren: parseInt(binding.childCount?.value || '0') > 0,
            children: [],
            loading: false,
            childrenPreloaded: false
          }));
        });

        const childrenArrays = await Promise.all(childrenPromises);
        const children = childrenArrays.flat();

        // 6. Retourner la période avec ses enfants
        return {
          ...groupedPeriods[0],
          children,
          childrenPreloaded: true
        };
      } catch (error) {
        console.error(`[Debug] Erreur lors du chargement de la période ${periodId}:`, error);
        throw error;
      }
    });
  }

  private groupPeriodsByLocation(periods: Period[]): Period[] {
    const locationGroups = new Map<string, Period>();

    periods.forEach(period => {
      period.temporalData.forEach(temporal => {
        const location = temporal.location;
        if (!locationGroups.has(location)) {
          locationGroups.set(location, {
            ...period,
            temporalData: [],
            locations: [location],
            directLocations: [location]
          });
        }
        const groupedPeriod = locationGroups.get(location)!;
        groupedPeriod.temporalData.push(temporal);
      });
    });

    return Array.from(locationGroups.values());
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
    return this.retryOperation(async () => {
      try {
        const storyResponse = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
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

  // Charger un événement depuis Wikidata par Q-id
  async loadEvent(eventId: string): Promise<{ label: string, description?: string, date?: string }> {
    try {
      const query = `
        SELECT ?item ?itemLabel ?description ?pointInTime WHERE {
          VALUES ?item { wd:${eventId} }
          OPTIONAL { ?item rdfs:label ?itemLabel. FILTER(LANG(?itemLabel) = 'fr') }
          OPTIONAL { ?item schema:description ?description. FILTER(LANG(?description) = 'fr') }
          OPTIONAL { ?item p:P585 ?statement. ?statement ps:P585 ?pointInTime. }
        } LIMIT 1
      `;
      const response = await axios.get('/api/wikidata/sparql', {
        params: { query, format: 'json' },
        timeout: 10000,
        headers: { 'Accept': 'application/sparql-results+json' }
      });
      const bindings = response.data?.results?.bindings;
      if (!bindings || !bindings.length) throw new Error('Aucune donnée trouvée pour cet événement');
      const b = bindings[0];
      return {
        label: b.itemLabel?.value || '',
        description: b.description?.value || '',
        date: b.pointInTime?.value || ''
      };
    } catch (error) {
      throw error;
    }
  }
} 