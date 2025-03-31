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

  private buildChildrenQuery(parentId: string, options: QueryOptions): string {
    return `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX wikibase: <http://wikiba.se/ontology#>
      PREFIX bd: <http://www.bigdata.com/rdf#>
      
      SELECT DISTINCT ?child ?childLabel 
        ?startDate ?endDate 
        ?categoryId ?categoryLabel
        (GROUP_CONCAT(DISTINCT ?locationLabel; separator=", ") AS ?locations)
        (EXISTS { 
          { ?grandchild wdt:P361 ?child } 
          UNION { ?child wdt:P527 ?grandchild }
        } AS ?hasChildren)
      WHERE {
        # Relation parent-enfant
        { ?child wdt:P361 wd:${parentId} }
        UNION { wd:${parentId} wdt:P527 ?child }
        
        # FILTRE: S'assurer que c'est une période temporelle
        {
          ?child wdt:P31 ?periodType.
          VALUES ?periodType {
            wd:Q23387    # Éon
            wd:Q3253162  # Ère
            wd:Q186081   # Période
            wd:Q11514315 # Époque
            wd:Q47018901 # Âge
          }
        }
        UNION {
          ?child wdt:P31 ?childType.
          ?childType wdt:P279+ wd:Q186081.  # Sous-classe de Période
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
          bd:serviceParam wikibase:language "${options.language}".
          ?child rdfs:label ?childLabel.
          ?categoryId rdfs:label ?categoryLabel.
          ?locationEntity rdfs:label ?locationLabel.
        }
      }
      GROUP BY ?child ?childLabel ?startDate ?endDate ?categoryId ?categoryLabel ?hasChildren
      ORDER BY ?startDate
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
      startDate: binding.startDate?.value ? DateFormatter.format(binding.startDate.value, 'geological') : undefined,
      endDate: binding.endDate?.value ? DateFormatter.format(binding.endDate.value, 'geological') : undefined,
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
      const query = this.buildChildrenQuery(parentId, options);
      
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

        const children = response.data.results.bindings.map(binding => this.transformToSimplePeriod(binding));
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