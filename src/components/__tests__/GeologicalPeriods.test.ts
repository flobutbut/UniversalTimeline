import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import GeologicalPeriods from '../GeologicalPeriods.vue';
import { WikidataTimelineService } from '../../services/wikidataTimeline';

vi.mock('../../services/wikidataTimeline', () => {
  const mockService = {
    loadPeriod: vi.fn()
  };
  return {
    WikidataTimelineService: {
      getInstance: () => mockService
    }
  };
});

describe('GeologicalPeriods', () => {
  let mockService: { loadPeriod: any };

  beforeEach(() => {
    mockService = WikidataTimelineService.getInstance();
    vi.clearAllMocks();
  });

  it('should render loading state initially', async () => {
    mockService.loadPeriod.mockImplementation(() => new Promise(() => {}));
    const wrapper = mount(GeologicalPeriods);
    
    expect(wrapper.find('.loading').exists()).toBe(true);
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.text()).toContain('Chargement des données');
  });

  it('should render periods when data is loaded', async () => {
    const mockData = {
      id: '1',
      label: 'Test Period',
      temporalData: [
        {
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          location: 'Test Location'
        }
      ],
      hasChildren: true,
      isMainEon: false,
      categoryIds: [],
      categoryLabels: [],
      children: [],
      loading: false,
      childrenPreloaded: false,
      locations: ['Test Location'],
      directLocations: ['Test Location']
    };

    mockService.loadPeriod.mockResolvedValue(mockData);
    const wrapper = mount(GeologicalPeriods);
    await flushPromises();

    expect(wrapper.find('.loading').exists()).toBe(false);
    expect(wrapper.text()).toContain('Test Period');
  });

  it('should render error state with retry button when API call fails', async () => {
    mockService.loadPeriod.mockRejectedValueOnce(new Error('Service temporairement indisponible'));

    const wrapper = mount(GeologicalPeriods);
    await flushPromises();

    expect(wrapper.find('.error').exists()).toBe(true);
    expect(wrapper.find('.retry-button').exists()).toBe(true);
    expect(wrapper.text()).toContain('Une erreur est survenue');
  });

  it('should handle different error cases', async () => {
    const testCases = [
      { error: new Error('Service temporairement indisponible') },
      { error: new Error('Trop de requêtes') },
      { error: new Error('Endpoint non trouvé') },
      { error: new Error('Erreur inconnue') }
    ];

    for (const testCase of testCases) {
      mockService.loadPeriod.mockRejectedValueOnce(testCase.error);
      const wrapper = mount(GeologicalPeriods);
      await flushPromises();

      expect(wrapper.find('.error').exists()).toBe(true);
      expect(wrapper.find('.retry-button').exists()).toBe(true);
    }
  });

  it('should change language and reload data', async () => {
    mockService.loadPeriod.mockResolvedValueOnce({
      id: '1',
      label: 'Période Test',
      temporalData: [],
      hasChildren: false,
      isMainEon: false,
      categoryIds: [],
      categoryLabels: [],
      children: [],
      loading: false,
      childrenPreloaded: false,
      locations: [],
      directLocations: []
    });

    const wrapper = mount(GeologicalPeriods);
    await flushPromises();

    mockService.loadPeriod.mockResolvedValueOnce({
      id: '1',
      label: 'Test Period',
      temporalData: [],
      hasChildren: false,
      isMainEon: false,
      categoryIds: [],
      categoryLabels: [],
      children: [],
      loading: false,
      childrenPreloaded: false,
      locations: [],
      directLocations: []
    });

    await wrapper.setData({ selectedLanguage: 'en' });
    await flushPromises();

    expect(mockService.loadPeriod).toHaveBeenLastCalledWith(
      expect.objectContaining({
        language: 'en'
      })
    );
  });
}); 