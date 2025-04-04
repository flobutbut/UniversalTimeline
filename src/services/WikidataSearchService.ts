import axios from 'axios';
import { DateFormatter } from '../utils/dateFormatter';

interface WikidataBinding {
  item?: { value: string };
  itemLabel?: { value: string };
  description?: { value: string };
  startDate?: { value: string };  // Date de naissance pour les personnes
  endDate?: { value: string };    // Date de décès pour les personnes
  startLocationLabel?: { value: string };
  endLocationLabel?: { value: string };
  birthPlace?: { value: string }; // Lieu de naissance
  deathPlace?: { value: string }; // Lieu de décès
}

interface WikidataResponse {
  results: {
    bindings: WikidataBinding[];
  };
}

export interface SearchResult {
  id: string;
  label: string;
  type: 'period' | 'event' | 'person';
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
          const birthDate = claims.P569?.[0]?.mainsnak?.datavalue?.value;  // Date de naissance
          const deathDate = claims.P570?.[0]?.mainsnak?.datavalue?.value;  // Date de décès
          const startClaim = claims.P580?.[0]?.mainsnak?.datavalue?.value; // Début période
          const endClaim = claims.P582?.[0]?.mainsnak?.datavalue?.value;   // Fin période
          const pointInTimeClaim = claims.P585?.[0]?.mainsnak?.datavalue?.value; // Date événement
          const instanceOf = claims.P31?.[0]?.mainsnak?.datavalue?.value?.id;    // Type d'entité

          // Filtrer selon le type demandé
          if (type === 'period') {
            return startClaim && endClaim;
          } else if (type === 'event') {
            return pointInTimeClaim;
          } else {
            return (startClaim && endClaim) || pointInTimeClaim || (birthDate || deathDate);
          }
        })
        .map((item: any) => {
          const entity = detailsResponse.data.entities[item.id];
          const claims = entity?.claims || {};
          
          // Dates pour les personnes
          const birthDate = claims.P569?.[0]?.mainsnak?.datavalue?.value?.time;
          const deathDate = claims.P570?.[0]?.mainsnak?.datavalue?.value?.time;
          const birthPlace = claims.P19?.[0]?.mainsnak?.datavalue?.value?.id;
          const deathPlace = claims.P20?.[0]?.mainsnak?.datavalue?.value?.id;
          
          // Dates pour les périodes et événements
          const startClaim = claims.P580?.[0]?.mainsnak?.datavalue?.value?.time;
          const endClaim = claims.P582?.[0]?.mainsnak?.datavalue?.value?.time;
          const pointInTimeClaim = claims.P585?.[0]?.mainsnak?.datavalue?.value?.time;

          // Déterminer le type
          let resultType: 'period' | 'event' | 'person' = 'event';
          if (birthDate || deathDate) {
            resultType = 'person';
          } else if (startClaim && endClaim) {
            resultType = 'period';
          }

          // Formater les dates selon le type
          const date = this.formatDate(resultType, birthDate || startClaim || pointInTimeClaim, deathDate || endClaim);

          return {
            id: item.id,
            label: item.label,
            description: item.description,
            type: resultType,
            date,
            startDate: birthDate || startClaim,
            endDate: deathDate || endClaim,
            startLocation: birthPlace || "Globale",
            endLocation: deathPlace || "Globale"
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

  private formatDate(type: 'period' | 'event' | 'person', start?: string, end?: string): string {
    if (type === 'person') {
      return this.formatPersonDates(start, end);
    } else if (type === 'period') {
      return this.formatPeriodDate(start, end);
    } else {
      return this.formatEventDate(start);
    }
  }

  private formatPersonDates(birthDate?: string, deathDate?: string): string {
    if (!birthDate && !deathDate) return 'Dates inconnues';
    
    const birth = birthDate ? DateFormatter.processDate(birthDate) : null;
    const death = deathDate ? DateFormatter.processDate(deathDate) : null;
    
    if (birth && death) {
      // Calculer l'âge
      const age = Math.abs(death.numericValues.year - birth.numericValues.year);
      return `${age} ans (il y a ${DateFormatter.formatYearsToGeological(death.numericValues.yearsFromNow)})`;
    } else if (birth) {
      return `Né il y a ${DateFormatter.formatYearsToGeological(birth.numericValues.yearsFromNow)}`;
    } else if (death) {
      return `Mort il y a ${DateFormatter.formatYearsToGeological(death.numericValues.yearsFromNow)}`;
    }
    
    return 'Dates inconnues';
  }

  private parseWikidataDate(dateString: string): string | undefined {
    if (!dateString) return undefined;
    return dateString.trim();
  }

  private formatPeriodDate(start?: string, end?: string): string {
    if (!start) return 'Date inconnue';
    
    if (!end) {
      const result = DateFormatter.processDate(start);
      return `Il y a ${result.geological}`;
    }
    
    const startResult = DateFormatter.processDate(start);
    const endResult = DateFormatter.processDate(end);
    
    // Calculer la durée
    const duration = Math.abs(endResult.numericValues.year - startResult.numericValues.year);
    const durationFormatted = DateFormatter.formatYearsToGeological(duration);
    
    // Calculer le "il y a" depuis la fin
    const yearsAgo = endResult.numericValues.yearsFromNow;
    const yearsAgoFormatted = DateFormatter.formatYearsToGeological(yearsAgo);
    
    return `${durationFormatted} (il y a ${yearsAgoFormatted})`;
  }

  private formatEventDate(date?: string): string {
    if (!date) return 'Date inconnue';
    const result = DateFormatter.processDate(date);
    
    // Pour les dates géologiques, utiliser le format Ga/Ma/ka
    if (result.geological.includes('Ga') || result.geological.includes('Ma') || result.geological.includes('ka')) {
      return `Il y a ${result.geological}`;
    }
    
    // Pour les dates récentes, utiliser le nombre d'années écoulées
    return `Il y a ${result.numericValues.yearsFromNow} ans`;
  }

  public clearCache(): void {
    this.searchCache.clear();
  }

  public isSearchInProgress(): boolean {
    return this.isSearching;
  }
} 