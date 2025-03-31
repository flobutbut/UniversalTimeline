import axios, { AxiosError } from 'axios';
import type { Period, WikidataResponse } from '../types/geological';
import { DateFormatter } from '../utils/dateFormatter';
import { CacheService } from './index';

const WIKIDATA_API_URL = '/api/wikidata/sparql';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 seconde
const REQUEST_TIMEOUT = 30000; // 30 secondes
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: Period[];
  timestamp: number;
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  language?: string;
  parentId?: string;
}

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

export class WikidataService {
  private static instance: WikidataService;
  private cache: Map<string, CacheEntry> = new Map();

  private constructor() {}

  static getInstance(): WikidataService {
    if (!WikidataService.instance) {
      WikidataService.instance = new WikidataService();
    }
    return WikidataService.instance;
  }

  private getCacheKey(options: QueryOptions): string {
    return `${options.limit}-${options.offset}-${options.language}-${options.parentId || 'root'}`;
  }

  private getFromCache(key: string): Period[] | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
      return entry.data;
    }
    return null;
  }

  private setCache(key: string, data: Period[]): void {
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
    console.error('Gestion de l\'erreur:', error);
    if (error instanceof AxiosError) {
      console.error('Détails de l\'erreur Axios:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
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
    
    // Afficher la requête complète pour le débogage
    const query = `
      SELECT DISTINCT ?item ?itemLabel ?startDate ?endDate ?location ?locationLabel
      WHERE {
        ${parentFilter}
        OPTIONAL { ?item wdt:P580 ?startDate. }
        OPTIONAL { ?item wdt:P582 ?endDate. }
        OPTIONAL { 
          ?item wdt:P17 ?location.
          FILTER(EXISTS { ?location rdfs:label ?locationLabel. })
        }
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${language}".
          ?item rdfs:label ?itemLabel.
          ?location rdfs:label ?locationLabel.
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

      const period: Period = {
        id: binding.item.value.split('/').pop() || '',
        label: binding.itemLabel.value,
        startDate: binding.startDate?.value ? DateFormatter.format(binding.startDate.value, 'geological') : undefined,
        endDate: binding.endDate?.value ? DateFormatter.format(binding.endDate.value, 'geological') : undefined,
        location: locationDescription,
        hasChildren: false,
        isMainEon: false,
        categoryIds: [],
        categoryLabels: [],
        children: [],
        loading: false,
        childrenPreloaded: false
      };

      console.log('Période transformée:', period);
      return period;
    });
  }

  async getGeologicalPeriods(options: QueryOptions): Promise<Period[]> {
    const cacheKey = this.getCacheKey(options);
    const cachedData = this.getFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    return this.retryOperation(async () => {
      const query = this.buildQuery(options);
      console.log('Requête SPARQL:', query);
      
      try {
        const response = await axios.get(WIKIDATA_API_URL, {
          params: {
            query,
            format: 'json'
          },
          timeout: REQUEST_TIMEOUT,
          headers: {
            'Accept': 'application/sparql-results+json'
          }
        });
        
        if (!response.data || !response.data.results || !response.data.results.bindings) {
          console.error('Structure de réponse invalide:', response.data);
          throw new WikidataError(
            'Réponse invalide de Wikidata',
            'INVALID_RESPONSE'
          );
        }

        console.log('Réponse brute de Wikidata:', JSON.stringify(response.data.results.bindings, null, 2));

        const periods = this.transformResponse(response.data.results.bindings);
        this.setCache(cacheKey, periods);
        return periods;
      } catch (error) {
        console.error('Erreur détaillée:', error);
        if (error instanceof AxiosError) {
          console.error('Status:', error.response?.status);
          console.error('Headers:', error.response?.headers);
          console.error('Data:', error.response?.data);
        }
        throw error;
      }
    });
  }

  async getChildPeriods(parentId: string, options: QueryOptions = {}): Promise<Period[]> {
    return this.getGeologicalPeriods({
      ...options,
      parentId
    });
  }
} 