import axios, { AxiosError } from 'axios';
import type { Period, SimplePeriod, QueryOptions, CacheEntry, WikidataResponse } from '../types/geological';
import { MAIN_EONS, PERIOD_CATEGORIES } from '../types/geological';
import { DateFormatter } from '../utils/dateFormatter';

const WIKIDATA_API_URL = '/api/wikidata/sparql';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 seconde
const REQUEST_TIMEOUT = 30000; // 30 secondes
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class WikidataError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'WikidataError';
  }
}

export class WikidataTimelineService {
  private static instance: WikidataTimelineService;
  private cache: Map<string, CacheEntry> = new Map();
  private defaultLanguage = 'fr';

  private constructor() {}

  static getInstance(): WikidataTimelineService {
    if (!WikidataTimelineService.instance) {
      WikidataTimelineService.instance = new WikidataTimelineService();
    }
    return WikidataTimelineService.instance;
  }

  private getCacheKey(options: QueryOptions): string {
    return `${options.language}-${options.parentId || 'root'}-${options.categoryId || 'all'}`;
  }

  private getFromCache(key: string): Period[] | SimplePeriod[] | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
      return entry.data;
    }
    return null;
  }

  private setCache(key: string, data: Period[] | SimplePeriod[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    retries = MAX_RETRIES
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.retryOperation(operation, retries - 1);
      }
      throw this.handleError(error);
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return (
        error.response?.status === 503 ||
        error.response?.status === 429 ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT'
      );
    }
    return false;
  }

  private handleError(error: unknown): WikidataError {
    if (error instanceof AxiosError) {
      if (error.response?.status === 400) {
        return new WikidataError(
          'Requête mal formée. Vérifiez les paramètres de la requête SPARQL.',
          'INVALID_REQUEST',
          error
        );
      }
      if (error.response?.status === 429) {
        return new WikidataError(
          'Trop de requêtes. Veuillez réessayer plus tard.',
          'RATE_LIMIT',
          error
        );
      }
      if (error.response?.status === 503) {
        return new WikidataError(
          'Service temporairement indisponible.',
          'SERVICE_UNAVAILABLE',
          error
        );
      }
      if (error.response?.status === 404) {
        return new WikidataError(
          'Endpoint Wikidata non trouvé. Vérifiez la configuration du proxy.',
          'ENDPOINT_NOT_FOUND',
          error
        );
      }
      return new WikidataError(
        `Erreur lors de la communication avec Wikidata (${error.response?.status || 'unknown'}).`,
        'API_ERROR',
        error
      );
    }
    return new WikidataError(
      'Une erreur inattendue est survenue.',
      'UNKNOWN_ERROR',
      error instanceof Error ? error : undefined
    );
  }

  private buildQuery(options: QueryOptions = {}): string {
    const { language = this.defaultLanguage, parentId } = options;
    
    // Définition des éons principaux
    const mainEons = [
      MAIN_EONS.HADEAN,
      MAIN_EONS.ARCHEAN,
      MAIN_EONS.PROTEROZOIC,
      MAIN_EONS.PHANEROZOIC
    ];

    // Construction du filtre parent
    const parentFilter = parentId 
      ? `{ ?item wdt:P361 wd:${parentId} }`
      : `VALUES ?item { wd:${mainEons.join(' wd:')} }`;

    // Cascade de langues pour les labels
    const labelLanguages = ['fr', 'en', 'es', 'de'];
    const labelCascade = labelLanguages
      .map(lang => `OPTIONAL { ?item rdfs:label ?label_${lang} . FILTER(LANG(?label_${lang}) = "${lang}") }`)
      .join('\n');

    // Sélection du label avec COALESCE
    const labelSelection = `COALESCE(${labelLanguages.map(lang => `?label_${lang}`).join(', ')}, ?itemLabel)`;

    return `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX p: <http://www.wikidata.org/prop/>
      PREFIX pq: <http://www.wikidata.org/prop/qualifier/>
      PREFIX ps: <http://www.wikidata.org/prop/statement/>
      
      SELECT DISTINCT ?item ${labelSelection} AS ?label ?startDate ?endDate ?location ?childCount
      WHERE {
        ${parentFilter}
        
        # Vérification que c'est une période
        ?item wdt:P31/wdt:P279* wd:Q186081 .
        
        # Cascade de langues pour les labels
        ${labelCascade}
        
        # Dates avec COALESCE
        OPTIONAL {
          {
            { ?item wdt:P580 ?startDate }
            UNION { ?item wdt:P569 ?startDate }
            UNION { ?item wdt:P571 ?startDate }
          }
        }
        
        OPTIONAL {
          {
            { ?item wdt:P582 ?endDate }
            UNION { ?item wdt:P570 ?endDate }
          }
        }
        
        # Localisations avec parties
        OPTIONAL {
          {
            { ?item wdt:P276 ?location }
            UNION { 
              ?item p:P276 ?locationStatement .
              ?locationStatement ps:P276 ?location .
              OPTIONAL { ?locationStatement pq:P518 ?part }
            }
          }
        }
        
        # Comptage des enfants
        OPTIONAL {
          SELECT ?item (COUNT(DISTINCT ?child) AS ?childCount)
          WHERE {
            { ?child wdt:P361 ?item }
            UNION { ?item wdt:P527 ?child }
          }
          GROUP BY ?item
        }
        
        # Filtre pour s'assurer qu'il y a au moins une date
        FILTER(BOUND(?startDate) || BOUND(?endDate))
      }
      ORDER BY ?startDate
      LIMIT 100
    `;
  }

  private transformResponse(bindings: any[]): SimplePeriod[] {
    return bindings.map(binding => {
      const id = binding.item.value.split('/').pop() || '';
      const label = binding.itemLabel.value || id;
      const startDate = binding.startDate?.value;
      const endDate = binding.endDate?.value;
      const location = binding.location?.value;
      const childCount = parseInt(binding.childCount?.value || '0', 10);
      const hasChildren = childCount > 0;
      const isMainEon = Object.values(MAIN_EONS).includes(id);

      // Validation des dates
      const formattedStartDate = startDate ? DateFormatter.formatDate(startDate) : undefined;
      const formattedEndDate = endDate ? DateFormatter.formatDate(endDate) : undefined;

      // Validation de la localisation
      const formattedLocation = location ? this.formatLocation(location) : undefined;

      return {
        id,
        label,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        location: formattedLocation,
        hasChildren,
        isMainEon,
        categoryIds: [] // Maintenant vide car nous ne gérons plus les catégories
      };
    });
  }

  private formatLocation(locationUri: string): string {
    // Extraction de l'ID de la localisation
    const locationId = locationUri.split('/').pop();
    if (!locationId) return '';

    // Vérification du cache pour la localisation
    const cacheKey = `location_${locationId}`;
    const cachedLocation = this.getFromCache(cacheKey);
    if (cachedLocation) {
      return cachedLocation as string;
    }

    // Si pas en cache, on utilise l'ID comme fallback
    const locationLabel = locationId;
    this.setCache(cacheKey, locationLabel);
    return locationLabel;
  }

  async getMainEons(options: QueryOptions = {}): Promise<Period[]> {
    const { language = this.defaultLanguage } = options;
    const cacheKey = this.getCacheKey({ language });
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData as Period[];
    }

    return this.retryOperation(async () => {
      const query = this.buildQuery(options);
      
      try {
        const response = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { query, format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        const simplePeriods = this.transformResponse(response.data.results.bindings);
        const periods: Period[] = simplePeriods.map(period => ({
          ...period,
          categoryLabels: period.categoryIds,
          childrenPreloaded: false,
          children: [],
          loading: false
        }));

        this.setCache(cacheKey, periods);
        return periods;
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }

  private async checkHasChildren(childId: string): Promise<boolean> {
    const query = `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      
      ASK {
        {
          { ?grandchild wdt:P361 wd:${childId} }
          UNION { wd:${childId} wdt:P527 ?grandchild }
        }
        FILTER(?grandchild != wd:${childId})
      }
    `;

    try {
      const response = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
        params: { 
          query: query.trim(),
          format: 'json'
        },
        timeout: REQUEST_TIMEOUT,
        headers: { 
          'Accept': 'application/sparql-results+json'
        }
      });

      return response.data.boolean ?? false;
    } catch (error) {
      console.error(`Erreur lors de la vérification des enfants pour ${childId}:`, error);
      return false;
    }
  }

  async getChildren(parentId: string, options: QueryOptions = {}): Promise<SimplePeriod[]> {
    // Validation des paramètres
    if (!parentId || typeof parentId !== 'string') {
      throw new WikidataError('ID parent invalide', 'INVALID_PARAMETER');
    }

    const { language = this.defaultLanguage } = options;
    const cacheKey = this.getCacheKey({ language, parentId });
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData as SimplePeriod[];
    }

    return this.retryOperation(async () => {
      const query = this.buildQuery({ ...options, parentId });
      
      try {
        // Log de la requête pour le débogage
        console.log('Requête SPARQL:', query);
        console.log('Options:', { parentId, language });
        
        const response = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { 
            query: query.trim(),
            format: 'json'
          },
          timeout: REQUEST_TIMEOUT,
          headers: { 
            'Accept': 'application/sparql-results+json'
          },
          validateStatus: (status) => status === 200
        });

        // Validation de la réponse
        if (!response.data) {
          throw new WikidataError('Réponse vide de Wikidata', 'EMPTY_RESPONSE');
        }

        if (!response.data.results || !Array.isArray(response.data.results.bindings)) {
          throw new WikidataError('Format de réponse invalide', 'INVALID_RESPONSE_FORMAT');
        }

        // Transformation directe des résultats sans vérification supplémentaire
        const children = this.transformResponse(response.data.results.bindings);
        
        this.setCache(cacheKey, children);
        return children;
      } catch (error) {
        // Log détaillé de l'erreur
        if (error instanceof AxiosError) {
          console.error('Erreur Axios:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            config: {
              url: error.config?.url,
              method: error.config?.method,
              params: error.config?.params
            }
          });
        } else {
          console.error('Erreur inattendue:', error);
        }
        
        throw this.handleError(error);
      }
    });
  }
} 