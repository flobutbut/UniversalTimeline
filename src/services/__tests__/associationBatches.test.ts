import { beforeEach, it, expect, vi } from 'vitest';
import { apiClient } from '../ApiClient';
import { StoryApiService } from '../StoryApiService';

vi.mock('../ApiClient', () => ({ apiClient: { post: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

it.each(['period', 'event'] as const)('sends the whole %s selection in one request, including removals', async kind => {
  const service = StoryApiService.getInstance();
  await service.changeAssociations('1',kind,['a','b','a']);
  expect(apiClient.post).toHaveBeenCalledExactlyOnceWith(`/stories/1/${kind === 'period' ? 'periods' : 'events'}`, {ids:['a','b'],operation:'add'});
  vi.mocked(apiClient.post).mockClear();
  await service.changeAssociations('1',kind,['a','b'],true);
  expect(apiClient.post).toHaveBeenCalledExactlyOnceWith(`/stories/1/${kind === 'period' ? 'periods' : 'events'}`, {ids:['a','b'],operation:'remove'});
});

it('sends the whole child-story selection in one request', async () => {
  await StoryApiService.getInstance().linkChildStories('1',['2','5','2']);
  expect(apiClient.post).toHaveBeenCalledExactlyOnceWith('/stories/1/child-stories',{childStoryIds:['2','5']});
});
