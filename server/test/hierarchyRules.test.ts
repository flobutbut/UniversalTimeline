// @vitest-environment node
import { expect, it } from 'vitest';
import { checkAncestorChain } from '../src/domain/hierarchy';

it.each([
  { name: 'root', parents: [['root', null]], parent: 'root', forbidden: ['other'], expected: null },
  { name: 'deep valid tree', parents: [['leaf', 'parent'], ['parent', 'root'], ['root', null]], parent: 'leaf', forbidden: ['other'], expected: null },
  { name: 'self parent', parents: [['a', null]], parent: 'a', forbidden: ['a'], expected: 'cycle' },
  { name: 'indirect descendant', parents: [['a', 'b'], ['b', 'c'], ['c', null]], parent: 'a', forbidden: ['c'], expected: 'cycle' },
  { name: 'one forbidden child among many', parents: [['a', 'b'], ['b', null]], parent: 'a', forbidden: ['x', 'b', 'y'], expected: 'cycle' },
  { name: 'existing self cycle', parents: [['a', 'a']], parent: 'a', forbidden: [], expected: 'cycle' },
  { name: 'existing indirect cycle', parents: [['a', 'b'], ['b', 'a']], parent: 'a', forbidden: [], expected: 'cycle' },
  { name: 'missing first node', parents: [], parent: 'a', forbidden: [], expected: 'incomplete' },
  { name: 'broken ancestor chain', parents: [['a', 'missing']], parent: 'a', forbidden: [], expected: 'incomplete' },
  { name: 'unrelated corrupt subtree', parents: [['a', null], ['x', 'x']], parent: 'a', forbidden: [], expected: null },
] satisfies { name: string; parents: [string, string | null][]; parent: string; forbidden: string[]; expected: string | null }[])('$name', ({ parents, parent, forbidden, expected }) => {
  const map = new Map(parents); const blocked = new Set(forbidden);
  expect(checkAncestorChain(map, parent, blocked)).toBe(expected);
  expect([...map]).toEqual(parents); expect([...blocked]).toEqual(forbidden);
});
