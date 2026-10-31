import type { Category } from '@/types/database';

/** Période « liste » telle que renvoyée par GET /stories/:id (parentId optionnel). */
export type StoryPeriodInput = {
  id: string;
  label?: { fr?: string; en?: string } | string;
  startDate?: string;
  endDate?: string;
  categories?: Category[];
  start_date?: string;
  end_date?: string;
  startYearsBP?: number | null;
  endYearsBP?: number | null;
  start_years_bp?: number | null;
  end_years_bp?: number | null;
  storyParentId?: string | null;
  story_parent_id?: string | null;
  parentId?: string | null;
  parent_id?: string | null;
};
