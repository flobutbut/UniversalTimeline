import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import { WikidataService, WikidataError } from '../wikidata';
import type { WikidataResponse } from '../../types/geological';
import { mockGeologicalPeriods } from '../../mocks/geological';
import { WikidataTimelineService } from '../wikidataTimeline';
import type { QueryOptions } from '../../types/geological';

vi.mock('axios');
const mockedAxios = axios as unknown as { get: jest.Mock };

describe('WikidataService', () => {
  let service: WikidataService;
  const mockResponse = {
    results: {
      bindings: [
        {
          item: { value: 'Q1' },
          itemLabel: { value: 'Test Period' },
          description: { value: 'Test Description' },
          startDate: { value: '2023-01-01' },
          endDate: { value: '2023-12-31' },
          parentPeriodLabel: { value: 'Parent Period' }
        }
      ]
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = WikidataService.getInstance();
  });

  it('should be a singleton', () => {
    const instance1 = WikidataService.getInstance();
    const instance2 = WikidataService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should fetch geological periods with default options', async () => {
    (axios.get as any).mockResolvedValueOnce({ data: mockResponse });

    const result = await service.getGeologicalPeriods();

    expect(axios.get).toHaveBeenCalledWith(
      'https://query.wikidata.org/sparql',
      expect.objectContaining({
        params: expect.objectContaining({
          format: 'json',
          query: expect.stringContaining('LIMIT 20')
        }),
        timeout: 10000
      })
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'Q1',
      label: 'Test Period',
      description: 'Test Description',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      parentPeriod: 'Parent Period'
    });
  });

  it('should fetch geological periods with custom options', async () => {
    (axios.get as any).mockResolvedValueOnce({ data: mockResponse });

    await service.getGeologicalPeriods({
      limit: 10,
      offset: 20,
      language: 'en'
    });

    expect(axios.get).toHaveBeenCalledWith(
      'https://query.wikidata.org/sparql',
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.stringMatching(/LIMIT 10.*OFFSET 20/s)
        })
      })
    );
  });

  it('should handle API errors with retry', async () => {
    const error503 = new Error('Service Unavailable');
    (error503 as any).response = { status: 503 };
    (axios.get as any)
      .mockRejectedValueOnce(error503)
      .mockRejectedValueOnce(error503)
      .mockResolvedValueOnce({ data: mockResponse });

    const result = await service.getGeologicalPeriods();

    expect(axios.get).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(1);
  });

  it('should handle rate limit errors', async () => {
    const error429 = new Error('Too Many Requests');
    (error429 as any).response = { status: 429 };
    (axios.get as any).mockRejectedValue(error429);

    await expect(service.getGeologicalPeriods()).rejects.toThrow(
      new WikidataError('Trop de requêtes', 'RATE_LIMIT')
    );
  });

  it('should handle invalid response data', async () => {
    (axios.get as any).mockResolvedValueOnce({ data: {} });

    await expect(service.getGeologicalPeriods()).rejects.toThrow(
      new WikidataError('Réponse invalide de l\'API Wikidata', 'INVALID_RESPONSE')
    );
  });

  it('should handle invalid period data', async () => {
    const invalidResponse = {
      results: {
        bindings: [
          {
            item: { value: 'Q1' }
            // Missing itemLabel
          }
        ]
      }
    };
    (axios.get as any).mockResolvedValueOnce({ data: invalidResponse });

    await expect(service.getGeologicalPeriods()).rejects.toThrow(
      new WikidataError('Données de période géologique invalides', 'INVALID_PERIOD_DATA')
    );
  });

  it('should handle network errors', async () => {
    const networkError = new Error('Network Error');
    (networkError as any).response = undefined;
    (axios.get as any)
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError);

    await expect(service.getGeologicalPeriods()).rejects.toThrow(
      new WikidataError('Erreur lors de la communication avec Wikidata', 'API_ERROR')
    );
    expect(axios.get).toHaveBeenCalledTimes(3);
  });

  describe('Cache System', () => {
    it('should return cached data for identical requests', async () => {
      const options = { limit: 10, offset: 0, language: 'fr' };
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: {
            bindings: mockGeologicalPeriods,
          },
        },
      });

      // First request - should call API
      const firstResult = await service.getGeologicalPeriods(options);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Second request - should use cache
      mockedAxios.get.mockClear();
      const secondResult = await service.getGeologicalPeriods(options);
      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(secondResult).toEqual(firstResult);
    });

    it('should make new API call when cache is expired', async () => {
      const options = { limit: 10, offset: 0, language: 'fr' };
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: {
            bindings: mockGeologicalPeriods,
          },
        },
      });

      // First request
      await service.getGeologicalPeriods(options);

      // Simulate cache expiration
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);

      // Second request - should call API again
      mockedAxios.get.mockClear();
      await service.getGeologicalPeriods(options);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should use different cache entries for different options', async () => {
      const options1 = { limit: 10, offset: 0, language: 'fr' };
      const options2 = { limit: 20, offset: 0, language: 'en' };

      mockedAxios.get
        .mockResolvedValueOnce({
          data: {
            results: {
              bindings: mockGeologicalPeriods.slice(0, 10),
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            results: {
              bindings: mockGeologicalPeriods.slice(0, 20),
            },
          },
        });

      // First requests
      const result1 = await service.getGeologicalPeriods(options1);
      const result2 = await service.getGeologicalPeriods(options2);

      // Second requests - should use cache
      mockedAxios.get.mockClear();
      const cachedResult1 = await service.getGeologicalPeriods(options1);
      const cachedResult2 = await service.getGeologicalPeriods(options2);

      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(cachedResult1).toEqual(result1);
      expect(cachedResult2).toEqual(result2);
    });
  });
});

describe('WikidataTimelineService', () => {
  let service: WikidataTimelineService;

  beforeEach(() => {
    service = WikidataTimelineService.getInstance();
    vi.clearAllMocks();
  });

  it('should fetch geological periods successfully', async () => {
    const mockResponse = {
      data: {
        results: {
          bindings: [
            {
              item: { value: 'Q123' },
              itemLabel: { value: 'Test Period' },
              startDate: { value: '2023-01-01' },
              endDate: { value: '2023-12-31' },
              childCount: { value: '0' }
            }
          ]
        }
      }
    };

    mockedAxios.get.mockResolvedValueOnce(mockResponse);

    const result = await service.getMainEons({ language: 'fr' });
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
  });

  it('should handle API errors', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

    await expect(service.getMainEons({ language: 'fr' })).rejects.toThrow('API Error');
  });
}); 