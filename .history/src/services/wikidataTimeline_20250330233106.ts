import axios, { AxiosError } from 'axios';
import type { Period, SimplePeriod, QueryOptions, CacheEntry, WikidataResponse, WikidataResult } from '../types/geological';
import { MAIN_EONS, PERIOD_CATEGORIES } from '../types/geological';
import { DateFormatter } from '../utils/dateFormatter';
import type { WikidataBinding } from '../types/geological';

const WIKIDATA_API_URL = '/api/wikidata/sparql';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 seconde
const REQUEST_TIMEOUT = 30000; // 30 secondes
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class WikidataError extends Error {
  constructor(
    message: string,
    public code: string
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
    return JSON.stringify(options);
  }

  private getFromCache(key: string): Period[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as Period[];
  }

  private setCache(key: string, data: Period[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private async retryOperation<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.error(`Tentative ${attempt}/${maxRetries} échouée:`, error);
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  private buildQuery(options: QueryOptions): string {
    const { language = 'fr', parentId } = options;
    
    const parentFilter = parentId
      ? `?item wdt:P361 wd:${parentId} .`
      : `VALUES ?item { ${Object.values(MAIN_EONS).map(id => `wd:${id}`).join(' ')} }`;

    return `
      SELECT DISTINCT ?item ?itemLabel ?startDate ?endDate ?location ?locationLabel ?categoryId ?categoryLabel (COUNT(DISTINCT ?child) as ?childCount)
      WHERE {
        ${parentFilter}
        
        OPTIONAL { ?item wdt:P580 ?startDate . }
        OPTIONAL { ?item wdt:P582 ?endDate . }
        OPTIONAL { 
          ?item wdt:P276 ?location .
          ?location rdfs:label ?locationLabel .
          FILTER(LANG(?locationLabel) = "${language}")
        }
        OPTIONAL {
          ?item wdt:P31 ?categoryId .
          ?categoryId rdfs:label ?categoryLabel .
          FILTER(LANG(?categoryLabel) = "${language}")
        }
        OPTIONAL { ?child wdt:P361 ?item . }
        
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${language}" .
          ?item rdfs:label ?itemLabel .
        }
      }
      GROUP BY ?item ?itemLabel ?startDate ?endDate ?location ?locationLabel ?categoryId ?categoryLabel
      ORDER BY DESC(?startDate)
    `;
  }

  private transformResponse(bindings: WikidataResult['bindings'], parentId?: string): Period[] {
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
        isMainEon: !parentId
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
        const response = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
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

        const periods = this.transformResponse(response.data.results.bindings as WikidataResult['bindings'], options.parentId);
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
} 