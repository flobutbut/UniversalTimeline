import { PeriodApiService } from './PeriodApiService';
import { EventApiService } from './EventApiService';
import type { Period, Event } from '@/types/database';

export interface ConflictInfo {
  hasConflict: boolean;
  existingItem: Period | Event | null;
  conflictType: 'period' | 'event' | 'story';
  message: string;
}

/** Lookup only: resolving a duplicate never deletes or replaces another entity. */
export class ConflictResolutionService {
  private static instance: ConflictResolutionService;
  private constructor() {}
  static getInstance(): ConflictResolutionService {
    return ConflictResolutionService.instance ??= new ConflictResolutionService();
  }

  private async detectEntityConflict(qid: string, type: 'period' | 'event', currentItemId?: string): Promise<ConflictInfo> {
    try {
      const existingItem = type === 'period'
        ? await PeriodApiService.getInstance().getPeriodByWikidataId(qid)
        : await EventApiService.getInstance().getEventById(qid);
      const hasConflict = !!existingItem && existingItem.id !== currentItemId;
      return {
        hasConflict, existingItem, conflictType: type,
        message: hasConflict ? `${type === 'period' ? 'Une période' : 'Un événement'} avec le Q-id ${qid} existe déjà dans la base de données.` : '',
      };
    } catch {
      throw new Error('Erreur lors de la vérification des conflits');
    }
  }
  detectPeriodConflict(qid: string, currentItemId?: string): Promise<ConflictInfo> {
    return this.detectEntityConflict(qid, 'period', currentItemId);
  }
  detectEventConflict(qid: string, currentItemId?: string): Promise<ConflictInfo> {
    return this.detectEntityConflict(qid, 'event', currentItemId);
  }
  detectConflict(qid: string, type: 'period' | 'event' | 'story', currentItemId?: string): Promise<ConflictInfo> {
    if (type === 'story') return Promise.resolve({ hasConflict: false, existingItem: null, conflictType: type, message: '' });
    return this.detectEntityConflict(qid, type, currentItemId);
  }
}
