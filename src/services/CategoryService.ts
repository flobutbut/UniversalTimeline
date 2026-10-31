import { apiClient } from './ApiClient';
import type { CategoryDto } from '@/types/api';
import { mapToCategory } from './entityMappers';
import { createRequestCache } from '@/lib/requestCache';

export interface Category {
  id: string;
  label: string;
  description?: string;
}

export class CategoryService {
  private static instance: CategoryService;
  private categories: Category[] = [];
  private reads = createRequestCache(() => {});

  public static getInstance(): CategoryService {
    if (!CategoryService.instance) CategoryService.instance = new CategoryService();
    return CategoryService.instance;
  }

  public async getCategories(): Promise<Category[]> {
    await this.reads.load('categories', () => apiClient.get<CategoryDto[]>('/categories'), rows => {
      this.categories = rows.map(raw => {
        const category = mapToCategory(raw);
        return { id: category.id, label: category.label.fr, description: category.description?.fr };
      });
    });
    return this.categories;
  }

  public clearCache(): void {
    this.reads.clear();
    this.categories = [];
  }
}
