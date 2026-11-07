// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import router from '../src/api/routes';
import { query } from '../src/api/database';
vi.mock('../src/api/database', () => ({ query: vi.fn(), withTransaction: vi.fn() }));

beforeEach(() => { vi.clearAllMocks(); vi.mocked(query).mockResolvedValue({ rows: [] } as never); });
async function call(path: string, params = {}) {
  const layer = router.stack.find(layer => layer.route?.path === path && layer.route.methods.get);
  const response = { set: vi.fn(), status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  await layer.route.stack[0].handle({ params }, response);
  return response;
}
it('returns only a minimal public head payload, never ownership or full frise data', async () => {
  vi.mocked(query).mockResolvedValue({ rows: [{ id: 22, title_fr: 'Extinctions', description_fr: 'Les crises.', owner_user_id: 'private', author: 'private', periods: ['private'] }] } as never);
  const response = await call('/seo/stories/:id', { id: '22' });
  expect(response.json).toHaveBeenCalledWith({ id: '22', title: 'Extinctions', description: 'Les crises.' });
  expect(response.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
  expect(response.set).toHaveBeenCalledWith('X-Robots-Tag', 'noindex');
  expect(query).toHaveBeenCalledWith(expect.stringMatching(/WHERE id = \$1 AND is_public = true/), ['22']);
});
it('validates ids before database access and uses the same absent response for inaccessible frises', async () => {
  const invalid = await call('/seo/stories/:id', { id: '2147483648' });
  expect(invalid.status).toHaveBeenCalledWith(400);
  expect(query).not.toHaveBeenCalled();
  const absent = await call('/seo/stories/:id', { id: '55' });
  expect(absent.status).toHaveBeenCalledWith(404);
});
it('lists only public sitemap ids rather than exporting author or user records', async () => {
  vi.mocked(query).mockResolvedValue({ rows: [{ id: 22, owner_user_id: 'private' }] } as never);
  const response = await call('/seo/stories');
  expect(response.json).toHaveBeenCalledWith(['22']);
  expect(query).toHaveBeenCalledWith(expect.stringMatching(/WHERE is_public = true/));
});
