import { WikidataTimelineService } from '../wikidataTimeline';
import { CacheService } from '../CacheService';
import axios from 'axios';
import type { Period, SimplePeriod } from '../../types/geological';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WikidataTimelineService', () => {
  let service: WikidataTimelineService;
  let mockCache: CacheService;

  beforeEach(() => {
    mockCache = new CacheService({ duration: 1000, maxSize: 10 });
    service = WikidataTimelineService.getInstance();
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('devrait utiliser la langue par défaut', () => {
      expect(service.getCurrentLanguage()).toBe('fr');
    });

    it('devrait changer la langue', () => {
      service.setLanguage('en');
      expect(service.getCurrentLanguage()).toBe('en');
    });
  });

  describe('Chargement des éons', () => {
    it('devrait charger les éons principaux', async () => {
      const mockResponse = {
        data: {
          results: {
            bindings: [
              {
                item: { value: 'http://www.wikidata.org/entity/Q123' },
                itemLabel: { value: 'Phanérozoïque' },
                childCount: { value: '1' }
              }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getMainEons();
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Phanérozoïque');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('devrait gérer les erreurs de chargement', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getMainEons()).rejects.toThrow('Network error');
    });
  });

  describe('Chargement des enfants', () => {
    it('devrait charger les enfants d\'une période', async () => {
      const mockResponse = {
        data: {
          results: {
            bindings: [
              {
                item: { value: 'http://www.wikidata.org/entity/Q456' },
                itemLabel: { value: 'Cambrien' },
                childCount: { value: '0' }
              }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getChildren('Q123');
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Cambrien');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner un tableau vide si pas d\'enfants', async () => {
      const mockResponse = {
        data: {
          results: {
            bindings: []
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getChildren('Q123');
      expect(result).toHaveLength(0);
    });
  });

  describe('Cache', () => {
    it('devrait utiliser le cache pour les requêtes répétées', async () => {
      const mockResponse = {
        data: {
          results: {
            bindings: [
              {
                item: { value: 'http://www.wikidata.org/entity/Q123' },
                itemLabel: { value: 'Test Period' },
                childCount: { value: '0' }
              }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      // Premier appel
      await service.getPeriod('Q123');
      // Deuxième appel (devrait utiliser le cache)
      await service.getPeriod('Q123');

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('devrait expirer le cache après la durée configurée', async () => {
      const mockResponse = {
        data: {
          results: {
            bindings: [
              {
                item: { value: 'http://www.wikidata.org/entity/Q123' },
                itemLabel: { value: 'Test Period' },
                childCount: { value: '0' }
              }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      // Premier appel
      await service.getPeriod('Q123');
      
      // Attendre que le cache expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Deuxième appel (devrait refaire la requête)
      await service.getPeriod('Q123');

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Transformation des données', () => {
    it('devrait transformer correctement les données Wikidata', () => {
      const mockBinding = {
        item: { value: 'http://www.wikidata.org/entity/Q123' },
        itemLabel: { value: 'Test Period' },
        childCount: { value: '1' },
        startDate: { value: '541000000' },
        endDate: { value: '485400000' },
        locations: { value: 'Global' }
      };

      const result = service.transformResponse([mockBinding])[0];
      expect(result.id).toBe('Q123');
      expect(result.label).toBe('Test Period');
      expect(result.hasChildren).toBe(true);
      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();
      expect(result.location).toBe('Global');
    });

    it('devrait gérer les données manquantes', () => {
      const mockBinding = {
        item: { value: 'http://www.wikidata.org/entity/Q123' },
        itemLabel: { value: '' },
        childCount: { value: '0' }
      };

      const result = service.transformResponse([mockBinding])[0];
      expect(result.id).toBe('Q123');
      expect(result.label).toBe('Q123'); // Utilise l'ID comme fallback
      expect(result.hasChildren).toBe(false);
      expect(result.startDate).toBeUndefined();
      expect(result.endDate).toBeUndefined();
      expect(result.location).toBeUndefined();
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs réseau', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getPeriod('Q123')).rejects.toThrow('Network error');
    });

    it('devrait gérer les erreurs de format', async () => {
      const mockResponse = {
        data: {
          results: {
            bindings: [{}] // Données incomplètes
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getPeriod('Q123');
      expect(result).toBeDefined();
      expect(result.id).toBe('');
      expect(result.label).toBe('');
    });

    it('devrait réessayer en cas d\'échec', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({
          data: {
            results: {
              bindings: [
                {
                  item: { value: 'http://www.wikidata.org/entity/Q123' },
                  itemLabel: { value: 'Test Period' },
                  childCount: { value: '0' }
                }
              ]
            }
          }
        });

      const result = await service.getPeriod('Q123');
      expect(result).toBeDefined();
      expect(result.label).toBe('Test Period');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });
}); 