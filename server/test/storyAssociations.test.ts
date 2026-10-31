// @vitest-environment node
import { it, expect } from 'vitest';
import { parseAssociationIds } from '../src/api/inputValidation';

it.each([undefined,null,[],[null],[''],['  '],[1],Array.from({length:501},()=> 'a')])('refuses malformed or excessive association selections (%j)', value => {
  expect(() => parseAssociationIds(value)).toThrow('1 à 500');
});
it('normalizes and deduplicates a selection', () => {
  expect(parseAssociationIds([' b ','a','b'])).toEqual(['a','b']);
});
