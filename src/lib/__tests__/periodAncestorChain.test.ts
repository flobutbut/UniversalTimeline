import { expect, it, vi } from 'vitest';
import { buildPeriodIdAncestorChain } from '@/lib/periodAncestorChain';

it('resolves chains longer than the old twelve-level limit', async () => {
  const path = await buildPeriodIdAncestorChain('15', {
    getPeriodFromStore: id => ({ parentId: Number(id) > 0 ? String(Number(id) - 1) : null }),
    fetchPeriodFromApi: vi.fn(),
  });
  expect(path).toEqual(Array.from({ length: 16 }, (_, i) => String(i)));
});

it.each(['cycle', 'depth', 'missing'] as const)('rejects an incomplete path caused by %s', async cause => {
  const read = vi.fn(async (id: string) => cause === 'missing' ? null : { parentId: cause === 'cycle' ? id : String(Number(id) + 1) });
  await expect(buildPeriodIdAncestorChain('0', { getPeriodFromStore: () => undefined, fetchPeriodFromApi: read, maxDepth: 3 }))
    .rejects.toThrow(cause === 'cycle' ? 'cycle' : cause === 'depth' ? 'profondeur' : 'introuvable');
  expect(read).toHaveBeenCalledTimes(cause === 'depth' ? 3 : 1);
});

it('stops reading ancestors after its caller has abandoned the path', async () => {
  let active = true;
  const read = vi.fn(async () => { active = false; return { parentId: 'root' }; });
  expect(await buildPeriodIdAncestorChain('leaf', { getPeriodFromStore: () => undefined, fetchPeriodFromApi: read, isCurrent: () => active })).toEqual([]);
  expect(read).toHaveBeenCalledOnce();
});
