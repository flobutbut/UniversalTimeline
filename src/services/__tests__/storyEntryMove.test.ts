import { afterEach, expect, it, vi } from 'vitest';
import { StoryApiService } from '../StoryApiService';
import { apiClient } from '../ApiClient';

afterEach(() => vi.restoreAllMocks());
it('sends both explicit locations in one write, including a null root', async () => {
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue(undefined);
  await StoryApiService.getInstance().moveEntryPoint('16', '27', { type: 'period', id: 'Q7432' }, null);
  expect(post).toHaveBeenCalledExactlyOnceWith('/stories/16/entry-points/move', {
    targetStoryId: '27', from: { anchorType: 'period', anchorId: 'Q7432' }, to: null,
  });
});
it('never retries a failed relocation or sends a separate removal', async () => {
  const post = vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Refusé'));
  await expect(StoryApiService.getInstance().moveEntryPoint('16', '27', null, { type: 'period', id: 'Q7432' })).rejects.toThrow('Refusé');
  expect(post).toHaveBeenCalledTimes(1);
});
it('saves the display preference on the explicit source location, including a root', async()=>{
  const post=vi.spyOn(apiClient,'post').mockResolvedValue(undefined);
  await StoryApiService.getInstance().setEntryDisplay('16','27',null,false);
  expect(post).toHaveBeenCalledExactlyOnceWith('/stories/16/entry-points/display',{targetStoryId:'27',location:null,asPeriod:false});
});
