import type { CategoryJoinRow, CategoryRow, PeriodRecord, PeriodListRow, EventRow, Numeric } from '../repositories/rows.js';

export const localized = (fr: string, en: string | null) => ({ fr, en: en || fr });
export const description = (fr: string | null, en: string | null) => fr ? localized(fr, en) : undefined;
export const numeric = (value: Numeric) => value != null ? Number(value) : null;
const provenance = (row: import('../repositories/rows.js').SourceMetadata) => ({ ...(row.source_key ? { sourceKey: row.source_key } : {}), ...(row.wikidata_source ? { wikidataSource: row.wikidata_source } : {}) });
/** Article titles when the query selected them; NULL means no article in that language. */
export const wikipedia = (row: import('../repositories/rows.js').WikipediaColumns) =>
  row.wikipedia_title_fr === undefined && row.wikipedia_title_en === undefined ? {}
    : { wikipedia: { fr: row.wikipedia_title_fr ?? null, en: row.wikipedia_title_en ?? null } };
export function mapCategory(row: CategoryRow) {
  return { id: row.id, label: localized(row.label_fr, row.label_en), description: description(row.description_fr, row.description_en) };
}
/** Join rows are folded once; presentation-specific fields stay in the mapper supplied by the caller. */
export function groupCategories<Row extends CategoryJoinRow & { id: string | number }, Entity extends object>(rows: Row[], map: (row: Row) => Entity) {
  type Category = { id: string; label: { fr: string | null; en: string | null } };
  const groups = new Map<string | number, Entity & { categories: Category[] }>();
  for (const row of rows) {
    let entity = groups.get(row.id);
    if (!entity) { entity = { ...map(row), categories: [] }; groups.set(row.id, entity); }
    if (row.category_id) entity.categories.push({
      id: row.category_id, label: { fr: row.category_label_fr, en: row.category_label_en || row.category_label_fr },
    });
  }
  return [...groups.values()];
}
export function mapPeriodList(row: PeriodListRow) {
  return {
    ...provenance(row), ...wikipedia(row), id: row.id, wikidata_id: row.wikidata_id, label_fr: row.label_fr, label_en: row.label_en,
    description_fr: row.description_fr, description_en: row.description_en,
    start_date: row.start_date, end_date: row.end_date, parent_id: row.parent_id,
    start_years_bp: row.start_years_bp, end_years_bp: row.end_years_bp, has_children: row.has_children,
  };
}
export function mapPeriodDetail(row: PeriodRecord) {
  return {
    ...provenance(row), ...wikipedia(row), id: row.id, wikidata_id: row.wikidata_id, label: localized(row.label_fr, row.label_en),
    description: description(row.description_fr, row.description_en),
    startDate: row.start_date, endDate: row.end_date, parentId: row.parent_id,
    ...(row.story_parent_id !== undefined ? { storyParentId: row.story_parent_id } : {}),
    startYearsBP: numeric(row.start_years_bp), endYearsBP: numeric(row.end_years_bp),
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
export function mapEventDetail(row: EventRow) {
  return {
    ...provenance(row), ...wikipedia(row), id: row.id, label: localized(row.label_fr, row.label_en),
    description: description(row.description_fr, row.description_en), date: row.date,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
