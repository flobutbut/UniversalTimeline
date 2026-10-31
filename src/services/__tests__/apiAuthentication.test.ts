import { beforeEach, expect, it, vi } from 'vitest';
import { apiClient } from '../ApiClient';
import { authService } from '../AuthService';

vi.mock('../AuthService', () => ({ authService: { getAccessToken: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
const adapter = vi.fn(async config => ({ data: { authorization: config.headers.get('Authorization') }, status:200, statusText:'OK', headers:{},config }));
it('attaches the current session token to local API requests only', async () => {
  vi.mocked(authService.getAccessToken).mockResolvedValue('verified-token');
  expect(await apiClient.get('/stories',{adapter})).toEqual({authorization:'Bearer verified-token'});
});
it('keeps anonymous timeline requests free of an authorization header', async () => {
  vi.mocked(authService.getAccessToken).mockResolvedValue(undefined);
  expect(await apiClient.get('/stories',{adapter})).toEqual({authorization:undefined});
});
it.each(['https://example.com/api','//example.com/api','stories'])('refuses an unsafe API destination %s before reading a token', async path => {
  await expect(apiClient.get(path,{adapter})).rejects.toThrow('chemin API local');
  expect(adapter).not.toHaveBeenCalled(); expect(authService.getAccessToken).not.toHaveBeenCalled();
});
it('refuses an overridden host even when the path looks local', async () => {
  await expect(apiClient.get('/stories',{baseURL:'https://example.com',adapter})).rejects.toThrow('chemin API local');
  expect(adapter).not.toHaveBeenCalled();
});
