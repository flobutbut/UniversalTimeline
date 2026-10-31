import { query } from '../api/database.js';
import { searchPeriods, searchEvents, searchStories } from '../repositories/searchRepository.js';
import { localized, numeric } from './mappers.js';
export type SearchScope = '' | 'period' | 'periods' | 'event' | 'events';
export async function searchStoryTimelines(q: string) {
  const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
  return (await searchStories({ query }, pattern)).map(row => ({
    id: String(row.id), label: localized(row.title_fr, row.title_en),
    description: localized(row.description_fr ?? '', row.description_en), matchedOn: row.matched_on,
    match: row.matched_type ? { type: row.matched_type, label: localized(row.matched_label_fr ?? '', row.matched_label_en) } : null,
  }));
}
export async function search(q: string, categoryId: string, only: SearchScope, qids?: string[]) {
  const periodsOnly = only === 'period' || only === 'periods';
  const eventsOnly = only === 'event' || only === 'events';
  const [periods, events] = await Promise.all([
    eventsOnly ? [] : searchPeriods({ query }, q, categoryId, periodsOnly ? 300 : 120, qids),
    periodsOnly ? [] : searchEvents({ query }, q, categoryId, eventsOnly ? 300 : 20, qids),
  ]);
  return {
    periods: periods.map(row => ({
      id: row.id, wikidataId: row.wikidata_id, label: localized(row.label_fr, row.label_en),
      startDate: row.start_date, endDate: row.end_date, parentId: row.parent_id,
      startYearsBP: numeric(row.start_years_bp), endYearsBP: numeric(row.end_years_bp), hasChildren: row.has_children,
    })),
    events: events.map(row => ({
      id: row.id, wikidataId: row.wikidata_id, label: localized(row.label_fr, row.label_en),
      description: row.description_fr, date: row.date, dateYearsBP: numeric(row.date_years_bp),
    })),
  };
}
