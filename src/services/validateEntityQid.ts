import { ConflictResolutionService } from './ConflictResolutionService';
import { EditFormValidator } from '@/validators/editFormValidators';
import type { Period, Event } from '@/types/database';

export interface QidValidation {
  isValid: boolean;
  error: string;
  exists: boolean;
  item?: Period | Event | null;
}

/** Format and authoritative existence lookup, without hierarchy or mutation state. */
export async function validateEntityQid(qid: string, type: 'period' | 'event', currentItemId?: string): Promise<QidValidation> {
  const format = EditFormValidator.validateQid(qid);
  if (!format.isValid) return { isValid: false, error: format.errors.join(', '), exists: false };
  try {
    const conflict = await ConflictResolutionService.getInstance().detectConflict(qid.trim().toUpperCase(), type, currentItemId);
    return { isValid: true, error: conflict.hasConflict ? 'Ce Q-id existe déjà dans la base' : '', exists: !!conflict.existingItem, item: conflict.existingItem };
  } catch {
    return { isValid: false, error: 'Erreur lors de la validation du Q-id', exists: false };
  }
}
