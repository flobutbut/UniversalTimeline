import type { CacheConfig, CacheEntry, CacheKey, CacheStats } from '../types/cache';

export class CacheService {
  private cache: Map<CacheKey, CacheEntry<any>>;
  private config: CacheConfig;
  private stats: CacheStats;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = config;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0
    };
  }

  get<T>(key: CacheKey): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.config.duration) {
      this.stats.hits++;
      return entry.data;
    }
    this.stats.misses++;
    return null;
  }

  set<T>(key: CacheKey, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      metadata: {
        size: this.calculateSize(data),
        lastAccessed: Date.now()
      }
    };

    // Vérifier si le cache est plein
    if (this.stats.size + entry.metadata.size > this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
    this.stats.size += entry.metadata.size;
  }

  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0
    };
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getConfig(): CacheConfig {
    return {
      duration: this.config.duration,
      maxSize: this.config.maxSize
    };
  }

  private evictOldest(): void {
    let oldestKey: CacheKey | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata.lastAccessed < oldestTimestamp) {
        oldestTimestamp = entry.metadata.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        this.stats.size -= entry.metadata.size;
        this.stats.evictions++;
      }
      this.cache.delete(oldestKey);
    }
  }

  private calculateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }
} 