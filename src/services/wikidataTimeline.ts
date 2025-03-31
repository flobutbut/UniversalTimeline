import axios, { AxiosError } from 'axios';
import type { Period, SimplePeriod, QueryOptions, WikidataResponse, WikidataBinding } from '../types/geological';
import { MAIN_EONS } from '../types/geological';
import { DateFormatter } from '../utils/dateFormatter';
import { CacheService } from './index';

const WIKIDATA_API_URL = '/api/wikidata/sparql';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 seconde
const REQUEST_TIMEOUT = 30000; // 30 secondes
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 100; // Nombre maximum d'entrées dans le cache

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
  private cache: CacheService;
  private defaultLanguage = 'fr';
  private defaultLanguages = ['fr', 'en', 'es', 'de'];

  private constructor() {
    this.cache = new CacheService({
      duration: CACHE_DURATION,
      maxSize: CACHE_MAX_SIZE
    });
  }

  static getInstance(): WikidataTimelineService {
    if (!WikidataTimelineService.instance) {
      WikidataTimelineService.instance = new WikidataTimelineService();
    }
    return WikidataTimelineService.instance;
  }

  private getCacheKey(options: QueryOptions): string {
    const key = `${options.limit}-${options.offset}-${options.language}-${options.parentId || 'root'}`;
    console.log(`[Cache] Génération de la clé: ${key}`);
    return key;
  }

  private getFromCache(key: string): Period[] | null {
    const cached = this.cache.get<Period[]>(key);
    console.log(`[Cache] ${cached ? 'Données trouvées' : 'Données non trouvées'} pour la clé: ${key}`);
    return cached;
  }

  private setCache(key: string, data: Period[]): void {
    console.log(`[Cache] Mise en cache de ${data.length} périodes pour la clé: ${key}`);
    this.cache.set(key, data);
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    retries = MAX_RETRIES
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.log(`[API] Tentative de reconnexion (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
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
    const { parentId, languages = this.defaultLanguages } = options;
    
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
        (COALESCE(GROUP_CONCAT(DISTINCT ?locationLabel; separator=", "), "Globale") AS ?locations)
        (COUNT(DISTINCT ?child) AS ?childCount)
      WHERE {
        ${parentFilter}
        
        # Dates
        OPTIONAL { ?item wdt:P580 ?startDate. }
        OPTIONAL { ?item wdt:P582 ?endDate. }
        
        # Localisation (avec vérification des labels)
        OPTIONAL { 
          {
            # Localisations directes
            { ?item wdt:P17 ?locationEntity }
            UNION { ?item wdt:P276 ?locationEntity }
            UNION { ?item wdt:P131 ?locationEntity }
          }
          UNION {
            # Localisations avec P518 (apply to part)
            ?item p:P518 ?statement.
            ?statement ps:P518 ?locationEntity.
            OPTIONAL { ?statement pq:P518 ?partEntity. }
          }
          UNION {
            # Localisations indirectes via les parties
            ?item wdt:P527 ?partEntity.
            { ?partEntity wdt:P17 ?locationEntity }
            UNION { ?partEntity wdt:P276 ?locationEntity }
            UNION { ?partEntity wdt:P131 ?locationEntity }
          }
          FILTER(EXISTS { ?locationEntity rdfs:label ?locationLabel. })
        }
        
        # Vérification des enfants
        OPTIONAL {
          ?child wdt:P361 ?item.
        }
        
        # Labels avec cascade de langues
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${languages.join(',')}".
          ?item rdfs:label ?itemLabel.
          ?locationEntity rdfs:label ?locationLabel.
        }
      }
      GROUP BY ?item ?itemLabel ?startDate ?endDate
      ORDER BY ?startDate
      LIMIT 100
    `;

    console.log(`[SPARQL] Requête générée pour ${parentId ? `parent ${parentId}` : 'éons principaux'}`);
    return query;
  }

  // Nouvelles méthodes pour l'approche progressive
  private buildInitialQuery(): string {
    return `
      SELECT DISTINCT ?item ?itemLabel (COUNT(DISTINCT ?child) AS ?childCount)
      WHERE {
        VALUES ?item { wd:${Object.values(MAIN_EONS).join(' wd:')} }
        OPTIONAL { ?child wdt:P361 ?item. }
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
          ?item rdfs:label ?itemLabel.
        }
      }
      GROUP BY ?item ?itemLabel
    `;
  }

  private buildDetailsQuery(periodId: string): string {
    return `
      SELECT DISTINCT ?item ?itemLabel ?startDate ?endDate
      WHERE {
        BIND(wd:${periodId} AS ?item)
        OPTIONAL { ?item wdt:P580 ?startDate. }
        OPTIONAL { ?item wdt:P582 ?endDate. }
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
          ?item rdfs:label ?itemLabel.
        }
      }
    `;
  }

  private buildLocationQuery(periodId: string): string {
    return `
      SELECT DISTINCT ?locationLabel
      WHERE {
        BIND(wd:${periodId} AS ?item)
        {
          { ?item wdt:P17 ?locationEntity }
          UNION { ?item wdt:P276 ?locationEntity }
          UNION { ?item wdt:P131 ?locationEntity }
        }
        UNION {
          ?item p:P518 ?statement.
          ?statement ps:P518 ?locationEntity.
        }
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
          ?locationEntity rdfs:label ?locationLabel.
        }
      }
    `;
  }

  private buildChildrenQuery(periodId: string): string {
    return `
      SELECT DISTINCT ?child ?childLabel
      WHERE {
        ?child wdt:P361 wd:${periodId}.
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
          ?child rdfs:label ?childLabel.
        }
      }
    `;
  }

  // Méthodes utilitaires pour la transformation des données
  private isMainEon(id: string): boolean {
    return Object.values(MAIN_EONS).includes(id as any);
  }

  private transformToSimplePeriods(data: WikidataResponse): SimplePeriod[] {
    return data.results.bindings.map(binding => ({
      id: binding.item?.value.split('/').pop() || '',
      label: binding.itemLabel?.value || '',
      hasChildren: parseInt(binding.childCount?.value || '0') > 0,
      isMainEon: this.isMainEon(binding.item?.value.split('/').pop() || ''),
      categoryIds: [],
      categoryLabels: [],
      childrenPreloaded: false,
      children: [],
      loading: false,
      startDate: undefined,
      endDate: undefined,
      location: undefined
    }));
  }

  private mergePeriodData(
    baseData: WikidataResponse,
    locationData: WikidataResponse,
    childrenData: WikidataResponse
  ): Period {
    const base = baseData.results.bindings[0];
    const locations = locationData.results.bindings.map(b => b.locationLabel?.value || '');
    const children = childrenData.results.bindings.map(b => ({
      id: b.child?.value.split('/').pop() || '',
      label: b.childLabel?.value || '',
      hasChildren: false,
      isMainEon: false,
      categoryIds: [],
      startDate: undefined,
      endDate: undefined,
      location: undefined,
      children: [],
      loading: false,
      childrenPreloaded: false,
      categoryLabels: []
    }));

    return {
      id: base.item?.value.split('/').pop() || '',
      label: base.itemLabel?.value || '',
      startDate: base.startDate?.value,
      endDate: base.endDate?.value,
      location: locations.length > 0 ? locations.join(', ') : 'Globale',
      hasChildren: children.length > 0,
      isMainEon: this.isMainEon(base.item?.value.split('/').pop() || ''),
      categoryIds: [],
      categoryLabels: [],
      children,
      loading: false,
      childrenPreloaded: false
    };
  }

  private transformResponse(bindings: WikidataBinding[]): SimplePeriod[] {
    return bindings.map(binding => {
      const itemId = binding.item?.value.split('/').pop() || '';
      let label = binding.itemLabel?.value;
      if (!label || label.trim() === '') {
        label = itemId;
      }

      const period: SimplePeriod = {
        id: itemId,
        label: label,
        startDate: binding.startDate?.value ? DateFormatter.format(binding.startDate.value, 'geological') : undefined,
        endDate: binding.endDate?.value ? DateFormatter.format(binding.endDate.value, 'geological') : undefined,
        location: binding.locations?.value,
        hasChildren: parseInt(binding.childCount?.value || '0') > 0,
        isMainEon: this.isMainEon(itemId),
        categoryIds: [],
        categoryLabels: [],
        childrenPreloaded: false,
        children: [],
        loading: false
      };

      return period;
    });
  }

  async getMainEons(options: QueryOptions = {}): Promise<Period[]> {
    console.log('## [Timeline] Chargement initial des éons principaux');
    const { language = this.defaultLanguage } = options;
    const cacheKey = this.getCacheKey({ language });
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      console.log('## [Timeline] Éons principaux trouvés dans le cache');
      return cachedData;
    }

    return this.retryOperation(async () => {
      const query = this.buildQuery(options);
      
      try {
        console.log('[API] Requête SPARQL pour les éons principaux');
        const response = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { query, format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        const simplePeriods = this.transformResponse(response.data.results.bindings);
        console.log('## [Timeline] Éons principaux chargés:', simplePeriods.map(p => p.label).join(', '));

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

  async getChildren(parentId: string, options: QueryOptions = {}): Promise<SimplePeriod[]> {
    console.log(`## [Timeline] Navigation vers les enfants de ${parentId}`);
    
    if (!parentId || typeof parentId !== 'string') {
      throw new WikidataError('ID parent invalide', 'INVALID_PARAMETER');
    }

    const { language = this.defaultLanguage } = options;
    const cacheKey = this.getCacheKey({ language, parentId });
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      console.log(`## [Timeline] Enfants trouvés dans le cache pour ${parentId}`);
      return cachedData;
    }

    return this.retryOperation(async () => {
      const query = this.buildQuery({ ...options, parentId });
      
      try {
        console.log(`[API] Requête SPARQL pour les enfants de ${parentId}`);
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

        if (!response.data) {
          throw new WikidataError('Réponse vide de Wikidata', 'EMPTY_RESPONSE');
        }

        if (!response.data.results || !Array.isArray(response.data.results.bindings)) {
          throw new WikidataError('Format de réponse invalide', 'INVALID_RESPONSE_FORMAT');
        }

        const children = this.transformResponse(response.data.results.bindings);
        console.log(`## [Timeline] Enfants chargés pour ${parentId}:`, children.map(c => c.label).join(', '));
        
        this.setCache(cacheKey, children);
        return children;
      } catch (error) {
        console.error(`[Timeline] Erreur lors du chargement des enfants de ${parentId}:`, error);
        throw this.handleError(error);
      }
    });
  }

  async loadInitialEons(): Promise<SimplePeriod[]> {
    const cacheKey = 'initial-eons';
    const cached = this.getFromCache(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0 && 'hasChildren' in cached[0]) {
      return cached as SimplePeriod[];
    }

    return this.retryOperation(async () => {
      const query = this.buildInitialQuery();
      try {
        const response = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { query, format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        const periods = this.transformToSimplePeriods(response.data);
        this.setCache(cacheKey, periods);
        return periods;
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }

  async loadPeriodDetails(periodId: string): Promise<Period> {
    const cacheKey = `period-${periodId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached && !Array.isArray(cached) && 'children' in (cached as object)) {
      return cached as Period;
    }

    return this.retryOperation(async () => {
      try {
        // Exécution parallèle des requêtes
        const [baseData, locationData, childrenData] = await Promise.all([
          axios.get<WikidataResponse>(WIKIDATA_API_URL, {
            params: { query: this.buildDetailsQuery(periodId), format: 'json' },
            timeout: REQUEST_TIMEOUT,
            headers: { 'Accept': 'application/sparql-results+json' }
          }),
          axios.get<WikidataResponse>(WIKIDATA_API_URL, {
            params: { query: this.buildLocationQuery(periodId), format: 'json' },
            timeout: REQUEST_TIMEOUT,
            headers: { 'Accept': 'application/sparql-results+json' }
          }),
          axios.get<WikidataResponse>(WIKIDATA_API_URL, {
            params: { query: this.buildChildrenQuery(periodId), format: 'json' },
            timeout: REQUEST_TIMEOUT,
            headers: { 'Accept': 'application/sparql-results+json' }
          })
        ]);

        const period = this.mergePeriodData(
          baseData.data,
          locationData.data,
          childrenData.data
        );

        this.setCache(cacheKey, [period]);
        return period;
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }

  async loadChildrenDetails(parentId: string): Promise<Period[]> {
    console.log(`## [Timeline] Préchargement des détails des enfants de ${parentId}`);
    
    const cacheKey = `children-${parentId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0 && 'children' in (cached[0] as object)) {
      console.log(`## [Timeline] Détails des enfants trouvés dans le cache`);
      return cached;
    }

    return this.retryOperation(async () => {
      try {
        console.log(`[API] Requête SPARQL pour la liste des enfants de ${parentId}`);
        const childrenResponse = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { query: this.buildChildrenQuery(parentId), format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        console.log(`[API] Chargement des détails pour ${childrenResponse.data.results.bindings.length} enfants`);
        const childrenDetails = await Promise.all(
          childrenResponse.data.results.bindings.map(async (binding) => {
            const childId = binding.child?.value.split('/').pop() || '';
            return this.loadPeriodDetails(childId);
          })
        );

        console.log(`## [Timeline] Préchargement terminé:`, 
          childrenDetails.map(c => c.label).join(', '));
        
        this.setCache(cacheKey, childrenDetails);
        return childrenDetails;
      } catch (error) {
        console.error(`[Timeline] Erreur lors du préchargement des détails des enfants:`, error);
        throw this.handleError(error);
      }
    });
  }

  async getPeriod(periodId: string): Promise<Period> {
    console.log(`## [Timeline] Sélection de la période ${periodId}`);
    
    const cacheKey = `period-${periodId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached && !Array.isArray(cached)) {
      console.log(`## [Timeline] Détails de la période trouvés dans le cache`);
      return cached as Period;
    }

    const period = await this.retryOperation(async () => {
      console.log(`[API] Requête SPARQL pour les détails de ${periodId}`);
      const query = this.buildQuery({ language: this.defaultLanguage, parentId: periodId });
      const response = await axios.get(WIKIDATA_API_URL, {
        params: { query, format: 'json' },
        timeout: REQUEST_TIMEOUT,
        headers: { 'Accept': 'application/sparql-results+json' }
      });

      if (!response.data?.results?.bindings?.[0]) {
        throw new WikidataError('Période non trouvée', 'NOT_FOUND');
      }

      const period = this.transformResponse([response.data.results.bindings[0]])[0];
      console.log(`## [Timeline] Détails chargés pour ${period.label} (${periodId})`);
      
      this.setCache(cacheKey, [period]);
      return period;
    });

    return period;
  }

  // Méthode utilitaire pour nettoyer le cache
  clearCache(): void {
    console.log('[Cache] Nettoyage du cache');
    this.cache.clear();
  }
} 