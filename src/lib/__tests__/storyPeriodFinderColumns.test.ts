import { describe, expect, it } from 'vitest';
import {
  collectStoryPeriodSubtreeIds, getStoryPeriodRoots, buildStoryFinderPathFromSelectedPeriodId,
} from '@/lib/storyPeriodFinderColumns';

describe('collectStoryPeriodSubtreeIds', () => {
  it('retourne uniquement la racine sans enfant', () => {
    const periods = [{ id: 'a', parentId: null as string | null }];
    expect(collectStoryPeriodSubtreeIds(periods, 'a')).toEqual(['a']);
  });

  it('inclut tous les descendants dans la story', () => {
    const periods = [
      { id: 'root', parentId: null as string | null },
      { id: 'c1', parentId: 'root' },
      { id: 'c2', parentId: 'root' },
      { id: 'g1', parentId: 'c1' },
    ];
    const ids = collectStoryPeriodSubtreeIds(periods, 'root');
    expect(ids).toHaveLength(4);
    expect(new Set(ids)).toEqual(new Set(['root', 'c1', 'c2', 'g1']));
  });

  it('ne suit pas un parent hors liste', () => {
    const periods = [{ id: 'x', parentId: 'external' }];
    expect(collectStoryPeriodSubtreeIds(periods, 'x')).toEqual(['x']);
  });
});


it('keeps the same scoped hierarchy for roots, descendants and the selected path', () => {
  const periods = [{ id: 'univers', parentId: 'catalogue', storyParentId: null }, { id: 'milky', parentId: null, storyParentId: 'univers' }];
  expect(getStoryPeriodRoots(periods).map(p => p.id)).toEqual(['univers']);
  expect(collectStoryPeriodSubtreeIds(periods, 'univers')).toEqual(['univers', 'milky']);
  expect(buildStoryFinderPathFromSelectedPeriodId(periods, 'milky')).toEqual(['univers', 'milky']);
});
