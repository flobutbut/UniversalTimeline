import { expect, it } from 'vitest';
import { catalogueColumnWidths } from '../catalogueColumnWidths';
const columns = [{ key: 'name', label: 'Nom', width: 300, minWidth: 100, maxWidth: 500 }, { key: 'date', label: 'Date', width: 160, minWidth: 100, maxWidth: 250 }];
it('fills the available width, shrinks to column minima and preserves manual sizes', () => {
  expect(Object.values(catalogueColumnWidths(columns, 400)).reduce((a, b) => a + b, 0)).toBe(400);
  expect(catalogueColumnWidths(columns, 100)).toEqual({ name: 100, date: 100 });
  expect(catalogueColumnWidths(columns, 500, { name: 350 })).toEqual({ name: 350, date: 150 });
  expect(catalogueColumnWidths(columns, 1000)).toEqual({ name: 500, date: 250 });
});
