import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WikidataQueryService } from '../WikidataQueryService';
import axios from 'axios';
import type { Period } from '../../types/geological';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as unknown as { get: jest.Mock };

describe('WikidataQueryService', () => {
  let service: WikidataQueryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = WikidataQueryService.getInstance();
  });

  describe('Singleton', () => {
    it('devrait être un singleton', () => {
      const instance1 = WikidataQueryService.getInstance();
      const instance2 = WikidataQueryService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Chargement des périodes', () => {
    it('devrait charger une période avec ses données temporelles', async () => {
      const mockResponse = {
        data: {
          results: {
            bindings: [
              {
                item: { value: 'http://www.wikidata.org/entity/Q123' },
                itemLabel: { value: 'Test Period' },
                startDate: { value: '541000000' },
                endDate: { value: '485400000' },
                startLocationLabel: { value: 'Location 1' },
                endLocationLabel: { value: 'Location 2' },
                childCount: { value: '1' }
              }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await service.loadPeriod('Q123');

      expect(result).toBeDefined();
      expect(result.id).toBe('Q123');
      expect(result.label).toBe('Test Period');
      expect(result.temporalData).toHaveLength(2);
      expect(result.hasChildren).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('devrait gérer les erreurs de chargement', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.loadPeriod('Q123')).rejects.toThrow('Network error');
    });

    it('devrait gérer les données manquantes', async () => {
      const mockResponse = {
        data: {
          results: {
            bindings: [
              {
                item: { value: 'http://www.wikidata.org/entity/Q123' },
                itemLabel: { value: '' },
                childCount: { value: '0' }
              }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await service.loadPeriod('Q123');
      expect(result).toBeDefined();
      expect(result.id).toBe('Q123');
      expect(result.label).toBe('');
      expect(result.hasChildren).toBe(false);
      expect(result.temporalData).toHaveLength(0);
    });
  });

  describe('Chargement des stories', () => {
    it('devrait charger une story avec ses éons principaux', async () => {
      const mockResponse = {
        data: {
          results: {
            bindings: [
              {
                item: { value: 'http://www.wikidata.org/entity/Q123' },
                itemLabel: { value: 'Test Story' },
                startDate: { value: '541000000' },
                endDate: { value: '0' },
                childCount: { value: '4' }
              }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await service.loadStory('Q123');

      expect(result).toBeDefined();
      expect(result.id).toBe('Q123');
      expect(result.label).toBe('Test Story');
      expect(result.hasChildren).toBe(true);
      expect(result.children).toHaveLength(4);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('devrait gérer les erreurs de chargement des stories', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.loadStory('Q123')).rejects.toThrow('Network error');
    });
  });
}); 