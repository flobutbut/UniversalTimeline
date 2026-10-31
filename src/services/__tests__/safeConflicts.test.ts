import { useUiStore } from '@/stores/useUiStore';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ConflictResolutionService } from '../ConflictResolutionService';
import { useDatabaseSave } from '@/composables/useDatabaseSave';
import { validateEntityQid } from '@/services/validateEntityQid';

const fake = vi.hoisted(() => ({
  period: { getAllPeriods: vi.fn(), getPeriodByWikidataId: vi.fn(), getPeriod: vi.fn(), updatePeriod: vi.fn(), deletePeriod: vi.fn() },
  event: { getEventById: vi.fn(), updateEvent: vi.fn(), deleteEvent: vi.fn() },
  toast: { show: vi.fn(), hide: vi.fn() },
}));
vi.mock('@/services/PeriodApiService', () => ({ PeriodApiService: { getInstance: () => fake.period } }));
vi.mock('@/services/EventApiService', () => ({ EventApiService: { getInstance: () => fake.event } }));
vi.mock('@/validators/editFormValidators', () => ({ EditFormValidator: {
  validateForm: () => ({ isValid: true }), validateQid: () => ({ isValid: true }),
} }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  setActivePinia(createPinia());
  vi.spyOn(useUiStore(), 'notify').mockImplementation((fake.toast).show); vi.spyOn(useUiStore(), 'hideNotification').mockImplementation((fake.toast).hide);
  fake.period.getAllPeriods.mockResolvedValue([]);
  fake.period.getPeriodByWikidataId.mockResolvedValue({ id: 'other-period', wikidata_id: 'Q123', parentId: 'root' });
  fake.event.getEventById.mockResolvedValue({ id: 'other-event', wikidata_id: 'Q123' });
});
afterEach(() => vi.restoreAllMocks());

describe('safe conflict handling', () => {
  it.each(['period', 'event'] as const)('refuses an edit conflict for %s without deleting or updating', async type => {
    const { handleSave, loading } = useDatabaseSave();
    expect(await handleSave({ qid: 'Q123' }, type, 'edit', { id: 'edited-item' })).toBe(false);
    expect(fake.period.deletePeriod).not.toHaveBeenCalled();
    expect(fake.event.deleteEvent).not.toHaveBeenCalled();
    expect(fake.period.updatePeriod).not.toHaveBeenCalled();
    expect(fake.event.updateEvent).not.toHaveBeenCalled();
    expect(fake.toast.show).toHaveBeenLastCalledWith(expect.stringContaining('déjà utilisé'), 'error', undefined);
    expect(loading.value).toBe(false);
  });

  it('detects a duplicate below a root without relying on the root list', async () => {
    const conflict = await ConflictResolutionService.getInstance().detectPeriodConflict('Q123');
    expect(conflict).toMatchObject({ hasConflict: true, existingItem: { parentId: 'root' } });
    expect(fake.period.getPeriodByWikidataId).toHaveBeenCalledWith('Q123');
    expect(fake.period.getAllPeriods).not.toHaveBeenCalled();
    expect(await validateEntityQid('Q123', 'period')).toMatchObject({ isValid: true, exists: true, item: { parentId: 'root' } });
  });

  it.each(['period', 'event'] as const)('allows editing the same %s and distinguishes a genuine absence', async type => {
    const service = ConflictResolutionService.getInstance();
    expect(await service.detectConflict('Q123', type, `other-${type}`)).toMatchObject({ hasConflict: false });
    const lookup = type === 'period' ? fake.period.getPeriodByWikidataId : fake.event.getEventById;
    lookup.mockResolvedValue(null);
    expect(await service.detectConflict('Q123', type)).toMatchObject({ hasConflict: false, existingItem: null });
  });

  it.each(['period', 'event'] as const)('blocks saves and validation when the %s lookup fails', async type => {
    const lookup = type === 'period' ? fake.period.getPeriodByWikidataId : fake.event.getEventById;
    lookup.mockRejectedValue(new Error('Network unavailable'));
    expect(await useDatabaseSave().handleSave({ qid: 'Q123' }, type, 'edit', { id: 'edited' })).toBe(false);
    expect(await validateEntityQid('Q123', type)).toMatchObject({ isValid: false, exists: false });
    expect(fake.period.updatePeriod).not.toHaveBeenCalled();
    expect(fake.event.updateEvent).not.toHaveBeenCalled();
  });

});
