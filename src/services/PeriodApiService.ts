import { apiClient } from './ApiClient';
import { buildNewEntityCoreFields } from '@/lib/buildNewEntityCoreFields';
import { mapToPeriod } from './entityMappers';
import type { PeriodDto, PeriodFormPayload } from '@/types/api';
import type { Period, ListPeriod, DeletePeriodResult } from '../types/database';

export { mapToPeriod } from './entityMappers';

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
    const data = await apiClient.get<PeriodDto[]>('/periods');
    return data.map(mapToPeriod);
  }

  async getPeriod(periodId: string): Promise<Period> {
    const data = await apiClient.get<PeriodDto>(`/periods/${encodeURIComponent(periodId)}`);
    return mapToPeriod(data);
  }

  async getPeriodByWikidataId(wikidataId: string, options?: { signal?: AbortSignal }): Promise<Period | null> {
    try {
      const data = await apiClient.get<PeriodDto>(`/periods/wikidata/${encodeURIComponent(wikidataId)}`, options);
      return data ? mapToPeriod(data) : null;
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  }

  async loadChildren(periodId: string): Promise<Period[]> {
    void periodId;
    return [];
  }

  async updateParent(periodId: string, parentId: string | null): Promise<Period> {
    void periodId; void parentId;
    throw new Error('Déplacez cette période dans sa frise.');
  }

  async createPeriod(formData: PeriodFormPayload): Promise<Period> {
    if (!formData.title?.fr) throw new Error('Le titre en français est obligatoire');
    if (!formData.startDate) throw new Error('La date de début est obligatoire');

    if (formData.qid) {
      const existing = await this.getPeriodByWikidataId(formData.qid);
      if (existing) throw new Error(`Une période avec le Q-id ${formData.qid} existe déjà dans la base de données.`);
    }

    const payload = {
      ...buildNewEntityCoreFields(formData),
      start_date: formData.startDate,
      end_date: formData.endDate || 'NOW',
      children: [],
      categories: formData.categories,
    };

    return mapToPeriod(await apiClient.post<PeriodDto>('/periods', payload));
  }

  async updatePeriod(periodId: string, formData: PeriodFormPayload): Promise<Period> {
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
    const data = await apiClient.put<PeriodDto>(`/periods/${periodId}`, payload);
    return mapToPeriod(data);
  }

  async deletePeriod(periodId: string): Promise<DeletePeriodResult> {
    return apiClient.delete<DeletePeriodResult>(`/periods/${encodeURIComponent(periodId)}`);
  }
}
