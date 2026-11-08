import type { PeriodFilter } from '@/components/filters/filterTypes';
import type { StoryTimeRange } from '@/lib/storyTimeFilter';
import { matchesTags, type Tagged } from './tags';

/** État simple, sans référence au DOM : il pourra être sérialisé dans l'URL le moment venu. */
export interface CatalogueFilterState {
  tagIds: string[];
  storyIds: string[];
  timeRange: StoryTimeRange | null;
  period: PeriodFilter | null;
}

export interface CatalogueFilterAccess<T> {
  storyIdsOf: (item: T) => readonly string[];
  overlaps: (item: T, range: StoryTimeRange) => boolean;
}

/** ET entre les dimensions, OU à l'intérieur de chacune. */
export function matchesCatalogueFilters<T extends Tagged>(item: T, state: CatalogueFilterState, access: CatalogueFilterAccess<T>): boolean {
  if (!matchesTags(item, state.tagIds)) return false;
  if (state.storyIds.length && !state.storyIds.some(id => access.storyIdsOf(item).includes(id))) return false;
  return [state.timeRange, state.period?.range].every(range => !range || access.overlaps(item, range));
}
