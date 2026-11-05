import type { CatalogueColumn } from '@/components/catalogue/columns';

/** Fit automatic columns to the viewport, preserving manual widths and each column's bounds. */
export function catalogueColumnWidths(columns: CatalogueColumn[], available: number, manual: Record<string, number> = {}) {
  const min = (column: CatalogueColumn) => column.minWidth ?? (column.key === 'actions' ? 88 : 100);
  const max = (column: CatalogueColumn) => column.maxWidth ?? 720;
  const sizes = columns.map(column => Math.min(max(column), Math.max(min(column), manual[column.key] ?? column.width ?? 160)));
  if (available > 0) {
    for (let pass = 0; pass <= columns.length; pass++) {
      const difference = available - sizes.reduce((sum, size) => sum + size, 0);
      if (Math.abs(difference) < 1) break;
      const flexible = columns.map((column, index) => ({ column, index })).filter(({column, index}) =>
        manual[column.key] === undefined && column.key !== 'actions' && (difference < 0 ? sizes[index] > min(column) : sizes[index] < max(column)));
      if (!flexible.length) break;
      for (const { column, index } of flexible) sizes[index] = Math.min(max(column), Math.max(min(column), sizes[index] + difference / flexible.length));
    }
  }
  return Object.fromEntries(columns.map((column, index) => [column.key, sizes[index]]));
}
