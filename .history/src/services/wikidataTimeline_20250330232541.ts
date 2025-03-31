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
    
    const parentFilter = parentId 
      ? `?item wdt:P361 wd:${parentId}.`  // Si on a un parent, on cherche ses enfants
      : `VALUES ?item { wd:Q104460 wd:Q104168 wd:Q104162 wd:Q101313 }`; // Liste des éons
    
    const query = `
      SELECT DISTINCT ?item ?itemLabel ?startDate ?endDate ?location ?locationLabel ?categoryId ?categoryLabel
      WHERE {
        ${parentFilter}
        OPTIONAL { ?item wdt:P580 ?startDate. }
        OPTIONAL { ?item wdt:P582 ?endDate. }
        OPTIONAL { 
          ?item wdt:P17 ?location.
          FILTER(EXISTS { ?location rdfs:label ?locationLabel. })
        }
        OPTIONAL { ?item wdt:P31 ?categoryId. }
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${language}".
          ?item rdfs:label ?itemLabel.
          ?location rdfs:label ?locationLabel.
          ?categoryId rdfs:label ?categoryLabel.
        }
      }
      ORDER BY DESC(?startDate)
    `;
    
    console.log('Requête SPARQL complète:', query);
    return query;
  }

  private transformResponse(bindings: any[]): Period[] {
    console.log('Début de transformation des données...');
    console.log('Nombre total de périodes:', bindings.length);
    
    return bindings.map(binding => {
      console.log('\n--- Traitement d\'une période ---');
      console.log('Données brutes du binding:', JSON.stringify(binding, null, 2));
      
      if (!binding.item?.value || !binding.itemLabel?.value) {
        console.error('Données invalides:', binding);
        throw new WikidataError(
          'Données de période géologique invalides',
          'INVALID_PERIOD_DATA'
        );
      }

      // Debug détaillé des données
      console.log('Données de localisation:');
      console.log('- Location value:', binding.location?.value);
      console.log('- Location type:', binding.location?.type);
      console.log('- LocationLabel value:', binding.locationLabel?.value);
      console.log('- LocationLabel type:', binding.locationLabel?.type);
      console.log('- LocationLabel language:', binding.locationLabel?.['xml:lang']);

      // Gestion de la localisation
      let locationDescription: string = 'Toute la Terre';
      if (binding.locationLabel?.value) {
        locationDescription = `Localisation: ${binding.locationLabel.value}`;
        console.log('Localisation trouvée:', locationDescription);
      } else {
        console.log('Aucune localisation spécifique trouvée, utilisation de la valeur par défaut');
        if (binding.location?.value) {
          console.log('URI de localisation trouvée mais sans label:', binding.location.value);
        }
      }

      const categoryId = binding.categoryId?.value ? binding.categoryId.value.split('/').pop() || '' : '';
      const categoryLabel = binding.categoryLabel?.value || categoryId;

      return {
        id: binding.item.value.split('/').pop() || '',
        label: binding.itemLabel.value,
        description: locationDescription,
        startDate: binding.startDate?.value ? DateFormatter.format(binding.startDate.value, 'geological') : undefined,
        endDate: binding.endDate?.value ? DateFormatter.format(binding.endDate.value, 'geological') : undefined,
        categoryIds: categoryId ? [categoryId] : [],
        categoryLabels: categoryLabel ? [categoryLabel] : [],
        location: binding.locationLabel?.value,
        childrenPreloaded: false,
        children: [],
        loading: false,
        isMainEon: Object.values(MAIN_EONS).includes(binding.item.value.split('/').pop() || '')
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
      ASK WHERE {
        { ?child wdt:P361 wd:${childId} }
        UNION { wd:${childId} wdt:P527 ?child }
      }
    `;

    try {
      const response = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
        params: {
          query,
          format: 'json'
        },
        headers: {
          'Accept': 'application/sparql-results+json'
        }
      });

      return response.data.boolean || false;
    } catch (error) {
      console.error('Erreur lors de la vérification des enfants:', error);
      return false;
    }
  }

  private async getChildren(parentId: string, options: QueryOptions): Promise<Period[]> {
    const cacheKey = `children_${parentId}_${options.language}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached as Period[];
    }

    return this.retryOperation(async () => {
      const query = this.buildQuery({ ...options, parentId });
      
      try {
        const response = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: {
            query,
            format: 'json'
          },
          headers: {
            'Accept': 'application/sparql-results+json'
          }
        });

        if (!response.data?.results?.bindings) {
          throw new WikidataError(
            'Réponse invalide du service Wikidata',
            'INVALID_RESPONSE'
          );
        }

        const periods = this.transformResponse(response.data.results.bindings);
        
        // Vérifier les enfants pour chaque période
        for (const period of periods) {
          period.hasChildren = await this.checkHasChildren(period.id);
        }

        this.setCache(cacheKey, periods);
        return periods;
      } catch (error) {
        console.error('Erreur lors de la récupération des enfants:', error);
        throw this.handleError(error);
      }
    });
  }
} 