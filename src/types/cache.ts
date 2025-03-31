export interface CacheConfig {
  duration: number;  // Durée de validité du cache en millisecondes
  maxSize: number;   // Taille maximale du cache en nombre d'entrées
}

export interface CacheMetadata {
  size: number;
  lastAccessed: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  metadata: CacheMetadata;
}

export type CacheKey = string;

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

export interface CacheService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  clear(): void;
  getStats(): CacheStats;
  cleanup(): void;
  getConfig(): CacheConfig;
} 