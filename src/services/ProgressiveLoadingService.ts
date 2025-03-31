import type { Period } from '../types/geological';
import type { LoadingState, LoadingQueueItem, LoadingConfig, LoadingStats } from '../types/progressiveLoading';
import { WikidataTimelineService } from './wikidataTimeline';

export class ProgressiveLoadingServiceImpl {
  private static instance: ProgressiveLoadingServiceImpl;
  private timelineService: WikidataTimelineService;
  private loadingStates: Map<string, LoadingState>;
  private loadingQueue: LoadingQueueItem[];
  private activeRequests: number;
  private config: LoadingConfig = {
    maxConcurrentRequests: 3,
    preloadThreshold: 0.8,
    priorityLevels: {
      visible: 1,
      preload: 2,
      background: 3
    }
  };
  private stats: LoadingStats;

  private constructor() {
    this.timelineService = WikidataTimelineService.getInstance();
    this.loadingStates = new Map();
    this.loadingQueue = [];
    this.activeRequests = 0;
    this.stats = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageLoadTime: 0,
      queueSize: 0,
      activeRequests: 0
    };
  }

  static getInstance(): ProgressiveLoadingServiceImpl {
    if (!ProgressiveLoadingServiceImpl.instance) {
      ProgressiveLoadingServiceImpl.instance = new ProgressiveLoadingServiceImpl();
    }
    return ProgressiveLoadingServiceImpl.instance;
  }

  async loadPeriod(periodId: string, priority: 'visible' | 'preload' | 'background' = 'visible'): Promise<void> {
    const state = this.getLoadingState(periodId);
    if (state.loading) return;

    this.updateLoadingState(periodId, { loading: true, progress: 0, startTime: Date.now() });
    this.addToQueue(periodId, priority, 'period');
    this.updateStats({ totalRequests: this.stats.totalRequests + 1 });

    await this.processQueue();
  }

  async loadChildren(parentId: string, priority: 'visible' | 'preload' | 'background' = 'visible'): Promise<void> {
    const state = this.getLoadingState(parentId);
    if (state.loading) return;

    this.updateLoadingState(parentId, { loading: true, progress: 0, startTime: Date.now() });
    this.addToQueue(parentId, priority, 'children');
    this.updateStats({ totalRequests: this.stats.totalRequests + 1 });

    await this.processQueue();
  }

  getLoadingState(periodId: string): LoadingState {
    return this.loadingStates.get(periodId) || {
      loading: false,
      progress: 0,
      error: null,
      startTime: null,
      endTime: null
    };
  }

  getStats(): LoadingStats {
    return { ...this.stats };
  }

  updateConfig(config: Partial<LoadingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LoadingConfig {
    return { ...this.config };
  }

  private addToQueue(id: string, priority: 'visible' | 'preload' | 'background', type: 'period' | 'children'): void {
    const priorityLevel = this.config.priorityLevels[priority];
    const item: LoadingQueueItem = {
      id,
      priority: priorityLevel,
      type,
      timestamp: Date.now()
    };

    // Insérer dans la queue en respectant la priorité
    const index = this.loadingQueue.findIndex(q => q.priority > priorityLevel);
    if (index === -1) {
      this.loadingQueue.push(item);
    } else {
      this.loadingQueue.splice(index, 0, item);
    }

    this.updateStats({ queueSize: this.loadingQueue.length });
  }

  private async processQueue(): Promise<void> {
    while (this.loadingQueue.length > 0 && this.activeRequests < this.config.maxConcurrentRequests) {
      const item = this.loadingQueue.shift();
      if (!item) break;

      this.activeRequests++;
      this.updateStats({ activeRequests: this.activeRequests });

      try {
        if (item.type === 'period') {
          await this.loadPeriodData(item.id);
        } else {
          await this.loadChildrenData(item.id);
        }
      } catch (error) {
        this.updateLoadingState(item.id, {
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
          endTime: Date.now()
        });
        this.updateStats({ failedRequests: this.stats.failedRequests + 1 });
      } finally {
        this.activeRequests--;
        this.updateStats({ activeRequests: this.activeRequests });
      }
    }
  }

  private async loadPeriodData(periodId: string): Promise<void> {
    const startTime = Date.now();
    try {
      const period = await this.timelineService.getPeriod(periodId);
      this.updateLoadingState(periodId, {
        loading: false,
        progress: 100,
        endTime: Date.now()
      });
      this.updateStats({
        completedRequests: this.stats.completedRequests + 1,
        averageLoadTime: this.calculateAverageLoadTime(startTime)
      });
    } catch (error) {
      throw error;
    }
  }

  private async loadChildrenData(parentId: string): Promise<void> {
    const startTime = Date.now();
    try {
      const children = await this.timelineService.getChildren(parentId);
      this.updateLoadingState(parentId, {
        loading: false,
        progress: 100,
        endTime: Date.now()
      });
      this.updateStats({
        completedRequests: this.stats.completedRequests + 1,
        averageLoadTime: this.calculateAverageLoadTime(startTime)
      });
    } catch (error) {
      throw error;
    }
  }

  private updateLoadingState(periodId: string, state: Partial<LoadingState>): void {
    const currentState = this.getLoadingState(periodId);
    this.loadingStates.set(periodId, { ...currentState, ...state });
  }

  private updateStats(updates: Partial<LoadingStats>): void {
    this.stats = { ...this.stats, ...updates };
  }

  private calculateAverageLoadTime(startTime: number): number {
    const loadTime = Date.now() - startTime;
    const totalCompleted = this.stats.completedRequests;
    return (this.stats.averageLoadTime * (totalCompleted - 1) + loadTime) / totalCompleted;
  }

  shouldPreload(element: HTMLElement): boolean {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const elementTop = rect.top;
    const elementBottom = rect.bottom;
    
    // L'élément est visible si une partie est dans la fenêtre
    const isVisible = elementTop < windowHeight && elementBottom > 0;
    
    // L'élément est dans la zone de préchargement si sa position est inférieure au seuil
    const preloadZone = windowHeight * this.config.preloadThreshold;
    const isInPreloadZone = elementTop < preloadZone;
    
    return isVisible || isInPreloadZone;
  }

  updatePreloadState(periodId: string, element: HTMLElement): void {
    if (!element) return;
    
    const shouldPreload = this.shouldPreload(element);
    const state = this.getLoadingState(periodId);
    
    if (shouldPreload && !state.loading && !state.error) {
      this.loadPeriod(periodId, 'preload');
    }
  }
} 