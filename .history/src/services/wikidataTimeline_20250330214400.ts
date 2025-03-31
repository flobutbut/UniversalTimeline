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

  private buildMainEonsQuery(language: string): string {
    return `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      
      SELECT DISTINCT ?item ?itemLabel 
          (SAMPLE(?startDate) AS ?debut) 
          (SAMPLE(?endDate) AS ?fin) 
          ?categoryId ?categoryLabel
          (GROUP_CONCAT(DISTINCT ?locationLabel; separator=", ") AS ?locations)
          (COUNT(DISTINCT ?child) AS ?childCount)
      WHERE {
        VALUES ?item { 
          wd:${MAIN_EONS.HADEAN} 
          wd:${MAIN_EONS.ARCHEAN} 
          wd:${MAIN_EONS.PROTEROZOIC} 
          wd:${MAIN_EONS.PHANEROZOIC} 
        }
        
        # Dates
        OPTIONAL { ?item wdt:P580 ?startDate. }
        OPTIONAL { ?item wdt:P582 ?endDate. }
        
        # Catégories
        OPTIONAL { 
          ?item wdt:P31 ?categoryId.
        }
        
        # Localisation
        OPTIONAL { 
          {?item wdt:P17 ?locationEntity}  # pays
          UNION {?item wdt:P276 ?locationEntity}  # lieu
          UNION {?item wdt:P131 ?locationEntity}  # situé dans l'entité administrative
        }
        
        # Vérifie s'il y a des enfants
        OPTIONAL {
          { ?child wdt:P361 ?item } 
          UNION { ?item wdt:P527 ?child }
        }
        
        # Labels
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${language}".
          ?item rdfs:label ?itemLabel.
          ?categoryId rdfs:label ?categoryLabel.
          ?locationEntity rdfs:label ?locationLabel.
        }
      }
      GROUP BY ?item ?itemLabel ?categoryId ?categoryLabel
      ORDER BY ?debut
    `;
  }

  private buildChildrenQuery(parentId: string, language: string): string {
    return `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      
      SELECT DISTINCT ?child ?childLabel 
          (SAMPLE(?startDate) AS ?debut) 
          (SAMPLE(?endDate) AS ?fin) 
          ?categoryId ?categoryLabel
          (GROUP_CONCAT(DISTINCT ?locationLabel; separator=", ") AS ?locations)
          (EXISTS { 
            { ?grandchild wdt:P361 ?child } 
            UNION { ?child wdt:P527 ?grandchild }
          } AS ?hasChildren)
      WHERE {
        # Relation parent-enfant
        { ?child wdt:P361 wd:${parentId} }  # enfant "fait partie de" l'élément
        UNION { wd:${parentId} wdt:P527 ?child }  # élément "a pour partie" l'enfant
        
        # FILTRE: S'assurer que c'est une période temporelle
        {
          # Instance directe d'un type de période
          ?child wdt:P31 ?periodType.
          VALUES ?periodType {
            wd:${PERIOD_CATEGORIES.EON}
            wd:${PERIOD_CATEGORIES.ERA}
            wd:${PERIOD_CATEGORIES.PERIOD}
            wd:${PERIOD_CATEGORIES.EPOCH}
            wd:${PERIOD_CATEGORIES.AGE}
          }
        }
        UNION {
          # Ou instance d'une sous-classe de période
          ?child wdt:P31 ?childType.
          ?childType wdt:P279+ wd:${PERIOD_CATEGORIES.PERIOD}.
        }
        
        # Dates
        OPTIONAL { ?child wdt:P580 ?startDate. }
        OPTIONAL { ?child wdt:P582 ?endDate. }
        
        # Catégories
        OPTIONAL { ?child wdt:P31 ?categoryId. }
        
        # Localisation
        OPTIONAL { 
          {?child wdt:P17 ?locationEntity}
          UNION {?child wdt:P276 ?locationEntity}
          UNION {?child wdt:P131 ?locationEntity}
        }
        
        # Labels
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${language}".
          ?child rdfs:label ?childLabel.
          ?categoryId rdfs:label ?categoryLabel.
          ?locationEntity rdfs:label ?locationLabel.
        }
      }
      GROUP BY ?child ?childLabel ?categoryId ?categoryLabel ?hasChildren
      ORDER BY ?debut
      LIMIT 100
    `;
  }

  private transformToPeriod(binding: any): Period {
    const itemId = binding.item.value.split('/').pop();
    const categoryId = binding.categoryId?.value.split('/').pop() || '';
    
    return {
      id: itemId,
      label: binding.itemLabel?.value || itemId,
      startDate: binding.debut?.value ? DateFormatter.format(binding.debut.value, 'geological') : undefined,
      endDate: binding.fin?.value ? DateFormatter.format(binding.fin.value, 'geological') : undefined,
      categoryIds: [categoryId],
      categoryLabels: [binding.categoryLabel?.value || categoryId],
      location: binding.locations?.value,
      childrenPreloaded: false,
      children: [],
      loading: false,
      isMainEon: Object.values(MAIN_EONS).includes(itemId)
    };
  }

  private transformToSimplePeriod(binding: any): SimplePeriod {
    const childId = binding.child.value.split('/').pop();
    const categoryId = binding.categoryId?.value.split('/').pop() || '';
    
    return {
      id: childId,
      label: binding.childLabel?.value || childId,
      startDate: binding.debut?.value ? DateFormatter.format(binding.debut.value, 'geological') : undefined,
      endDate: binding.fin?.value ? DateFormatter.format(binding.fin.value, 'geological') : undefined,
      categoryIds: [categoryId],
      location: binding.locations?.value,
      hasChildren: binding.hasChildren?.value === "true",
      isMainEon: Object.values(MAIN_EONS).includes(childId)
    };
  }

  async getMainEons(options: QueryOptions = {}): Promise<Period[]> {
    const { language = this.defaultLanguage } = options;
    const cacheKey = this.getCacheKey({ language });
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData as Period[];
    }

    return this.retryOperation(async () => {
      const query = this.buildMainEonsQuery(language);
      
      try {
        const response = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { query, format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        const periods = response.data.results.bindings.map(binding => this.transformToPeriod(binding));
        this.setCache(cacheKey, periods);
        return periods;
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }

  async getChildren(parentId: string, options: QueryOptions = {}): Promise<SimplePeriod[]> {
    const { language = this.defaultLanguage } = options;
    const cacheKey = this.getCacheKey({ language, parentId });
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData as SimplePeriod[];
    }

    return this.retryOperation(async () => {
      const query = this.buildChildrenQuery(parentId, language);
      
      try {
        const response = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { query, format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        const children = response.data.results.bindings.map(binding => this.transformToSimplePeriod(binding));
        this.setCache(cacheKey, children);
        return children;
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }
} 