import axios, { AxiosError } from 'axios';
import type { Period, SimplePeriod, QueryOptions, CacheEntry, WikidataResponse } from '../types/geological';
import { MAIN_EONS, PERIOD_CATEGORIES } from '../types/geological';
import { DateFormatter } from '../utils/dateFormatter';
import { WikidataError } from '../types/errors';

const WIKIDATA_API_URL = '/api/wikidata/sparql';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 seconde
const REQUEST_TIMEOUT = 30000; // 30 secondes
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
        ?location ?locationLabel
        ?categoryId ?categoryLabel
        (COUNT(DISTINCT ?child) AS ?childCount)
      WHERE {
        ${parentFilter}
        OPTIONAL { ?item wdt:P580 ?startDate. }
        OPTIONAL { ?item wdt:P582 ?endDate. }
        OPTIONAL { 
          ?item wdt:P17 ?location.
          FILTER(EXISTS { ?location rdfs:label ?locationLabel. })
        }
        OPTIONAL { ?item wdt:P31 ?categoryId. }
        OPTIONAL {
          { ?child wdt:P361 ?item }
        }
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${language}".
          ?item rdfs:label ?itemLabel.
          ?location rdfs:label ?locationLabel.
          ?categoryId rdfs:label ?categoryLabel.
        }
      }
      GROUP BY ?item ?itemLabel ?startDate ?endDate ?location ?locationLabel ?categoryId ?categoryLabel
      ORDER BY DESC(?startDate)
    `;
    
    console.log('Requête SPARQL complète:', query);
    return query;
  }

  private transformResponse(bindings: WikidataResponse['results']['bindings']): Period[] {
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

      // Gestion de la localisation
      let locationDescription: string = 'Toute la Terre';
      if (binding.locationLabel?.value) {
        locationDescription = `Localisation: ${binding.locationLabel.value}`;
        console.log('Localisation trouvée:', locationDescription);
      }

      // Gestion des catégories
      const categoryIds: string[] = [];
      const categoryLabels: string[] = [];
      if (binding.categoryId?.value) {
        categoryIds.push(binding.categoryId.value.split('/').pop() || '');
        if (binding.categoryLabel?.value) {
          categoryLabels.push(binding.categoryLabel.value);
        }
      }

      // Extraction de l'ID Wikidata
      const itemId = binding.item.value.split('/').pop() || '';

      // Vérification si c'est un éon principal
      const mainEonValues = Object.values(MAIN_EONS) as string[];
      const isMainEon = mainEonValues.includes(itemId);

      // Gestion des enfants
      const hasChildren = binding.childCount?.value ? parseInt(binding.childCount.value) > 0 : false;

      const period: Period = {
        id: itemId,
        label: binding.itemLabel.value,
        description: locationDescription,
        startDate: binding.startDate?.value ? DateFormatter.format(binding.startDate.value, 'geological') : undefined,
        endDate: binding.endDate?.value ? DateFormatter.format(binding.endDate.value, 'geological') : undefined,
        categoryIds,
        categoryLabels,
        location: binding.locationLabel?.value,
        childrenPreloaded: false,
        children: [],
        loading: false,
        isMainEon,
        hasChildren
      };

      console.log('Période transformée:', period);
      return period;
    });
  }

  private transformToSimplePeriod(binding: WikidataResponse['results']['bindings'][0]): SimplePeriod {
    // Extraction de l'ID Wikidata
    const itemId = binding.item.value.split('/').pop() || '';

    // Vérification si c'est un éon principal
    const mainEonValues = Object.values(MAIN_EONS) as string[];
    const isMainEon = mainEonValues.includes(itemId);

    const period: SimplePeriod = {
      id: itemId,
      label: binding.itemLabel.value,
      startDate: binding.startDate?.value ? DateFormatter.format(binding.startDate.value, 'geological') : undefined,
      endDate: binding.endDate?.value ? DateFormatter.format(binding.endDate.value, 'geological') : undefined,
      categoryIds: binding.categoryId?.value ? [binding.categoryId.value.split('/').pop() || ''] : [],
      location: binding.locationLabel?.value,
      hasChildren: binding.childCount?.value ? parseInt(binding.childCount.value) > 0 : undefined,
      isMainEon
    };

    return period;
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
    console.log('Récupération des enfants pour la période:', parentId);
    const cacheKey = `children_${parentId}_${options.language || 'fr'}`;

    try {
      // Vérifier le cache
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        console.log('Données trouvées dans le cache');
        return cachedData as SimplePeriod[];
      }

      // Construire et exécuter la requête
      const query = this.buildQuery({ ...options, parentId });
      console.log('Requête SPARQL:', query);

      const response = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
        params: {
          query,
          format: 'json'
        },
        timeout: REQUEST_TIMEOUT
      });

      // Vérifier la réponse
      if (!response.data?.results?.bindings) {
        console.error('Réponse invalide:', response.data);
        throw new WikidataError(
          'Réponse invalide du service Wikidata',
          'INVALID_RESPONSE'
        );
      }

      // Transformer les données
      const children = response.data.results.bindings.map(binding => this.transformToSimplePeriod(binding));
      this.setCache(cacheKey, children);
      return children;

    } catch (error) {
      console.error('Erreur lors de la récupération des enfants:', error);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 400) {
          throw new WikidataError(
            'Requête SPARQL invalide',
            'INVALID_SPARQL_QUERY',
            error
          );
        }
        throw new WikidataError(
          'Erreur lors de la communication avec Wikidata',
          'API_ERROR',
          error
        );
      }
      throw new WikidataError(
        'Erreur inattendue lors de la récupération des enfants',
        'UNEXPECTED_ERROR',
        error as Error
      );
    }
  }
} 