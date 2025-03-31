import axios, { AxiosError } from 'axios';
import type { Period, SimplePeriod, QueryOptions, CacheEntry, WikidataResponse, WikidataBinding, MainEonId } from '../types/geological';
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
const RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 30000;
const CACHE_DURATION = 5 * 60 * 1000;

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
  private cache: Map<string, CacheEntry>;
  private defaultLanguage: string;
  private dateFormatter: DateFormatter;

  private constructor() {
    this.cache = new Map();
    this.defaultLanguage = 'fr';
    this.dateFormatter = new DateFormatter();
  }

  public static getInstance(): WikidataTimelineService {
    if (!WikidataTimelineService.instance) {
      WikidataTimelineService.instance = new WikidataTimelineService();
    }
    return WikidataTimelineService.instance;
  }

  private getCacheKey(options: QueryOptions): string {
    return JSON.stringify(options);
  }

  private getFromCache(key: string): Period[] | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
      return entry.data as Period[];
    }
    return null;
  }

  private setCache(key: string, data: Period[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private buildQuery(options: QueryOptions = {}): string {
    const { language = this.defaultLanguage, parentId } = options;
    const mainEons = Object.values(MAIN_EONS);
    const periodTypes = Object.values(PERIOD_TYPES);
    const dateProperties = Object.values(DATE_PROPERTIES);
    const locationProperties = Object.values(LOCATION_PROPERTIES);

    const parentFilter = parentId 
      ? `{ ?item wdt:P361 wd:${parentId} }`
      : `{ ?item wdt:P31 ?type . FILTER(?type IN (${periodTypes.join(',')})) }`;

    const languageLabels = SUPPORTED_LANGUAGES.map(lang => 
      `OPTIONAL { ?item rdfs:label ?label_${lang} . FILTER(LANG(?label_${lang}) = "${lang}") }`
    ).join('\n');

    const datePropertiesQuery = dateProperties.map(prop => 
      `OPTIONAL { ?item wdt:${prop} ?${prop} }`
    ).join('\n');

    const locationQuery = locationProperties.map(prop => 
      `OPTIONAL { ?item wdt:${prop} ?location . ?location rdfs:label ?locationLabel . FILTER(LANG(?locationLabel) = "${language}") }`
    ).join('\n');

    return `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      
      SELECT DISTINCT ?item ?itemLabel ?startDate ?endDate ?location ?locationLabel (COUNT(?child) AS ?childCount) {
        ${parentFilter}
        ${languageLabels}
        ${datePropertiesQuery}
        ${locationQuery}
        OPTIONAL { ?child wdt:P361 ?item }
        
        BIND(
          COALESCE(
            ?label_fr,
            ?label_en,
            ?label_es,
            ?label_de,
            ?item
          ) AS ?itemLabel
        )
        
        BIND(
          COALESCE(
            ?${DATE_PROPERTIES.START},
            ?${DATE_PROPERTIES.CREATION},
            ?${DATE_PROPERTIES.BIRTH}
          ) AS ?startDate
        )
        
        BIND(
          COALESCE(
            ?${DATE_PROPERTIES.END},
            ?${DATE_PROPERTIES.DEATH}
          ) AS ?endDate
        )
        
        GROUP BY ?item ?itemLabel ?startDate ?endDate ?location ?locationLabel
        ORDER BY ?startDate
        LIMIT 100
      }
    `;
  }

  private transformResponse(bindings: WikidataBinding[]): SimplePeriod[] {
    return bindings.map(binding => {
      const id = binding.item.value.split('/').pop() || '';
      const label = binding.itemLabel?.value || id;
      const startDate = binding.startDate?.value;
      const endDate = binding.endDate?.value;
      const location = binding.locationLabel?.value || binding.location?.value;
      const childCount = parseInt(binding.childCount?.value || '0', 10);
      const isMainEon = Object.values(MAIN_EONS).includes(id as MainEonId);

      return {
        id,
        label,
        startDate: startDate ? this.dateFormatter.formatDate(startDate) : undefined,
        endDate: endDate ? this.dateFormatter.formatDate(endDate) : undefined,
        location,
        hasChildren: childCount > 0,
        isMainEon,
        categoryIds: []
      };
    });
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        }
      }
    }
    
    throw lastError;
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

  async getMainEons(options: QueryOptions = {}): Promise<Period[]> {
    const { language = this.defaultLanguage } = options;
    const cacheKey = this.getCacheKey({ language });
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
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

  async getChildren(parentId: string, options: QueryOptions = {}): Promise<Period[]> {
    if (!parentId) {
      throw new WikidataError('ID parent requis', 'INVALID_PARENT_ID');
    }

    return this.retryOperation(async () => {
      const query = this.buildQuery({ ...options, parentId });
      
      try {
        const response = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { query, format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        const simplePeriods = this.transformResponse(response.data.results.bindings);
        return simplePeriods.map(period => ({
          ...period,
          categoryLabels: period.categoryIds,
          childrenPreloaded: false,
          children: [],
          loading: false
        }));
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }
} 