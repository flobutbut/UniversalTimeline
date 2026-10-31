import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { authService } from '@/services/AuthService';
import { useAuthStore } from '../useAuthStore';
import { useDataStore } from '../useDataStore';

const fake = vi.hoisted(() => ({ unsubscribe: vi.fn(), signOut: vi.fn(), onChange: vi.fn() }));
vi.mock('@/services/AuthService', () => ({ authService: {
  initialize: vi.fn(), isEnabled: vi.fn(), getAccount: vi.fn(),
  getClient: () => ({ auth: { signOut: fake.signOut, onAuthStateChange: fake.onChange } }),
} }));
let pinia: Pinia;
beforeEach(() => {
  vi.useFakeTimers(); vi.resetAllMocks(); pinia = createPinia(); setActivePinia(pinia);
  vi.mocked(authService.initialize).mockResolvedValue(); vi.mocked(authService.isEnabled).mockReturnValue(true);
  vi.mocked(authService.getAccount).mockResolvedValue(null); fake.signOut.mockResolvedValue({ error: null });
  fake.onChange.mockReturnValue({ data: { subscription: { unsubscribe: fake.unsubscribe } } });
});
afterEach(() => { disposePinia(pinia); vi.useRealTimers(); vi.restoreAllMocks(); });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }

it('deduplicates initialization and keeps disabled mode independent of accounts', async () => {
  const auth = useAuthStore(); vi.mocked(authService.isEnabled).mockReturnValue(false);
  await Promise.all([auth.initialize(),auth.initialize()]);
  expect(authService.initialize).toHaveBeenCalledOnce(); expect(authService.getAccount).not.toHaveBeenCalled();
  expect(auth.ready).toBe(true); expect(auth.enabled).toBe(false);
});
it('retries an unavailable configuration without opening protected access', async () => {
  const auth = useAuthStore(); vi.mocked(authService.initialize).mockRejectedValueOnce(new Error('offline'));
  await auth.initialize(); expect(auth.ready).toBe(false); expect(auth.signedIn).toBe(false);
  await auth.initialize(); expect(auth.ready).toBe(true); expect(auth.error).toBeNull();
});
it('clears previous data on verified login and exposes only owned stories for editing', async () => {
  const data = useDataStore(); data.updateStories([{ id:'old',title:{fr:'Private',en:''},categories:[] }]);
  vi.mocked(authService.getAccount).mockResolvedValue({ id:'alice',isAdmin:false });
  const auth = useAuthStore(); await auth.initialize();
  expect(data.stories).toEqual([]); expect(auth.signedIn).toBe(true); expect(auth.isAdmin).toBe(false);
  expect(auth.ownsStory({ownerUserId:'alice'})).toBe(true); expect(auth.ownsStory({ownerUserId:'bob'})).toBe(false); expect(auth.ownsStory({})).toBe(false);
});
it('clears private data and ignores an older account read after logout', async () => {
  vi.mocked(authService.getAccount).mockResolvedValue({ id:'alice',isAdmin:true });
  const auth = useAuthStore(); await auth.initialize();
  useDataStore().updateStories([{ id:'private',title:{fr:'Private',en:''},categories:[] }]);
  const late = deferred<{ id:string; isAdmin:boolean }>(); vi.mocked(authService.getAccount).mockReturnValue(late.promise);
  const read = auth.refreshAccount(); await auth.signOut();
  late.resolve({ id:'alice',isAdmin:true }); await read;
  expect(auth.account).toBeNull(); expect(useDataStore().stories).toEqual([]); expect(auth.identityVersion).toBe(2);
});
it('drops the old identity immediately on a cross-tab account change, before verification completes', async () => {
  vi.mocked(authService.getAccount).mockResolvedValue({id:'alice',isAdmin:false});
  const auth=useAuthStore(); await auth.initialize();
  useDataStore().updateStories([{id:'private',title:{fr:'Private',en:''},categories:[]}]);
  const onChange=fake.onChange.mock.calls[0][0];
  const late=deferred<{id:string;isAdmin:boolean}>(); vi.mocked(authService.getAccount).mockReturnValue(late.promise);
  onChange('SIGNED_IN',{user:{id:'bob'}});
  expect(auth.account).toBeNull(); expect(auth.ready).toBe(false); expect(useDataStore().stories).toEqual([]);
  await vi.advanceTimersByTimeAsync(0); late.resolve({id:'bob',isAdmin:false}); await auth.refreshAccount();
  expect(auth.account?.id).toBe('bob'); expect(auth.ownsStory({ownerUserId:'alice'})).toBe(false);
});
it('keeps an Auth outage distinct from an anonymous account and retries verification', async () => {
  const auth=useAuthStore(); vi.mocked(authService.getAccount).mockRejectedValueOnce(new Error('outage'));
  await auth.initialize(); expect(auth.ready).toBe(false); expect(auth.error).toBeTruthy();
  await auth.initialize(); expect(auth.ready).toBe(true); expect(auth.account).toBeNull();
});
it('unsubscribes and cancels a scheduled refresh when its store is disposed', async () => {
  const auth=useAuthStore(); await auth.initialize();
  fake.onChange.mock.calls[0][0]('TOKEN_REFRESHED',null);
  auth.$dispose(); await vi.runAllTimersAsync();
  expect(fake.unsubscribe).toHaveBeenCalledOnce(); expect(authService.getAccount).toHaveBeenCalledOnce();
});

it('clears cached data when verified permissions change for the same account', async () => {
  vi.mocked(authService.getAccount).mockResolvedValue({id:'alice',isAdmin:false});
  const auth=useAuthStore();await auth.initialize();
  useDataStore().updateStories([{id:'cached',title:{fr:'Cached',en:''},categories:[],ownerUserId:null}]);
  vi.mocked(authService.getAccount).mockResolvedValue({id:'alice',isAdmin:true});
  await auth.refreshAccount();
  expect(auth.account).toEqual({id:'alice',isAdmin:true});expect(auth.identityVersion).toBe(2);
  expect(useDataStore().stories).toEqual([]);
});
