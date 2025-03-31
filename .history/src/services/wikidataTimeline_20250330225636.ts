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
      SELECT DISTINCT 
        ?item ?itemLabel 
        ?startDate ?endDate 
        ?categoryId ?categoryLabel
        ?location ?locationLabel
        (COUNT(DISTINCT ?child) AS ?childCount)
      WHERE {
        ${parentFilter}
        
        # Dates
        OPTIONAL { ?item wdt:P580 ?startDate. }
        OPTIONAL { ?item wdt:P582 ?endDate. }
        
        # Catégories
        OPTIONAL { ?item wdt:P31 ?categoryId. }
        
        # Localisation
        OPTIONAL { 
          ?item wdt:P17 ?location.
          FILTER(EXISTS { ?location rdfs:label ?locationLabel. })
        }
        
        # Vérification des enfants
        OPTIONAL {
          { ?child wdt:P361 ?item }
        }
        
        # Labels
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${language}".
          ?item rdfs:label ?itemLabel.
          ?categoryId rdfs:label ?categoryLabel.
          ?location rdfs:label ?locationLabel.
        }
      }
      GROUP BY ?item ?itemLabel ?startDate ?endDate ?categoryId ?categoryLabel ?location ?locationLabel
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

      // Vérification des enfants
      const hasChildren = binding.childCount?.value ? parseInt(binding.childCount.value) > 0 : false;

      const period: Period = {
        id: binding.item.value.split('/').pop() || '',
        label: binding.itemLabel.value,
        description: locationDescription,
        startDate: binding.startDate?.value ? DateFormatter.format(binding.startDate.value, 'geological') : undefined,
        endDate: binding.endDate?.value ? DateFormatter.format(binding.endDate.value, 'geological') : undefined,
        categoryIds: binding.categoryId?.value ? [binding.categoryId.value.split('/').pop() || ''] : [],
        categoryLabels: binding.categoryLabel?.value ? [binding.categoryLabel.value] : [],
        location: binding.locationLabel?.value,
        childrenPreloaded: false,
        children: [],
        loading: false,
        isMainEon: Object.values(MAIN_EONS).includes(binding.item.value.split('/').pop() || ''),
        hasChildren: hasChildren || false
      };

      console.log('Période transformée:', period);
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
    const cacheKey = this.getCacheKey({ ...options, parentId });
    const cachedData = this.getFromCache(cacheKey);
    if (cachedData) {
      return cachedData as SimplePeriod[];
    }

    try {
      const response = await this.retryOperation(() =>
        axios.get<WikidataResponse>('/api/wikidata/sparql', {
          params: {
            query: this.buildChildrenQuery(parentId, options),
            format: 'json'
          }
        })
      );

      if (!response.data?.results?.bindings) {
        throw new WikidataError(
          'Réponse invalide du serveur Wikidata',
          'INVALID_RESPONSE'
        );
      }

      // Vérifier les enfants pour chaque période
      const children = await Promise.all(
        response.data.results.bindings.map(async (binding) => {
          if (!binding.item?.value) {
            throw new WikidataError(
              'Données de période invalides',
              'INVALID_PERIOD_DATA'
            );
          }
          const childId = binding.item.value.split('/').pop() || '';
          const hasChildren = await this.checkHasChildren(childId);
          return this.transformResponse([{ ...binding, childCount: { value: hasChildren ? '1' : '0' } }])[0];
        })
      );

      this.setCache(cacheKey, children);
      return children;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private buildChildrenQuery(parentId: string, options: QueryOptions): string {
    const { language = this.defaultLanguage } = options;
    
    return `
      SELECT DISTINCT ?item ?itemLabel ?startDate ?endDate ?categoryId ?categoryLabel ?location ?locationLabel (COUNT(DISTINCT ?child) AS ?childCount)
      WHERE {
        ?item wdt:P31 wd:Q12308941;  # instance of temporal period
             wdt:P361 wd:${parentId}. # part of parent period
        
        OPTIONAL { ?item wdt:P580 ?startDate. }
        OPTIONAL { ?item wdt:P582 ?endDate. }
        OPTIONAL { ?item wdt:P31 ?categoryId. }
        OPTIONAL { ?item wdt:P131 ?location. }
        
        # Labels
        SERVICE wikibase:label { bd:serviceParam wikibase:language "${language}". }
        ?item rdfs:label ?itemLabel.
        OPTIONAL { ?categoryId rdfs:label ?categoryLabel. }
        OPTIONAL { ?location rdfs:label ?locationLabel. }
        
        # Count children
        OPTIONAL { ?child wdt:P361 ?item. }
      }
      GROUP BY ?item ?itemLabel ?startDate ?endDate ?categoryId ?categoryLabel ?location ?locationLabel
      ORDER BY ?startDate
    `.trim();
  }
} 