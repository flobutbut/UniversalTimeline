import { apiClient } from './ApiClient';
import type { TagDto } from '@/types/api';
import type { TagRef } from '@/types/database';
import { mapToTag } from './entityMappers';
import { createRequestCache } from '@/lib/requestCache';

export interface GridTag extends TagRef { description?: string }

export class TagService {
  private static instance: TagService;
  private tags: GridTag[] = [];
  private reads = createRequestCache(() => {});

  public static getInstance(): TagService {
    if (!TagService.instance) TagService.instance = new TagService();
    return TagService.instance;
  }

  public async getTags(): Promise<GridTag[]> {
    await this.reads.load('tags', () => apiClient.get<Array<TagDto & { description?: string | null }>>('/tags'), rows => {
      this.tags = rows.map(row => ({ ...mapToTag(row), ...(row.description ? { description: row.description } : {}) }));
    });
    return this.tags;
  }

  public clearCache(): void {
    this.reads.clear();
    this.tags = [];
  }
}
