import { describe, expect, it } from 'vitest';
import {
  storyChildrenOf,
  resolvePeriodNavFromSnapshot,
} from '@/lib/homeStoryPeriodNav';
import type { ListPeriod } from '@/types/database';

const label = (fr: string) => ({ fr, en: fr });

function period(
  id: string,
  parentId: string | null,
  hasChildrenInStory: boolean,
): ListPeriod {
  return {
    id,
    label: label(id),
    startDate: '',
    endDate: '',
    categories: [],
    parentId,
    hasChildren: hasChildrenInStory,
  };
}

describe('storyChildrenOf', () => {
  it('racines : parent absent ou hors périmètre story', () => {
    const story = [
      period('a', null, true),
      period('b', 'ext', false),
      period('c', 'a', false),
    ];
    const roots = storyChildrenOf(null, story);
    expect(roots.map(p => p.id).sort()).toEqual(['a', 'b']);
    expect(roots.find(p => p.id === 'a')?.hasChildren).toBe(true);
    expect(roots.find(p => p.id === 'b')?.hasChildren).toBe(false);
  });

  it('enfants directs d’une période', () => {
    const story = [
      period('r', null, true),
      period('c1', 'r', false),
      period('c2', 'r', false),
    ];
    const ch = storyChildrenOf('r', story);
    expect(ch.map(p => p.id).sort()).toEqual(['c1', 'c2']);
  });
});

describe('resolvePeriodNavFromSnapshot', () => {
  const story = [
    period('r', null, true),
    period('p', 'r', true),
    period('leaf', 'p', false),
  ];

  it('reconstruit pile + courant', () => {
    const res = resolvePeriodNavFromSnapshot(story, {
      parentStackIds: ['r'],
      currentPeriodId: 'p',
    });
    expect(res?.stack.map(p => p.id)).toEqual(['r']);
    expect(res?.current?.id).toBe('p');
  });

  it('retourne null si un id manque', () => {
    expect(
      resolvePeriodNavFromSnapshot(story, {
        parentStackIds: ['missing'],
        currentPeriodId: null,
      }),
    ).toBeNull();
  });

  it('courant null', () => {
    const res = resolvePeriodNavFromSnapshot(story, {
      parentStackIds: [],
      currentPeriodId: null,
    });
    expect(res?.stack).toEqual([]);
    expect(res?.current).toBeNull();
  });
});

it('uses the frise placement even when both periods are catalogue roots', () => {
  const univers = { ...period('univers', null, false), storyParentId: null };
  const milky = { ...period('milky', null, false), storyParentId: 'univers' };
  expect(storyChildrenOf(null, [univers, milky]).map(p => p.id)).toEqual(['univers']);
  expect(storyChildrenOf('univers', [univers, milky]).map(p => p.id)).toEqual(['milky']);
  expect(resolvePeriodNavFromSnapshot([univers, milky], { parentStackIds: [], currentPeriodId: 'milky' })).toBeNull();
  expect(resolvePeriodNavFromSnapshot([univers, milky], { parentStackIds: ['univers'], currentPeriodId: 'milky' })?.current?.id).toBe('milky');
});
