import axios from 'axios';
import type { Period, WikidataResponse, WikidataBinding } from '../types/geological';
import { MAIN_EONS, MAIN_STORY } from '../types/geological';
import { WikidataQueryService } from './WikidataQueryService';

const WIKIDATA_API_URL = '/api/wikidata/sparql';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 seconde
const REQUEST_TIMEOUT = 30000; // 30 secondes

export class StoryService {
  private static instance: StoryService;
  private defaultLanguages: string[];
  private timelineService: WikidataQueryService;

  private constructor() {
    this.defaultLanguages = ['fr', 'en'];
    this.timelineService = WikidataQueryService.getInstance();
  }

  static getInstance(): StoryService {
    if (!StoryService.instance) {
      StoryService.instance = new StoryService();
    }
    return StoryService.instance;
  }

  private buildStoryQuery(storyId: string): string {
    return `
      SELECT DISTINCT 
        ?item ?itemLabel 
        ?startDate ?endDate 
        ?startLocationLabel ?endLocationLabel
      WHERE {
        VALUES ?item { wd:${storyId} }
        
        # Labels
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
          ?item rdfs:label ?itemLabel.
        }

        # Start time avec localisations
        OPTIONAL {
          ?item p:P580 ?startStatement.
          ?startStatement ps:P580 ?startDate.
          OPTIONAL {
            ?startStatement pq:P518 ?startLocation.
            SERVICE wikibase:label { 
              bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
              ?startLocation rdfs:label ?startLocationLabel.
            }
          }
        }

        # End time avec localisations
        OPTIONAL {
          ?item p:P582 ?endStatement.
          ?endStatement ps:P582 ?endDate.
          OPTIONAL {
            ?endStatement pq:P518 ?endLocation.
            SERVICE wikibase:label { 
              bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
              ?endLocation rdfs:label ?endLocationLabel.
            }
          }
        }
      }
      ORDER BY ?startDate
    `;
  }

  private isValidStory(binding: WikidataBinding): boolean {
    // Vérification du label
    if (!binding.itemLabel?.value) {
      return false;
    }
    return true;
  }

  private transformToStory(binding: WikidataBinding): Period | null {
    // Validation des données
    if (!this.isValidStory(binding)) {
      return null;
    }

    const storyId = binding.item?.value.split('/').pop() || '';
    const startLocation = binding.startLocationLabel?.value || "Globale";
    const endLocation = binding.endLocationLabel?.value || "Globale";
    const locations = new Set([startLocation, endLocation]);

    return {
      id: storyId,
      label: binding.itemLabel?.value || '',
      description: { fr: '', en: '' },
      temporalData: [{
        startDate: binding.startDate?.value,
        endDate: binding.endDate?.value,
        location: startLocation
      }],
      hasChildren: true,
      isMainEon: false,
      categoryIds: [],
      categoryLabels: [],
      children: [],
      loading: false,
      childrenPreloaded: false,
      locations: Array.from(locations),
      directLocations: Array.from(locations)
    };
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }
    
    throw lastError;
  }

  async loadStory(storyId: string): Promise<Period> {
    return this.retryOperation(async () => {
      try {
        console.log(`[StoryService] Chargement de la story ${storyId}`);
        const storyResponse = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { query: this.buildStoryQuery(storyId), format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        console.log(`[StoryService] Réponse Wikidata pour la story ${storyId}:`, storyResponse.data);

        if (!storyResponse.data?.results?.bindings?.length) {
          throw new Error(`Aucune donnée trouvée pour la story ${storyId}`);
        }

        // Transformation de la story
        const story = this.transformToStory(storyResponse.data.results.bindings[0]);
        if (!story) {
          throw new Error(`Story invalide pour ${storyId}`);
        }

        console.log(`[StoryService] Story transformée:`, story);

        // Charger les éons principaux
        console.log(`[StoryService] Chargement des éons principaux...`);
        const mainEons = await Promise.all([
          this.timelineService.loadPeriod(MAIN_EONS.PHANEROZOIC),
          this.timelineService.loadPeriod(MAIN_EONS.PROTEROZOIC),
          this.timelineService.loadPeriod(MAIN_EONS.ARCHEAN),
          this.timelineService.loadPeriod(MAIN_EONS.HADEAN)
        ]);

        console.log(`[StoryService] Éons principaux chargés:`, mainEons.map(eon => ({
          id: eon.id,
          label: eon.label,
          childrenCount: eon.children.length
        })));

        const result = {
          ...story,
          children: mainEons,
          childrenPreloaded: true
        };

        console.log(`[StoryService] Story finale avec éons:`, {
          id: result.id,
          label: result.label,
          childrenCount: result.children.length,
          children: result.children.map(child => ({
            id: child.id,
            label: child.label
          }))
        });

        return result;
      } catch (error) {
        console.error(`[StoryService] Erreur lors du chargement de la story ${storyId}:`, error);
        throw error;
      }
    });
  }

  async loadPlanetEarth(): Promise<Period> {
    console.log(`[StoryService] Chargement de la story Planète Terre`);
    return this.loadStory(MAIN_STORY.PLANET_EARTH);
  }
} 