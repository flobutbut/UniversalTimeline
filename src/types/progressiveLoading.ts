import type { Period } from './geological';

export interface LoadingState {
  loading: boolean;
  progress: number;
  error: Error | null;
  startTime: number | null;
  endTime: number | null;
}

export interface LoadingQueueItem {
  id: string;
  priority: number;
  type: 'period' | 'children';
  parentId?: string;
  timestamp: number;
}

export interface LoadingConfig {
  maxConcurrentRequests: number;
  preloadThreshold: number;  // Nombre d'éléments avant le bas de la liste pour déclencher le préchargement
  priorityLevels: {
    visible: number;
    preload: number;
    background: number;
  };
}

export interface LoadingStats {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageLoadTime: number;
  queueSize: number;
  activeRequests: number;
}

export interface ProgressiveLoadingService {
  // Gestion du chargement
  loadPeriod(periodId: string): Promise<Period>;
  loadChildren(parentId: string): Promise<Period[]>;
  preloadChildren(parentId: string): void;
  
  // Gestion de la file d'attente
  addToQueue(item: LoadingQueueItem): void;
  removeFromQueue(periodId: string): void;
  clearQueue(): void;
  
  // État et monitoring
  getLoadingState(periodId: string): LoadingState;
  getQueueStatus(): {
    size: number;
    items: LoadingQueueItem[];
  };
  
  // Configuration
  updateConfig(config: Partial<LoadingConfig>): void;
  getConfig(): LoadingConfig;
} 