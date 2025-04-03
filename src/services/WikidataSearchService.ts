import axios from 'axios';
import { DateFormatter } from '../utils/dateFormatter';

interface WikidataBinding {
  item?: { value: string };
  itemLabel?: { value: string };
  description?: { value: string };
  startDate?: { value: string };
  endDate?: { value: string };
  startLocationLabel?: { value: string };
  endLocationLabel?: { value: string };
}

interface WikidataResponse {
  results: {
    bindings: WikidataBinding[];
  };
}

export interface SearchResult {
  id: string;
  label: string;
  type: 'period' | 'event';
  date: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  startLocation: string;
  endLocation: string;
}

interface WikidataEntity {
  entities: {
    [key: string]: {
      claims: {
        P580?: Array<{ // date de début
          mainsnak: {
            datavalue?: {
              value: {
                time: string
                precision: number
              }
            }
          }
        }>
        P582?: Array<{ // date de fin
          mainsnak: {
            datavalue?: {
              value: {
                time: string
                precision: number
              }
            }
          }
        }>
      }
      descriptions?: {
        fr?: {
          value: string
        }
      }
    }
  }
}

interface WikidataSearchOptions {
  language?: string;
  type?: 'period' | 'event' | 'both';
}

export class WikidataSearchService {
  private static instance: WikidataSearchService
  private readonly WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php'
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private searchCache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map()
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 1000 // 1 seconde
  private readonly REQUEST_TIMEOUT = 10000 // 10 secondes
  private readonly DEBOUNCE_DELAY = 300 // 300ms
  private searchTimeout: NodeJS.Timeout | null = null
  private currentSearchPromise: Promise<SearchResult[]> | null = null
  private isSearching = false

  private constructor() {}

  public static getInstance(): WikidataSearchService {
    if (!WikidataSearchService.instance) {
      WikidataSearchService.instance = new WikidataSearchService()
    }
    return WikidataSearchService.instance
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (attempt < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        }
      }
    }
    
    throw lastError;
  }

  public async search(query: string, options: WikidataSearchOptions = {}): Promise<SearchResult[]> {
    const { language = 'fr', type = 'both' } = options;
    const cacheKey = `${query}-${language}-${type}`;
    const cached = this.searchCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.results;
    }

    try {
      // Première requête pour obtenir les entités
      const searchResponse = await axios.get(this.WIKIDATA_API_URL, {
        params: {
          action: 'wbsearchentities',
          search: query,
          language: language,
          uselang: language,
          format: 'json',
          origin: '*',
          limit: 20,
          type: 'item'
        },
        timeout: this.REQUEST_TIMEOUT,
        headers: { 
          'Accept': 'application/json'
        }
      });

      if (!searchResponse.data || !searchResponse.data.search) {
        return [];
      }

      // Deuxième requête pour obtenir les détails des entités
      const entityIds = searchResponse.data.search.map((item: any) => item.id).join('|');
      const detailsResponse = await axios.get(this.WIKIDATA_API_URL, {
        params: {
          action: 'wbgetentities',
          ids: entityIds,
          props: 'claims|descriptions',
          languages: language,
          format: 'json',
          origin: '*'
        },
        timeout: this.REQUEST_TIMEOUT,
        headers: { 
          'Accept': 'application/json'
        }
      });

      // Transformer les résultats
      const results = searchResponse.data.search
        .filter((item: any) => {
          const entity = detailsResponse.data?.entities?.[item.id];
          if (!entity) return false;

          const claims = entity.claims || {};
          const startClaim = claims.P580?.[0]?.mainsnak?.datavalue?.value;
          const endClaim = claims.P582?.[0]?.mainsnak?.datavalue?.value;
          const pointInTimeClaim = claims.P585?.[0]?.mainsnak?.datavalue?.value;

          // Filtrer selon le type demandé
          if (type === 'period') {
            return startClaim && endClaim;
          } else if (type === 'event') {
            return pointInTimeClaim;
          } else {
            return (startClaim && endClaim) || pointInTimeClaim;
          }
        })
        .map((item: any) => {
          const entity = detailsResponse.data.entities[item.id];
          const claims = entity?.claims || {};
          
          // Correction de l'accès aux dates
          const startClaim = claims.P580?.[0]?.mainsnak?.datavalue?.value?.time;
          const endClaim = claims.P582?.[0]?.mainsnak?.datavalue?.value?.time;
          const pointInTimeClaim = claims.P585?.[0]?.mainsnak?.datavalue?.value?.time;

          const startDate = startClaim ? this.parseWikidataDate(startClaim) : undefined;
          const endDate = endClaim ? this.parseWikidataDate(endClaim) : undefined;
          const pointInTime = pointInTimeClaim ? this.parseWikidataDate(pointInTimeClaim) : undefined;

          // Déterminer le type en fonction des dates
          const resultType = startDate && endDate ? 'period' : 'event';

          // Formater la date en fonction du type
          const date = resultType === 'period' 
            ? this.formatPeriodDate(startDate, endDate)
            : this.formatEventDate(pointInTime || startDate); // Utiliser startDate comme fallback

          return {
            id: item.id,
            label: item.label,
            description: item.description,
            type: resultType,
            date,
            startDate,
            endDate,
            startLocation: "Globale",
            endLocation: "Globale"
          };
        });

      this.searchCache.set(cacheKey, {
        results,
        timestamp: Date.now()
      });

      return results;
    } catch (error) {
      console.error('Error in Wikidata search:', error);
      throw error;
    }
  }

  private parseWikidataDate(dateString: string): string | undefined {
    if (!dateString) return undefined;

    // Nettoyer la chaîne de date
    const cleanDate = dateString.trim();

    // Cas 1: Format scientifique (ex: -4.5E9)
    if (cleanDate.includes('E')) {
      const num = parseFloat(cleanDate);
      if (!isNaN(num)) {
        // Convertir en format ISO
        const year = Math.abs(Math.round(num));
        return `${year}-01-01`;
      }
    }

    // Cas 2: Format standard Wikidata (+/-YYYY-MM-DDT00:00:00Z)
    const standardMatch = cleanDate.match(/^([+-])(\d+)-(\d{2})-(\d{2})/);
    if (standardMatch) {
      const [, sign, year, month, day] = standardMatch;
      return `${Math.abs(parseInt(year))}-${month}-${day}`;
    }

    // Cas 3: Format année simple (+/-YYYY)
    const simpleMatch = cleanDate.match(/^([+-]?\d+)$/);
    if (simpleMatch) {
      const year = parseInt(simpleMatch[1]);
      return `${Math.abs(year)}-01-01`;
    }

    console.warn('Format de date non reconnu:', dateString);
    return undefined;
  }

  private formatPeriodDate(start?: string, end?: string): string {
    if (!start) return 'Date inconnue';
    
    if (!end) {
      return DateFormatter.format(start, 'geological');
    }
    
    const startFormatted = DateFormatter.format(start, 'geological');
    const endFormatted = DateFormatter.format(end, 'geological');
    return `${startFormatted} - ${endFormatted}`;
  }

  private formatEventDate(date?: string): string {
    if (!date) return 'Date inconnue';
    return DateFormatter.format(date, 'geological');
  }

  public clearCache(): void {
    this.searchCache.clear();
  }

  public isSearchInProgress(): boolean {
    return this.isSearching;
  }
} 