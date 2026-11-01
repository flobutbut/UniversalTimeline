import { beforeEach, it, expect, vi } from 'vitest';
import { apiClient } from '../ApiClient';
import { PeriodApiService } from '../PeriodApiService';
import { EventApiService } from '../EventApiService';

vi.mock('../ApiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
const periods = PeriodApiService.getInstance();
const form = { qid: 'Q123', title: { fr: 'Période' }, startDate: 'M65', endDate: 'NOW' };

it('maps descendants from the dedicated lookup with their hierarchy metadata', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ id: 'child', wikidata_id: 'Q123', parentId: 'root', hasChildren: true });
  expect(await periods.getPeriodByWikidataId('Q123')).toMatchObject({ id: 'child', parentId: 'root', hasChildren: true });
  expect(apiClient.get).toHaveBeenCalledWith('/periods/wikidata/Q123', undefined);
});

it('only treats HTTP 404 as an absent period', async () => {
  vi.mocked(apiClient.get).mockRejectedValue({ response: { status: 404 } });
  expect(await periods.getPeriodByWikidataId('Q123')).toBeNull();
});

it.each([401, 500, undefined])('refuses creation when lookup fails (%s)', async status => {
  const error = { response: { status } };
  vi.mocked(apiClient.get).mockRejectedValue(error);
  await expect(periods.createPeriod(form)).rejects.toBe(error);
  expect(apiClient.post).not.toHaveBeenCalled();
});

it('refuses to reuse an existing descendant as a newly created period', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ id: 'child', parent_id: 'root' });
  await expect(periods.createPeriod(form)).rejects.toThrow('existe déjà');
  expect(apiClient.post).not.toHaveBeenCalled();
  expect(apiClient.patch).not.toHaveBeenCalled();
});

it('creates only after a genuine absence and maps the saved response', async () => {
  vi.mocked(apiClient.get).mockRejectedValue({ response: { status: 404 } });
  vi.mocked(apiClient.post).mockResolvedValue({ id: 'new', start_date: 'M65', parent_id: null });
  expect(await periods.createPeriod(form)).toMatchObject({ id: 'new', startDate: 'M65', parentId: null });
  expect(apiClient.post).toHaveBeenCalledOnce();
});

it('distinguishes a missing event from a failed event lookup', async () => {
  vi.mocked(apiClient.get).mockResolvedValue([]);
  expect(await EventApiService.getInstance().getEventById('Q123')).toBeNull();
  vi.mocked(apiClient.get).mockRejectedValue(new Error('Network'));
  await expect(EventApiService.getInstance().getEventById('Q123')).rejects.toThrow('Network');
});

it('maps the authoritative parent response', async () => {
  vi.mocked(apiClient.patch).mockResolvedValue({ id: 'child', parent_id: 'new-parent', has_children: true, categories: [{ id: 'cat' }] });
  expect(await periods.updateParent('child', 'new-parent')).toMatchObject({ parentId: 'new-parent', hasChildren: true, categories: [{ id: 'cat' }] });
});

it('finds an event by its stored Wikidata link only, never by an internal ID shaped like a Q-id', async () => {
  vi.mocked(apiClient.get).mockResolvedValue([
    { id: 'Q39671', wikidata_id: 'Q1025466', label_fr: 'Assassinat de Jules César', date: '-0044-03-15' },
    { id: 'uuid-stonehenge', wikidata_id: 'q39671', label_fr: 'Construction de Stonehenge', date: '-3000' },
  ]);
  expect((await EventApiService.getInstance().getEventById('Q39671'))?.id).toBe('uuid-stonehenge');
  vi.mocked(apiClient.get).mockResolvedValue([{ id: 'Q39671', wikidata_id: 'Q1025466', label_fr: 'Assassinat de Jules César', date: '-0044-03-15' }]);
  expect(await EventApiService.getInstance().getEventById('Q39671')).toBeNull();
});
