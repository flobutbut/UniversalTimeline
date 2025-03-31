import { ProgressiveLoadingServiceImpl } from '../ProgressiveLoadingService';
import { WikidataTimelineService } from '../wikidataTimeline';
import type { Period } from '../../types/geological';
import type { LoadingState, LoadingConfig } from '../../types/progressiveLoading';

// Mock WikidataTimelineService
const mockGetPeriod = jest.fn();
const mockGetChildren = jest.fn();

jest.mock('../wikidataTimeline', () => ({
  WikidataTimelineService: {
    getInstance: jest.fn().mockReturnValue({
      getPeriod: mockGetPeriod,
      getChildren: mockGetChildren
    })
  }
}));

describe('ProgressiveLoadingService', () => {
  let service: ProgressiveLoadingServiceImpl;
  let mockPeriod: Period;

  beforeEach(() => {
    service = ProgressiveLoadingServiceImpl.getInstance();
    mockPeriod = {
      id: 'Q123',
      label: 'Test Period',
      hasChildren: true,
      isMainEon: false,
      categoryIds: [],
      categoryLabels: [],
      childrenPreloaded: false,
      children: [],
      loading: false,
      startDate: '541000000',
      endDate: '485400000',
      location: 'Global'
    };
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('devrait utiliser la configuration par défaut', () => {
      const config = service.getConfig();
      expect(config.maxConcurrentRequests).toBe(3);
      expect(config.preloadThreshold).toBe(0.8);
      expect(config.priorityLevels.visible).toBe(1);
      expect(config.priorityLevels.preload).toBe(2);
      expect(config.priorityLevels.background).toBe(3);
    });

    it('devrait mettre à jour la configuration', () => {
      const newConfig: Partial<LoadingConfig> = {
        maxConcurrentRequests: 5,
        preloadThreshold: 0.9
      };
      service.updateConfig(newConfig);
      const config = service.getConfig();
      expect(config.maxConcurrentRequests).toBe(5);
      expect(config.preloadThreshold).toBe(0.9);
    });
  });

  describe('Chargement des périodes', () => {
    it('devrait charger une période avec succès', async () => {
      mockGetPeriod.mockResolvedValue(mockPeriod);

      await service.loadPeriod('Q123');
      const state = service.getLoadingState('Q123');

      expect(state.loading).toBe(false);
      expect(state.progress).toBe(100);
      expect(state.error).toBeNull();
      expect(state.startTime).not.toBeNull();
      expect(state.endTime).not.toBeNull();
    });

    it('devrait gérer les erreurs de chargement', async () => {
      const error = new Error('Failed to load period');
      mockGetPeriod.mockRejectedValue(error);

      await service.loadPeriod('Q123');
      const state = service.getLoadingState('Q123');

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });

    it('ne devrait pas charger une période déjà en cours de chargement', async () => {
      mockGetPeriod.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      service.loadPeriod('Q123');
      await service.loadPeriod('Q123');

      expect(mockGetPeriod).toHaveBeenCalledTimes(1);
    });
  });

  describe('Chargement des enfants', () => {
    it('devrait charger les enfants avec succès', async () => {
      const mockChildren = [mockPeriod];
      mockGetChildren.mockResolvedValue(mockChildren);

      await service.loadChildren('Q123');
      const state = service.getLoadingState('Q123');

      expect(state.loading).toBe(false);
      expect(state.progress).toBe(100);
      expect(state.error).toBeNull();
      expect(state.startTime).not.toBeNull();
      expect(state.endTime).not.toBeNull();
    });

    it('devrait gérer les erreurs de chargement des enfants', async () => {
      const error = new Error('Failed to load children');
      mockGetChildren.mockRejectedValue(error);

      await service.loadChildren('Q123');
      const state = service.getLoadingState('Q123');

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Gestion de la file d\'attente', () => {
    it('devrait respecter la limite de requêtes concurrentes', async () => {
      mockGetPeriod.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      // Charger 4 périodes (limite = 3)
      service.loadPeriod('Q1');
      service.loadPeriod('Q2');
      service.loadPeriod('Q3');
      service.loadPeriod('Q4');

      const stats = service.getStats();
      expect(stats.activeRequests).toBe(3);
      expect(stats.queueSize).toBe(1);
    });

    it('devrait traiter les requêtes dans l\'ordre de priorité', async () => {
      mockGetPeriod.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      // Charger avec différentes priorités
      service.loadPeriod('Q1', 'background');
      service.loadPeriod('Q2', 'visible');
      service.loadPeriod('Q3', 'preload');

      const stats = service.getStats();
      expect(stats.queueSize).toBe(3);
    });
  });

  describe('Statistiques', () => {
    it('devrait mettre à jour les statistiques correctement', async () => {
      mockGetPeriod.mockResolvedValue(mockPeriod);

      await service.loadPeriod('Q123');
      const stats = service.getStats();

      expect(stats.totalRequests).toBe(1);
      expect(stats.completedRequests).toBe(1);
      expect(stats.failedRequests).toBe(0);
      expect(stats.averageLoadTime).toBeGreaterThan(0);
      expect(stats.queueSize).toBe(0);
      expect(stats.activeRequests).toBe(0);
    });

    it('devrait gérer les erreurs dans les statistiques', async () => {
      const error = new Error('Failed to load period');
      mockGetPeriod.mockRejectedValue(error);

      await service.loadPeriod('Q123');
      const stats = service.getStats();

      expect(stats.totalRequests).toBe(1);
      expect(stats.completedRequests).toBe(0);
      expect(stats.failedRequests).toBe(1);
    });
  });

  describe('Monitoring des états', () => {
    it('devrait fournir l\'état de chargement correct', async () => {
      mockGetPeriod.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      service.loadPeriod('Q123');
      const state = service.getLoadingState('Q123');

      expect(state.loading).toBe(true);
      expect(state.progress).toBe(0);
      expect(state.error).toBeNull();
      expect(state.startTime).not.toBeNull();
      expect(state.endTime).toBeNull();
    });

    it('devrait mettre à jour l\'état après le chargement', async () => {
      mockGetPeriod.mockResolvedValue(mockPeriod);

      await service.loadPeriod('Q123');
      const state = service.getLoadingState('Q123');

      expect(state.loading).toBe(false);
      expect(state.progress).toBe(100);
      expect(state.error).toBeNull();
      expect(state.startTime).not.toBeNull();
      expect(state.endTime).not.toBeNull();
    });
  });
}); 