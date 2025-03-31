import axios, { AxiosError } from 'axios';
import type { Period, SimplePeriod, QueryOptions, CacheEntry, WikidataResponse, WikidataBinding } from '../types/geological';
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
    
    const parentFilter = parentId 
      ? `?item wdt:P361 wd:${parentId}.`  // Si on a un parent, on cherche ses enfants
      : `VALUES ?item { wd:Q104460 wd:Q104168 wd:Q104162 wd:Q101313 }`; // Liste des éons
    
    const query = `
      SELECT DISTINCT ?item ?itemLabel 
        ?startDate ?endDate 
        ?location ?locationLabel
        (COUNT(DISTINCT ?child) AS ?childCount)
      WHERE {
        ${parentFilter}
        OPTIONAL { ?item wdt:P580 ?startDate. }
        OPTIONAL { ?item wdt:P582 ?endDate. }
        OPTIONAL { 
          ?item wdt:P17 ?location.
          FILTER(EXISTS { ?location rdfs:label ?locationLabel. })
        }
        OPTIONAL {
          { ?child wdt:P361 ?item } 
          UNION { ?item wdt:P527 ?child }
        }
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${language}".
          ?item rdfs:label ?itemLabel.
          ?location rdfs:label ?locationLabel.
        }
      }
      GROUP BY ?item ?itemLabel ?startDate ?endDate ?location ?locationLabel
      ORDER BY DESC(?startDate)
    `;
    
    console.log('Requête SPARQL complète:', query);
    return query;
  }

  private transformResponse(response: WikidataResponse): Period[] {
    console.log('Transformation des données...');
    console.log(`Nombre total de périodes: ${response.results.bindings.length}`);
    console.log('Données brutes:', JSON.stringify(response.results.bindings, null, 2));

    return response.results.bindings.map((binding: WikidataBinding) => {
      if (!binding.item?.value || !binding.itemLabel?.value) {
        throw new WikidataError('Données invalides: item ou itemLabel manquant', 'INVALID_PERIOD_DATA');
      }

      const period: Period = {
        id: binding.item.value,
        label: binding.itemLabel.value,
        description: binding.locationLabel?.value || 'Toute la Terre',
        startDate: binding.startDate?.value,
        endDate: binding.endDate?.value,
        childPeriods: [],
        hasChildren: binding.childCount?.value ? parseInt(binding.childCount.value) > 0 : false
      };

      console.log(`Période transformée:`, period);
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

        const periods = this.transformResponse(response.data);
        this.setCache(cacheKey, periods);
        return periods;
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }

  private async checkHasChildren(childId: string): Promise<boolean> {
    try {
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

      const response = await axios.get<WikidataResponse>(`${WIKIDATA_API_URL}`, {
        params: {
          query,
          format: 'json'
        }
      });

      return response.data.boolean || false;
    } catch (error) {
      console.error('Erreur lors de la vérification des enfants:', error);
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
      const query = this.buildQuery(options);
      
      try {
        // Log de la requête pour le débogage
        console.log('Requête SPARQL:', query);
        console.log('Options:', { parentId, language });
        
        const response = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { 
            query: query.trim(), // Suppression des espaces inutiles
            format: 'json'
          },
          timeout: REQUEST_TIMEOUT,
          headers: { 
            'Accept': 'application/sparql-results+json'
          },
          validateStatus: (status) => status === 200 // Seul le statut 200 est accepté
        });

        // Validation de la réponse
        if (!response.data) {
          throw new WikidataError('Réponse vide de Wikidata', 'EMPTY_RESPONSE');
        }

        if (!response.data.results || !Array.isArray(response.data.results.bindings)) {
          throw new WikidataError('Format de réponse invalide', 'INVALID_RESPONSE_FORMAT');
        }

        // Vérifier les enfants pour chaque période
        const children = await Promise.all(
          response.data.results.bindings.map(async (binding) => {
            if (!binding.item?.value || !binding.itemLabel?.value) {
              throw new WikidataError('Données invalides: item ou itemLabel manquant', 'INVALID_PERIOD_DATA');
            }

            const childId = binding.item.value.split('/').pop() || '';
            const hasChildren = await this.checkHasChildren(childId);

            const simplePeriod: SimplePeriod = {
              id: childId,
              label: binding.itemLabel.value,
              startDate: binding.startDate?.value,
              endDate: binding.endDate?.value,
              hasChildren: hasChildren || false
            };

            return simplePeriod;
          })
        );

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