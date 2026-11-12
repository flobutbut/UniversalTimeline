/** Public discovery uses bounded pages; the workspace's full-list contract stays separate. */
export const CATALOGUE_PAGE_SIZE = 24;
export const CATALOGUE_MAX_PAGE_SIZE = 48;
export interface CatalogueRange { oldBP: number; recentBP: number }
export interface StoryCatalogueQuery {
  search: string;
  tagIds: string[];
  timeRange?: CatalogueRange | null;
  periodRange?: CatalogueRange | null;
}
export interface StoryCatalogueInput extends StoryCatalogueQuery {
  cursor: string | null;
  limit: number;
}
