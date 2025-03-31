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

  private buildQuery(options: QueryOptions): string {
    const { language = 'fr', parentId } = options;
    
    // Définition des éons principaux
    const mainEons = [
      'Q104460',  // Hadéen
      'Q104168',  // Archéen
      'Q104162',  // Protérozoïque
      'Q101313'   // Phanérozoïque
    ];

    // Construction du filtre parent
    const parentFilter = parentId 
      ? `?item wdt:P361 wd:${parentId}.`  // Si on a un parent, on cherche ses enfants
      : `VALUES ?item { wd:${mainEons.join(' wd:')} }`; // Liste des éons principaux

    // Construction de la requête
    const query = `
      SELECT DISTINCT 
        ?item ?itemLabel 
        ?startDate ?endDate 
        (GROUP_CONCAT(DISTINCT ?locationLabel; separator=", ") AS ?locations)
        (COUNT(DISTINCT ?child) AS ?childCount)
      WHERE {
        ${parentFilter}
        
        # Dates
        OPTIONAL { ?item wdt:P580 ?startDate. }
        OPTIONAL { ?item wdt:P582 ?endDate. }
        
        # Localisation (avec vérification des labels)
        OPTIONAL { 
          { ?item wdt:P17 ?locationEntity }
          UNION { ?item wdt:P276 ?locationEntity }
          UNION { ?item wdt:P131 ?locationEntity }
          FILTER(EXISTS { ?locationEntity rdfs:label ?locationLabel. })
        }
        
        # Vérification des enfants
        OPTIONAL {
          ?child wdt:P361 ?item.
        }
        
        # Labels
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${language}".
          ?item rdfs:label ?itemLabel.
          ?locationEntity rdfs:label ?locationLabel.
        }
      }
      GROUP BY ?item ?itemLabel ?startDate ?endDate
      ORDER BY ?startDate
      LIMIT 100
    `;

    console.log('Requête SPARQL:', query);
    return query;
  }

  private transformResponse(bindings: any[]): SimplePeriod[] {
    return bindings.map(binding => {
      const period: SimplePeriod = {
        id: binding.item.value.split('/').pop() || '',
        label: binding.itemLabel.value,
        startDate: binding.startDate?.value ? DateFormatter.format(binding.startDate.value, 'geological') : undefined,
        endDate: binding.endDate?.value ? DateFormatter.format(binding.endDate.value, 'geological') : undefined,
        location: binding.locations?.value,
        hasChildren: parseInt(binding.childCount?.value || '0') > 0,
        isMainEon: false,
        categoryIds: [] // On garde un tableau vide pour la compatibilité
      };

      // Déterminer si c'est un éon principal
      const mainEons = ['Q104460', 'Q104168', 'Q104162', 'Q101313'];
      if (mainEons.includes(period.id)) {
        period.isMainEon = true;
      }

      return period;
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

        const periods = this.transformResponse(response.data.results.bindings);
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

      return response.data.boolean;
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