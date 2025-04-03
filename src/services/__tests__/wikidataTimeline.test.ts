import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { WikidataQueryService } from '../WikidataQueryService';
import type { WikidataResponse } from '../../types/geological';

vi.mock('axios');
const mockedAxios = axios as unknown as { get: jest.Mock };

describe('WikidataQueryService', () => {
  let service: WikidataQueryService;
  const mockResponse = {
    results: {
      bindings: [
        {
          item: { value: 'Q1' },
          itemLabel: { value: 'Test Period' },
          startDate: { value: '2023-01-01' },
          endDate: { value: '2023-12-31' },
          startLocationLabel: { value: 'Location 1' },
          endLocationLabel: { value: 'Location 2' },
          childCount: { value: '2' }
        }
      ]
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = WikidataQueryService.getInstance();
  });

  it('should be a singleton', () => {
    const instance1 = WikidataQueryService.getInstance();
    const instance2 = WikidataQueryService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should load period with temporal data', async () => {
    (axios.get as any).mockResolvedValueOnce({ data: mockResponse });

    const result = await service.loadPeriod('Q1');

    expect(axios.get).toHaveBeenCalledWith(
      '/api/wikidata/sparql',
      expect.objectContaining({
        params: expect.objectContaining({
          format: 'json',
          query: expect.stringContaining('SELECT DISTINCT')
        })
      })
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('Q1');
    expect(result.label).toBe('Test Period');
    expect(result.temporalData).toHaveLength(2);
    expect(result.hasChildren).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    (axios.get as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(service.loadPeriod('Q1')).rejects.toThrow('Network error');
  });
}); 