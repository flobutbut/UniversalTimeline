import { apiClient } from './ApiClient';
import { buildNewEntityCoreFields } from '@/lib/buildNewEntityCoreFields';
import { DateService } from './DateService';
import type { Period, ListPeriod } from '../types/database';

export function mapToPeriod(p: any): any {
  const startDate = p.start_date ?? p.startDate ?? '';
  const endDate   = p.end_date   ?? p.endDate   ?? '';
  return {
    id: p.id,
    wikidata_id: p.wikidata_id || '',
    label: {
      fr: p.label_fr ?? p.label?.fr ?? '',
      en: p.label_en ?? p.label?.en ?? p.label_fr ?? p.label?.fr ?? '',
    },
    description: p.description_fr
      ? { fr: p.description_fr, en: p.description_en || p.description_fr }
      : (p.description ?? { fr: '', en: '' }),
    startDate,
    endDate,
    // Colonnes numériques : si présentes en base on les utilise, sinon on calcule
    startYearsBP: p.start_years_bp != null
      ? Number(p.start_years_bp)
      : DateService.toYearsBP(startDate),
    endYearsBP: p.end_years_bp != null
      ? Number(p.end_years_bp)
      : DateService.toYearsBP(endDate),
    parentId: p.parent_id ?? p.parentId ?? null,
    hasParent: !!(p.parent_id ?? p.parentId ?? p.has_parent ?? p.hasParent),
    hasChildren: p.has_children ?? p.hasChildren ?? false,
    children: [],
    categories: p.categories || [],
    createdAt: p.created_at ? new Date(p.created_at) : new Date(),
    updatedAt: p.updated_at ? new Date(p.updated_at) : new Date(),
  };
}

export class PeriodApiService {
  private static instance: PeriodApiService;

  private constructor() {}

  public static getInstance(): PeriodApiService {
    if (!PeriodApiService.instance) {
      PeriodApiService.instance = new PeriodApiService();
    }
    return PeriodApiService.instance;
  }

  /** Exposé pour que le store puisse mapper les résultats story/children. */
  static mapPeriod = mapToPeriod;

  async getListPeriods(): Promise<ListPeriod[]> {
    const data = await apiClient.get<any[]>('/periods');
    return data.map(mapToPeriod);
  }

  async getAllPeriods(): Promise<Period[]> {
    const data = await apiClient.get<any[]>('/periods');
    return data.map(mapToPeriod);
  }

  async getPeriod(periodId: string): Promise<Period> {
    const data = await apiClient.get<any>(`/periods/${periodId}`);
    return mapToPeriod(data);
  }

  async getPeriodByWikidataId(wikidataId: string): Promise<Period | null> {
    const data = await apiClient.get<any>(`/periods/wikidata/${wikidataId}`);
    return data ? mapToPeriod(data) : null;
  }

  async loadChildren(periodId: string): Promise<Period[]> {
    const data = await apiClient.get<any[]>(`/periods/${periodId}/children`);
    return data.map(mapToPeriod);
  }

  async updateParent(periodId: string, parentId: string | null): Promise<any> {
    return apiClient.patch(`/periods/${periodId}/parent`, { parent_id: parentId });
  }

  async createPeriod(formData: any): Promise<any> {
    if (!formData.title?.fr) throw new Error('Le titre en français est obligatoire');
    if (!formData.startDate) throw new Error('La date de début est obligatoire');
    if (!formData.endDate) throw new Error('La date de fin est obligatoire');

    // Vérifier si la période existe déjà via son wikidata_id
    if (formData.qid) {
      try {
        const existing = await this.getPeriodByWikidataId(formData.qid);
        if (existing) return existing;
      } catch {
        // Pas trouvée, on continue la création
      }
    }

    const payload = {
      ...buildNewEntityCoreFields(formData),
      start_date: formData.startDate,
      end_date: formData.endDate,
      children: [],
      temporal_location: formData.temporalLocation || null,
    };

    return apiClient.post('/periods', payload);
  }

  async updatePeriod(periodId: string, formData: any): Promise<Period> {
    const payload = {
      wikidata_id: formData.qid || null,
      label: { fr: formData.title.fr, en: formData.title.en || formData.title.fr },
      description: {
        fr: formData.description?.fr || null,
        en: formData.description?.en || formData.description?.fr || null,
      },
      start_date: formData.startDate,
      end_date: formData.endDate || null,
      categories: formData.categories || [],
    };
    const data = await apiClient.put<any>(`/periods/${periodId}`, payload);
    return mapToPeriod(data);
  }

  async deletePeriod(periodId: string): Promise<void> {
    await apiClient.delete(`/periods/${periodId}`);
  }
}
