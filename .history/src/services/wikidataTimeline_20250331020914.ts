import axios, { AxiosError } from 'axios';
import type { Period, SimplePeriod, QueryOptions, CacheEntry, WikidataResponse } from '../types/geological';
import { 
  MAIN_EONS, 
  PERIOD_TYPES, 
  DATE_PROPERTIES, 
  LOCATION_PROPERTIES, 
  SUPPORTED_LANGUAGES 
} from '../types/geological';
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
  private dateFormatter: DateFormatter;
  private defaultLanguage = 'fr';

  private constructor() {
    this.dateFormatter = new DateFormatter();
  }

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
    const periodTypes = Object.values(PERIOD_TYPES).join('|');
    const dateProperties = Object.values(DATE_PROPERTIES).join('|');
    const locationProperties = Object.values(LOCATION_PROPERTIES).join('|');
    const languageFallback = SUPPORTED_LANGUAGES.map(lang => `"${lang}"`).join('|');

    const parentFilter = parentId 
      ? `{ ?item wdt:P361 wd:${parentId} } UNION { wd:${parentId} wdt:P527 ?item }`
      : `VALUES ?item { wd:${Object.values(MAIN_EONS).join(' wd:')} }`;

    return `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      
      SELECT DISTINCT ?item ?itemLabel ?startDate ?endDate ?location ?locationLabel (COUNT(?child) AS ?childCount) WHERE {
        ${parentFilter}
        
        # Filtre sur les types de périodes
        ?item wdt:P31 ?type .
        FILTER(?type IN (wd:${periodTypes}))
        
        # Labels avec fallback de langue
        SERVICE wikibase:label { bd:serviceParam wikibase:language "${language}",${languageFallback}" }
        ?item rdfs:label ?itemLabel .
        
        # Dates avec COALESCE
        OPTIONAL {
          ?item wdt:${dateProperties} ?date .
          BIND(COALESCE(?date, "") AS ?startDate)
        }
        OPTIONAL {
          ?item wdt:${dateProperties} ?date .
          BIND(COALESCE(?date, "") AS ?endDate)
        }
        
        # Localisations avec P518
        OPTIONAL {
          ?item wdt:${locationProperties} ?location .
          OPTIONAL { ?item wdt:${LOCATION_PROPERTIES.APPLY_TO_PART} ?part }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "${language}",${languageFallback}" }
          ?location rdfs:label ?locationLabel .
        }
        
        # Comptage des enfants
        OPTIONAL {
          { ?child wdt:P361 ?item }
          UNION { ?item wdt:P527 ?child }
        }
        
        # Vérification de la présence d'au moins une date
        FILTER(BOUND(?startDate) || BOUND(?endDate))
      }
      GROUP BY ?item ?itemLabel ?startDate ?endDate ?location ?locationLabel
      ORDER BY ?startDate
      LIMIT 100
    `;
  }

  private transformResponse(bindings: WikidataResponse['results']['bindings']): SimplePeriod[] {
    return bindings.map(binding => {
      const id = binding.item.value.split('/').pop() || '';
      const label = binding.itemLabel.value || id;
      const startDate = binding.startDate?.value ? DateFormatter.format(binding.startDate.value) : undefined;
      const endDate = binding.endDate?.value ? DateFormatter.format(binding.endDate.value) : undefined;
      const location = binding.locationLabel?.value || binding.location?.value;
      const hasChildren = parseInt(binding.childCount?.value || '0') > 0;
      const isMainEon = Object.values(MAIN_EONS).includes(id as any);

      return {
        id,
        label,
        startDate,
        endDate,
        location,
        hasChildren,
        isMainEon,
        categoryIds: []
      };
    });
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
      const response = await axios.get<{ boolean: boolean }>(WIKIDATA_API_URL, {
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