/** Période « liste » telle que renvoyée par GET /stories/:id (parentId optionnel). */
export type StoryPeriodInput = {
  id: string;
  label?: { fr?: string; en?: string } | string;
  startDate?: string;
  endDate?: string;
  start_date?: string;
  end_date?: string;
  parentId?: string | null;
  parent_id?: string | null;
};

export interface PeriodTreeNode {
  id: string;
  period: StoryPeriodInput;
  datesLabel: string;
  children: PeriodTreeNode[];
}
