// @vitest-environment node
import { beforeEach, it, expect, vi } from 'vitest';
import { changeStoryAssociations } from '../src/services/storyAssociations';
import * as relations from '../src/repositories/storyRelationsRepository';
vi.mock('../src/repositories/storyRelationsRepository', () => ({
  setRelationLockTimeout: vi.fn(), lockWritableStory: vi.fn(), lockAssociationTargets: vi.fn(),
  hasAssociation: vi.fn(), insertAssociations: vi.fn(), setPeriodPlacements: vi.fn(), readPeriodPlacements: vi.fn(),
}));
const client = { query: vi.fn() };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(relations.lockWritableStory).mockResolvedValue({ id: 1 });
  vi.mocked(relations.lockAssociationTargets).mockImplementation(async (_c, _k, ids) => ids.map(id => ({id})));
  vi.mocked(relations.hasAssociation).mockResolvedValue(true);
  vi.mocked(relations.readPeriodPlacements).mockResolvedValue([{id:'child',parent_id:'root'},{id:'root',parent_id:null}]);
});
it('requires a parent inside the writable frise before inserting or moving', async () => {
  vi.mocked(relations.hasAssociation).mockResolvedValue(false);
  await expect(changeStoryAssociations(client,'1','period',['child'],false,'outside')).rejects.toMatchObject({status:409});
  expect(relations.insertAssociations).not.toHaveBeenCalled(); expect(relations.setPeriodPlacements).not.toHaveBeenCalled();
});
it('leaves the previous placement intact when an association is added without a parent instruction', async () => {
  await changeStoryAssociations(client,'1','period',['child'],false);
  expect(relations.setPeriodPlacements).not.toHaveBeenCalled(); expect(client.query).not.toHaveBeenCalled();
});
it('refuses a corrupt local ancestor chain instead of treating a missing parent as a root', async () => {
  vi.mocked(relations.readPeriodPlacements).mockResolvedValue([{id:'child',parent_id:'missing'}]);
  await expect(changeStoryAssociations(client,'1','period',['child'],false)).rejects.toMatchObject({status:409});
});
it('does not read or write associations in a frise that is not writable', async () => {
  vi.mocked(relations.lockWritableStory).mockResolvedValue(undefined as never);
  await expect(changeStoryAssociations(client,'1','period',['child'],false,'root')).rejects.toMatchObject({status:404});
  expect(relations.insertAssociations).not.toHaveBeenCalled();
});
