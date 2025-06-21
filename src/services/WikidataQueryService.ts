import axios from 'axios';
import type { Period, WikidataResponse, WikidataBinding, TemporalLocation } from '../types/geological';
import { MAIN_EONS } from '../types/geological';
import { DateFormatter } from '../utils/dateFormatter';

const WIKIDATA_API_URL = '/api/wikidata/sparql';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 seconde
const REQUEST_TIMEOUT = 30000; // 30 secondes

export class WikidataQueryService {
  private static instance: WikidataQueryService;
  private defaultLanguages: string[];
  private dateFormatter: DateFormatter;

  private constructor() {
    this.defaultLanguages = ['fr', 'en'];
    this.dateFormatter = new DateFormatter();
  }

  static getInstance(): WikidataQueryService {
    if (!WikidataQueryService.instance) {
      WikidataQueryService.instance = new WikidataQueryService();
    }
    return WikidataQueryService.instance;
  }

  private buildTemporalQuery(periodId: string): string {
    return `
      SELECT ?item ?itemLabel ?itemDescriptionfr ?itemDescriptionen ?startDate ?endDate ?inceptionDate ?replacedByDate WHERE {
        VALUES ?item { wd:${periodId} }

        # Dates directes (P580/P582) - priorité haute
        OPTIONAL { ?item wdt:P580 ?startDate. }
        OPTIONAL { ?item wdt:P582 ?endDate. }

        # Dates via qualificateurs de P31 (instance of) - fallback
        OPTIONAL {
          ?item p:P31 ?statement.
          ?statement ps:P31 ?class.
          OPTIONAL { ?statement pq:P580 ?startDateQualifier. }
          OPTIONAL { ?statement pq:P582 ?endDateQualifier. }
        }

        # Date d'inception (P571) - fallback pour startDate
        OPTIONAL { ?item wdt:P571 ?inceptionDate. }

        # Date de remplacement (P1366 + P585) - fallback pour endDate
        OPTIONAL {
          ?item p:P1366 ?replacedByStatement.
          ?replacedByStatement ps:P1366 ?replacedBy.
          OPTIONAL { ?replacedByStatement pq:P585 ?replacedByDate. }
        }

        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "fr,en".
          ?item rdfs:label ?itemLabel.
        }
        
        OPTIONAL {
          ?item schema:description ?itemDescriptionfr.
          FILTER(LANG(?itemDescriptionfr) = "fr")
        }
        OPTIONAL {
          ?item schema:description ?itemDescriptionen.
          FILTER(LANG(?itemDescriptionen) = "en")
        }
      }
    `;
  }

  private buildChildrenQuery(periodId: string): string {
    return `
      SELECT DISTINCT 
        ?child ?childLabel
        (COUNT(DISTINCT ?grandChild) AS ?childCount)
      WHERE {
        ?child wdt:P361 wd:${periodId}.
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
          ?child rdfs:label ?childLabel.
        }
        OPTIONAL {
          ?grandChild wdt:P361 ?child.
        }
      }
      GROUP BY ?child ?childLabel
    `;
  }

  private isValidPeriod(binding: WikidataBinding): boolean {
    // Vérification de la présence d'au moins une date
    const hasStartDate = !!binding.startDate?.value;
    const hasEndDate = !!binding.endDate?.value;
    
    if (!hasStartDate && !hasEndDate) {
      return false;
    }

    // Vérification du label
    if (!binding.itemLabelFr?.value && !binding.itemLabelEn?.value) {
      return false;
    }

    return true;
  }

  private transformToPeriod(binding: WikidataBinding): Period | null {
    console.log('[WikidataQueryService] Transformation du binding:', binding);
    
    if (!binding.item?.value) {
      console.log('[WikidataQueryService] Pas de valeur item dans le binding');
      return null;
    }

    const periodId = binding.item.value.split('/').pop() || '';
    const locations = new Set<string>();

    // Debug des dates
    console.log('[WikidataQueryService] Debug des dates:');
    console.log('  - startDate:', binding.startDate?.value);
    console.log('  - endDate:', binding.endDate?.value);
    console.log('  - startDate type:', typeof binding.startDate?.value);
    console.log('  - startDate length:', binding.startDate?.value?.length);
    console.log('  - startDate trimmed:', binding.startDate?.value?.trim());
    console.log('  - endDate type:', typeof binding.endDate?.value);
    console.log('  - endDate length:', binding.endDate?.value?.length);
    console.log('  - endDate trimmed:', binding.endDate?.value?.trim());

    // Créer les données temporelles avec les dates disponibles
    const temporalData: TemporalLocation[] = [{
      startDate: (binding.startDate?.value && binding.startDate.value.trim() !== '') ? binding.startDate.value : '',
      endDate: (binding.endDate?.value && binding.endDate.value.trim() !== '') ? binding.endDate.value : 'TODAY',
      location: "Globale"
    }];

    console.log('[WikidataQueryService] Date de fin finale:', temporalData[0].endDate);

    // Gestion des labels et descriptions
    const label = {
      fr: binding.itemLabel?.value || '',
      en: binding.itemLabel?.value || ''
    };
    const description = {
      fr: binding.itemDescriptionfr?.value || '',
      en: binding.itemDescriptionen?.value || ''
    };

    console.log('[WikidataQueryService] Données extraites:', {
      periodId,
      label,
      description,
      temporalData,
      locations: Array.from(locations)
    });

    if (!label.fr && !label.en) {
      console.log('[WikidataQueryService] Pas de label trouvé');
      return null;
    }

    // Créer la période avec les données de base
    const period: Period = {
      id: periodId,
      label,
      description,
      temporalData,
      hasChildren: false,
      isMainEon: this.isMainEon(periodId),
      categoryIds: [],
      categoryLabels: [],
      children: [],
      loading: false,
      childrenPreloaded: false,
      locations: Array.from(locations),
      directLocations: Array.from(locations)
    };

    return period;
  }

  private transformChildToPeriod(binding: WikidataBinding): Period {
    const periodId = binding.child?.value.split('/').pop() || '';
    
    return {
      id: periodId,
      label: { fr: binding.childLabel?.value || '', en: binding.childLabel?.value || '' },
      description: {
        fr: '',
        en: ''
      },
      temporalData: [],
      hasChildren: parseInt(binding.childCount?.value || '0') > 0,
      isMainEon: this.isMainEon(periodId),
      categoryIds: [],
      categoryLabels: [],
      children: [],
      loading: false,
      childrenPreloaded: false,
      locations: [],
      directLocations: []
    };
  }

  private isMainEon(id: string): boolean {
    return Object.values(MAIN_EONS).includes(id as any);
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

  async loadPeriod(periodId: string): Promise<Period> {
    return this.retryOperation(async () => {
      try {
        const query = this.buildTemporalQuery(periodId);
        console.log('[WikidataQueryService] Requête SPARQL:', query);

        const temporalResponse = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { query, format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        console.log('[WikidataQueryService] Réponse Wikidata brute:', temporalResponse.data);

        if (!temporalResponse.data?.results?.bindings?.length) {
          throw new Error(`Aucune donnée trouvée pour la période ${periodId}`);
        }

        // Extraire les dates des différents bindings
        let startDate = '';
        let endDate = '';
        let itemLabel = '';
        let itemDescriptionFr = '';
        let itemDescriptionEn = '';
        let inceptionDate = '';
        let replacedByDate = '';
        
        temporalResponse.data.results.bindings.forEach(binding => {
          if (binding.itemLabel?.value && !itemLabel) {
            itemLabel = binding.itemLabel.value;
          }
          if (binding.itemDescriptionfr?.value && !itemDescriptionFr) {
            itemDescriptionFr = binding.itemDescriptionfr.value;
          }
          if (binding.itemDescriptionen?.value && !itemDescriptionEn) {
            itemDescriptionEn = binding.itemDescriptionen.value;
          }
          if (binding.inceptionDate?.value && !inceptionDate) {
            inceptionDate = binding.inceptionDate.value;
          }
          if (binding.replacedByDate?.value && !replacedByDate) {
            replacedByDate = binding.replacedByDate.value;
          }
          // Pour startDate, priorité aux dates directes (P580), puis qualificateurs, puis inception
          if (binding.startDate?.value) {
            if (!startDate || binding.startDate.value < startDate) {
              startDate = binding.startDate.value;
            }
          }
          if (binding.startDateQualifier?.value && !startDate) {
            if (!startDate || binding.startDateQualifier.value < startDate) {
              startDate = binding.startDateQualifier.value;
            }
          }
          // Pour endDate, priorité aux dates directes (P582), puis qualificateurs
          if (binding.endDate?.value) {
            if (!endDate || binding.endDate.value > endDate) {
              endDate = binding.endDate.value;
            }
          }
          if (binding.endDateQualifier?.value && !endDate) {
            if (!endDate || binding.endDateQualifier.value > endDate) {
              endDate = binding.endDateQualifier.value;
            }
          }
        });

        // Utiliser inceptionDate comme fallback pour startDate si aucune date de début n'est trouvée
        if (!startDate && inceptionDate) {
          startDate = inceptionDate;
        }

        // Utiliser replacedByDate comme fallback pour endDate si aucune date de fin n'est trouvée
        if (!endDate && replacedByDate) {
          endDate = replacedByDate;
        }

        console.log('[WikidataQueryService] Dates extraites:', { startDate, endDate, inceptionDate, replacedByDate, itemLabel, itemDescriptionFr, itemDescriptionEn });

        // Créer la période avec les données extraites
        const period: Period = {
          id: periodId,
          label: {
            fr: itemLabel,
            en: itemLabel
          },
          description: {
            fr: itemDescriptionFr,
            en: itemDescriptionEn
          },
          temporalData: [{
            startDate: startDate,
            endDate: endDate || 'TODAY',
            location: "Globale"
          }],
          hasChildren: false,
          isMainEon: this.isMainEon(periodId),
          categoryIds: [],
          categoryLabels: [],
          children: [],
          loading: false,
          childrenPreloaded: false,
          locations: [],
          directLocations: []
        };

        console.log('[WikidataQueryService] Période créée:', period);

        // Charger les enfants
        const childrenResponse = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { query: this.buildChildrenQuery(periodId), format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        console.log('[WikidataQueryService] Réponse enfants brute:', childrenResponse.data);

        // 5. Charger les données temporelles pour chaque enfant
        const childrenPromises = childrenResponse.data.results.bindings.map(async binding => {
          const childId = binding.child?.value.split('/').pop() || '';
          
          // Charger les données temporelles de l'enfant
          const childTemporalResponse = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
            params: { query: this.buildTemporalQuery(childId), format: 'json' },
            timeout: REQUEST_TIMEOUT,
            headers: { 'Accept': 'application/sparql-results+json' }
          });

          // Extraire les dates de l'enfant
          let childStartDate = '';
          let childEndDate = '';
          let childLabel = '';
          let childDescriptionFr = '';
          let childDescriptionEn = '';
          let childInceptionDate = '';
          let childReplacedByDate = '';
          
          childTemporalResponse.data.results.bindings.forEach(childBinding => {
            if (childBinding.itemLabel?.value && !childLabel) {
              childLabel = childBinding.itemLabel.value;
            }
            if (childBinding.itemDescriptionfr?.value && !childDescriptionFr) {
              childDescriptionFr = childBinding.itemDescriptionfr.value;
            }
            if (childBinding.itemDescriptionen?.value && !childDescriptionEn) {
              childDescriptionEn = childBinding.itemDescriptionen.value;
            }
            if (childBinding.inceptionDate?.value && !childInceptionDate) {
              childInceptionDate = childBinding.inceptionDate.value;
            }
            if (childBinding.replacedByDate?.value && !childReplacedByDate) {
              childReplacedByDate = childBinding.replacedByDate.value;
            }
            // Pour startDate, priorité aux dates directes (P580), puis qualificateurs, puis inception
            if (childBinding.startDate?.value) {
              if (!childStartDate || childBinding.startDate.value < childStartDate) {
                childStartDate = childBinding.startDate.value;
              }
            }
            if (childBinding.startDateQualifier?.value && !childStartDate) {
              if (!childStartDate || childBinding.startDateQualifier.value < childStartDate) {
                childStartDate = childBinding.startDateQualifier.value;
              }
            }
            // Pour endDate, priorité aux dates directes (P582), puis qualificateurs
            if (childBinding.endDate?.value) {
              if (!childEndDate || childBinding.endDate.value > childEndDate) {
                childEndDate = childBinding.endDate.value;
              }
            }
            if (childBinding.endDateQualifier?.value && !childEndDate) {
              if (!childEndDate || childBinding.endDateQualifier.value > childEndDate) {
                childEndDate = childBinding.endDateQualifier.value;
              }
            }
          });

          // Utiliser inceptionDate comme fallback pour startDate si aucune date de début n'est trouvée
          if (!childStartDate && childInceptionDate) {
            childStartDate = childInceptionDate;
          }

          // Utiliser replacedByDate comme fallback pour endDate si aucune date de fin n'est trouvée
          if (!childEndDate && childReplacedByDate) {
            childEndDate = childReplacedByDate;
          }

          return {
            id: childId,
            label: {
              fr: childLabel,
              en: childLabel
            },
            description: {
              fr: childDescriptionFr,
              en: childDescriptionEn
            },
            temporalData: [{
              startDate: childStartDate,
              endDate: childEndDate || 'TODAY',
              location: "Globale"
            }],
            hasChildren: parseInt(binding.childCount?.value || '0') > 0,
            isMainEon: this.isMainEon(childId),
            categoryIds: [],
            categoryLabels: [],
            children: [],
            loading: false,
            childrenPreloaded: false,
            locations: [],
            directLocations: []
          };
        });

        const children = await Promise.all(childrenPromises);

        // 6. Retourner la période avec ses enfants
        const result = {
          ...period,
          children,
          childrenPreloaded: true
        };

        console.log('[WikidataQueryService] Résultat final:', result);
        return result;
      } catch (error) {
        console.error(`[Debug] Erreur lors du chargement de la période ${periodId}:`, error);
        throw error;
      }
    });
  }

  private groupPeriodsByLocation(periods: Period[]): Period[] {
    if (periods.length === 0) {
      return [];
    }

    // Si la période n'a pas de données temporelles, la retourner telle quelle
    if (periods[0].temporalData.length === 0) {
      return [periods[0]];
    }

    const locationGroups = new Map<string, Period>();

    periods.forEach(period => {
      period.temporalData.forEach(temporal => {
        const location = temporal.location;
        if (!locationGroups.has(location)) {
          locationGroups.set(location, {
            ...period,
            temporalData: [],
            locations: [location],
            directLocations: [location]
          });
        }
        const groupedPeriod = locationGroups.get(location)!;
        groupedPeriod.temporalData.push(temporal);
      });
    });

    return Array.from(locationGroups.values());
  }

  private buildStoryQuery(storyId: string): string {
    return `
      SELECT DISTINCT 
        ?item ?itemLabel 
        ?startDate ?endDate 
        ?startLocationLabel ?endLocationLabel
        (COUNT(DISTINCT ?child) AS ?childCount)
      WHERE {
        VALUES ?item { wd:${storyId} }
        
        # Filtrage : au moins une date doit exister
        {
          ?item p:P580 ?startStatement.
          ?startStatement ps:P580 ?startDate.
        } UNION {
          ?item p:P582 ?endStatement.
          ?endStatement ps:P582 ?endDate.
        }
        
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

        # Enfants (éons principaux)
        VALUES ?child {
          wd:${MAIN_EONS.PHANEROZOIC}
          wd:${MAIN_EONS.PROTEROZOIC}
          wd:${MAIN_EONS.ARCHEAN}
          wd:${MAIN_EONS.HADEAN}
        }
        ?child wdt:P361 ?item.
      }
      GROUP BY ?item ?itemLabel ?startDate ?endDate ?startLocationLabel ?endLocationLabel
      ORDER BY ?startDate
    `;
  }

  async loadStory(storyId: string): Promise<Period> {
    return this.retryOperation(async () => {
      try {
        const storyResponse = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { query: this.buildStoryQuery(storyId), format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        if (!storyResponse.data?.results?.bindings?.length) {
          throw new Error(`Aucune donnée trouvée pour la story ${storyId}`);
        }

        // Transformation de la story
        const story = this.transformToPeriod(storyResponse.data.results.bindings[0]);
        if (!story) {
          throw new Error(`Story invalide pour ${storyId}`);
        }

        // Charger les éons principaux
        const mainEons = await Promise.all([
          this.loadPeriod(MAIN_EONS.PHANEROZOIC),
          this.loadPeriod(MAIN_EONS.PROTEROZOIC),
          this.loadPeriod(MAIN_EONS.ARCHEAN),
          this.loadPeriod(MAIN_EONS.HADEAN)
        ]);

        return {
          ...story,
          children: mainEons,
          childrenPreloaded: true
        };
      } catch (error) {
        console.error(`[Debug] Erreur lors du chargement de la story ${storyId}:`, error);
        throw error;
      }
    });
  }

  // Charger un événement depuis Wikidata par Q-id
  async loadEvent(eventId: string): Promise<{ label: string | { fr?: string; en?: string }, description?: { fr: string, en: string }, date?: string }> {
    return this.retryOperation(async () => {
      try {
        const query = `
          SELECT DISTINCT 
            ?item ?itemLabel 
            ?descriptionfr
            ?descriptionen
            ?startDate
            ?endDate
            ?pointInTime
            ?birthDate
            ?earliestDate
            ?historicalEvent
          WHERE {
            VALUES ?item { wd:${eventId} }
            
            SERVICE wikibase:label { 
              bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
              ?item rdfs:label ?itemLabel.
            }

            OPTIONAL {
              ?item schema:description ?descriptionfr.
              FILTER(LANG(?descriptionfr) = "fr")
            }
            OPTIONAL {
              ?item schema:description ?descriptionen.
              FILTER(LANG(?descriptionen) = "en")
            }

            # Dates principales
            OPTIONAL { ?item wdt:P580 ?startDate. }    # Date de début
            OPTIONAL { ?item wdt:P582 ?endDate. }      # Date de fin
            OPTIONAL { ?item wdt:P585 ?pointInTime. }  # Point dans le temps
            OPTIONAL { ?item wdt:P569 ?birthDate. }    # Date de naissance
            OPTIONAL { ?item wdt:P1319 ?earliestDate. } # Date la plus ancienne
            OPTIONAL { ?item wdt:P837 ?historicalEvent. }
          }
        `;

        const response = await axios.get<WikidataResponse>(WIKIDATA_API_URL, {
          params: { query, format: 'json' },
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/sparql-results+json' }
        });

        if (!response.data?.results?.bindings?.length) {
          throw new Error(`Aucune donnée trouvée pour l'événement ${eventId}`);
        }

        const binding = response.data.results.bindings[0];
        console.log('[WikidataQueryService] Binding événement Wikidata:', binding);
        
        // Choisir la première date disponible dans l'ordre de priorité
        let eventDate = '';
        if (binding.startDate?.value) {
          eventDate = binding.startDate.value;
        } else if (binding.endDate?.value) {
          eventDate = binding.endDate.value;
        } else if (binding.pointInTime?.value) {
          eventDate = binding.pointInTime.value;
        } else if (binding.birthDate?.value) {
          eventDate = binding.birthDate.value;
        } else if (binding.earliestDate?.value) {
          eventDate = binding.earliestDate.value;
        }

        return {
          label: binding.itemLabel?.value || '',
          description: {
            fr: binding['descriptionfr']?.value || binding['descriptionFr']?.value || '',
            en: binding['descriptionen']?.value || binding['descriptionEn']?.value || ''
          },
          date: eventDate
        };
      } catch (error) {
        console.error('Erreur lors du chargement de l\'événement:', error);
        throw error;
      }
    });
  }
} 